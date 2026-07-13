/**
 * src/app/api/onboarding/pending/route.ts
 * GET — list all staff awaiting approval (approvalStatus: PENDING).
 * Admin/manager only. Used by the "Pending Approvals" panel in Team Tools.
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAdmin } from "@/lib/auth/session"

export async function GET() {
  await requireAdmin()

  const pending = await prisma.staff.findMany({
    where: { approvalStatus: "PENDING", onboardingCompleted: true },
    select: {
      id: true, teamId: true, name: true, email: true, phone: true, role: true,
      createdAt: true,
      position: { select: { name: true } },
      onboardingRecord: {
        select: { legalName: true, startDate: true, tshirtSize: true, completedAt: true, idDocumentUrl: true, signatureText: true, signedAt: true },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ data: pending })
}
