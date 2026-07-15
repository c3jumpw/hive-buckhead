/**
 * src/app/api/onboarding/reject/route.ts
 * POST — reject a pending onboarding submission.
 * Staff record stays in the database (audit trail, e.g. for background
 * check failures or hiring decisions that change) but permanently remains
 * active:false / approvalStatus:REJECTED — never becomes visible.
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAdmin } from "@/lib/auth/session"
import { logAdminAction } from "@/lib/db/activity-logger"

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  const { staffId, reason } = await request.json()
  if (!staffId) return NextResponse.json({ error: "staffId required" }, { status: 400 })

  const staff = await prisma.staff.findUnique({ where: { id: staffId } })
  if (!staff) return NextResponse.json({ error: "Staff member not found" }, { status: 404 })
  if (staff.approvalStatus !== "PENDING") {
    return NextResponse.json({ error: "This submission has already been reviewed" }, { status: 409 })
  }

  const updated = await prisma.staff.update({
    where: { id: staffId },
    data: {
      approvalStatus: "REJECTED", approvedAt: new Date(), approvedBy: session.name,
      notes: reason ? `Onboarding rejected: ${reason}` : "Onboarding rejected",
    },
  })

  // Master admin edit log — 2026-07-16 addition.
  logAdminAction({
    staffId: session.id,
    type: "onboarding_rejected",
    description: `${session.name} rejected ${updated.name}'s onboarding${reason ? `: ${reason}` : ""}`,
    metadata: { targetStaffId: staffId, reason: reason || null },
  })

  return NextResponse.json({ data: updated })
}
