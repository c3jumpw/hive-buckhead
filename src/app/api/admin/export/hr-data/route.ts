/**
 * src/app/api/admin/export/hr-data/route.ts
 * =============================================================================
 * GET — combined CSV covering the three categories named explicitly in
 * the original request ("staff profile changes, onboards, callouts"):
 * onboarding records, offboarding records, and callouts. Staff profile
 * *changes* are covered separately by the Admin Activity Log export
 * (/api/admin/activity-log?format=csv) — this route is the underlying
 * records themselves, not the edit history of them.
 *
 * One file with three sections (same multi-section pattern as the
 * Analytics export) rather than three separate downloads — these are
 * usually reviewed together during an HR audit, not independently.
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

  const [onboarding, offboarding, callouts] = await Promise.all([
    prisma.onboardingRecord.findMany({
      orderBy: { createdAt: "desc" },
      include: { staff: { select: { name: true, email: true, teamId: true, approvalStatus: true } } },
    }),
    prisma.offboardingRecord.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.callout.findMany({
      orderBy: { date: "desc" },
      include: { staff: { select: { name: true } }, coveredBy: { select: { name: true } } },
    }),
  ])

  const esc = (c: unknown) => `"${String(c ?? "").replace(/"/g, '""')}"`
  const section = (title: string, header: string[], rows: unknown[][]) => [
    [title], header, ...rows, [],
  ]

  const rows = [
    ...section("ONBOARDING RECORDS", ["Team ID", "Name", "Email", "Status", "Start Date", "Signed At", "Completed At"],
      onboarding.map((o: any) => [
        o.staff?.teamId ?? "", o.staff?.name ?? "", o.staff?.email ?? "", o.staff?.approvalStatus ?? "",
        o.startDate?.toISOString().split("T")[0] ?? "", o.signedAt?.toISOString().split("T")[0] ?? "",
        o.completedAt?.toISOString().split("T")[0] ?? "",
      ])),
    ...section("OFFBOARDING RECORDS", ["Name", "Email", "Termination Date", "Type", "Reason", "Processed By", "Access Revoked", "Equipment Returned", "Final Pay", "Exit Interview"],
      offboarding.map((o: any) => [
        o.staffName, o.staffEmail, o.terminationDate.toISOString().split("T")[0], o.terminationType, o.reason ?? "",
        o.processedBy, o.accessRevoked ? "Yes" : "No", o.equipmentReturned ? "Yes" : "No",
        o.finalPayProcessed ? "Yes" : "No", o.exitInterviewDone ? "Yes" : "No",
      ])),
    ...section("CALLOUTS", ["Date", "Staff", "Reason", "Covered By", "Notes", "Logged By"],
      callouts.map((c: any) => [
        c.date.toISOString().split("T")[0], c.staff?.name ?? "", c.reason, c.coveredBy?.name ?? "—", c.notes ?? "", c.loggedBy ?? "",
      ])),
  ]

  const csv = rows.map(r => r.map(esc).join(",")).join("\n")
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="hive-hr-data-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  })
}
