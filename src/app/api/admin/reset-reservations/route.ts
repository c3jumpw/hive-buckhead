/**
 * src/app/api/admin/reset-reservations/route.ts
 * =============================================================================
 * POST — permanently deletes every reservation, for use once right before
 * launch to clear out test/seed data ("data clear/reset button for
 * reservations, to be used when the system is ready to launch with a
 * clean list").
 *
 * OWNER-only (not MANAGER) — this is irreversible and wipes real data if
 * run at the wrong time, which matches the access model already documented
 * on AccessLevel in schema.prisma ("OWNER — full system access including
 * destructive actions"). Requires the client to send confirm: "RESET" as a
 * belt-and-suspenders check against a stray/automated call, on top of
 * whatever confirmation the UI itself shows.
 *
 * ReservationTable, MessageLog, and ActivityLog rows tied to a reservation
 * cascade-delete automatically (see onDelete: Cascade on those relations
 * in schema.prisma) — no manual cleanup needed for those. Tables that were
 * SEATED/RESERVED/DIRTY because of a now-deleted reservation are reset to
 * AVAILABLE so the floor plan doesn't show phantom occupied tables.
 * =============================================================================
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.accessLevel !== "OWNER") {
    return NextResponse.json({ error: "Only an Owner can reset reservation data" }, { status: 403 })
  }

  const { confirm } = await request.json().catch(() => ({}))
  if (confirm !== "RESET") {
    return NextResponse.json({ error: "Send { confirm: \"RESET\" } to proceed — this permanently deletes all reservations" }, { status: 400 })
  }

  const [deleted] = await prisma.$transaction([
    prisma.reservation.deleteMany({}),
    prisma.table.updateMany({
      where: { state: { in: ["SEATED", "RESERVED", "DIRTY"] } },
      data: { state: "AVAILABLE" },
    }),
  ])

  await prisma.activityLog.create({
    data: {
      staffId: session.id,
      type: "reservations_reset",
      description: `${session.name} cleared all reservation data (${deleted.count} reservation${deleted.count === 1 ? "" : "s"} deleted) to prepare for launch`,
    },
  }).catch((e: unknown) => console.error("[reset-reservations] activity log write failed:", e))

  return NextResponse.json({ success: true, deletedCount: deleted.count })
}
