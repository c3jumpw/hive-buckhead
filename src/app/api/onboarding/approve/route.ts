/**
 * src/app/api/onboarding/approve/route.ts
 * =============================================================================
 * POST — approve a pending onboarding submission.
 *
 * Effects:
 *   1. Staff.active -> true, approvalStatus -> APPROVED (this is what makes
 *      them appear in login, staff lists, dashboards — everywhere that
 *      already filters `active: true`)
 *   2. Logs the now-approved staff member to the "Staff Records" Google
 *      Sheet — this is the correct point for that write, since the sheet
 *      is meant to reflect the active roster / backup layer, not pending
 *      submissions (moved here from onboarding/submit — see that file's
 *      bug history comment for why).
 *   3. Sends the new hire the approval email: employee ID + staff portal
 *      link. Does NOT include their PIN — see sendOnboardingApproved's own
 *      doc comment for the security reasoning.
 * =============================================================================
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAdmin } from "@/lib/auth/session"
import { logStaffToSheet } from "@/lib/integrations/google-sheets"
import { sendOnboardingApproved } from "@/lib/integrations/sendgrid"
import { logEmailAttempt, logAdminAction } from "@/lib/db/activity-logger"
import { APP_CONFIG } from "@/lib/config"

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  const { staffId } = await request.json()
  if (!staffId) return NextResponse.json({ error: "staffId required" }, { status: 400 })

  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: { onboardingRecord: { select: { startDate: true } } },
  })
  if (!staff) return NextResponse.json({ error: "Staff member not found" }, { status: 404 })
  if (staff.approvalStatus !== "PENDING") {
    return NextResponse.json({ error: "This submission has already been reviewed" }, { status: 409 })
  }

  const updated = await prisma.staff.update({
    where: { id: staffId },
    data: { active: true, approvalStatus: "APPROVED", approvedAt: new Date(), approvedBy: session.name },
  })

  // Now that the staff member is genuinely part of the active roster, write
  // them to the backup/sync sheet. Non-blocking — a Sheets outage should
  // never prevent an approval from completing.
  logStaffToSheet({
    teamId: updated.teamId ?? "", name: updated.name, email: updated.email,
    phone: updated.phone ?? undefined, role: updated.role,
    startDate: staff.onboardingRecord?.startDate?.toISOString().split("T")[0],
    createdAt: updated.createdAt.toISOString(),
  }).catch(console.error)

  // BUG HISTORY (2026-07-15): .catch(console.error) on a function that
  // never throws — real failures were invisible outside server logs.
  logEmailAttempt(
    sendOnboardingApproved(updated.email, {
      name: updated.name, teamId: updated.teamId ?? "N/A", portalUrl: APP_CONFIG.staffPortalUrl,
    }),
    { channel: "EMAIL", recipient: updated.email, subject: "Onboarding Approved" }
  ).catch(() => {})

  // Master admin edit log — 2026-07-16 addition.
  logAdminAction({
    staffId: session.id,
    type: "onboarding_approved",
    description: `${session.name} approved ${updated.name}'s onboarding (${updated.teamId ?? "no team ID"})`,
    metadata: { targetStaffId: staffId },
  })

  return NextResponse.json({ data: updated })
}
