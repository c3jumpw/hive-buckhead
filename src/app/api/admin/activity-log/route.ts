/**
 * src/app/api/admin/activity-log/route.ts
 * =============================================================================
 * GET — the master admin edit log: every system-level action recorded via
 * logAdminAction() (see src/lib/db/activity-logger.ts) — staff invited/
 * edited/offboarded, onboarding approved/rejected, integration settings
 * changed, reservations reset. reservationId is always null for these;
 * reservation-scoped activity has its own per-reservation view already
 * (the Activity tab on a reservation's detail panel).
 *
 * OWNER/MANAGER only, same as everything else under Settings. Supports
 * `?format=csv` for the export button — same data, just serialized
 * differently, so the UI list and the export can never drift apart.
 * =============================================================================
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session || session.accessLevel === "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format")
  const limit = format === "csv" ? 1000 : Math.min(Number(searchParams.get("limit")) || 50, 200)

  const entries = await prisma.activityLog.findMany({
    where: { reservationId: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { staff: { select: { name: true } } },
  })

  if (format === "csv") {
    const rows = [
      ["Date", "Time", "Type", "Performed By", "Description"],
      ...entries.map((e: any) => {
        const d = new Date(e.createdAt)
        return [
          d.toLocaleDateString("en-US"), d.toLocaleTimeString("en-US"),
          e.type, e.staff?.name ?? "System", e.description,
        ]
      }),
    ]
    const csv = rows.map(r => r.map((c: unknown) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="hive-admin-activity-log-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  }

  return NextResponse.json({
    data: entries.map((e: any) => ({
      id: e.id, type: e.type, description: e.description,
      performedBy: e.staff?.name ?? "System", createdAt: e.createdAt,
    })),
  })
}
