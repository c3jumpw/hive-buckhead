/**
 * src/app/api/admin/fix-bar-shapes/route.ts
 * =============================================================================
 * POST — one-time data fix, not an ongoing feature. The "X tables · Y bar
 * seats" split (Tables tab, Overview) already relies on svgShape:"stool"
 * to tell individual bar seats apart from real tables — that logic is
 * correct and was already fixed in an earlier round. What's actually
 * wrong is the underlying data: the 20 existing Bar-section rows predate
 * that convention and were never given svgShape:"stool", so they still
 * read as "20 tables" instead of "20 bar seats."
 *
 * Criterion: section === BAR and capacity === 1 — a single-seat bar row
 * is unambiguously a stool, not a table. Deliberately conservative (not
 * capacity <= 2) so an actual 2-top table that happens to sit in the bar
 * section doesn't get miscategorized as a stool.
 * =============================================================================
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAdmin } from "@/lib/auth/session"

export async function POST() {
  await requireAdmin()

  const result = await prisma.table.updateMany({
    where: { section: "BAR", capacity: 1, svgShape: { not: "stool" } },
    data: { svgShape: "stool" },
  })

  return NextResponse.json({ updated: result.count })
}
