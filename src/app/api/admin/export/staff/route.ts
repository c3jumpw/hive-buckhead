/**
 * src/app/api/admin/export/staff/route.ts
 * =============================================================================
 * GET — full staff roster as CSV. Broader than the Staff List tab's
 * on-screen columns (name/role/access/email only) — this includes phone,
 * team ID, employment status, and dates, since an export is for
 * record-keeping, not screen space.
 *
 * Includes everyone (active, invited, pending, rejected, terminated) with
 * a Status column, rather than silently filtering — an HR export that
 * quietly drops terminated staff is more likely to cause a "wait, where
 * did they go" moment than a useful one.
 * =============================================================================
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"

export async function GET() {
  const session = await getSession()
  if (!session || session.accessLevel === "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const staff = await prisma.staff.findMany({
    orderBy: [{ approvalStatus: "asc" }, { name: "asc" }],
    select: {
      teamId: true, name: true, email: true, phone: true, role: true, accessLevel: true,
      employmentStatus: true, approvalStatus: true, active: true,
      createdAt: true, onboardingCompletedAt: true, approvedAt: true, terminatedAt: true,
    },
  })

  const rows = [
    ["Team ID", "Name", "Email", "Phone", "Role", "Access Level", "Status", "Employment Status", "Created", "Onboarding Completed", "Approved", "Terminated"],
    ...staff.map((s: any) => [
      s.teamId ?? "", s.name, s.email, s.phone ?? "", s.role, s.accessLevel,
      s.approvalStatus, s.employmentStatus,
      s.createdAt?.toISOString().split("T")[0] ?? "",
      s.onboardingCompletedAt?.toISOString().split("T")[0] ?? "",
      s.approvedAt?.toISOString().split("T")[0] ?? "",
      s.terminatedAt?.toISOString().split("T")[0] ?? "",
    ]),
  ]
  const csv = rows.map(r => r.map((c: string) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="hive-staff-roster-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  })
}
