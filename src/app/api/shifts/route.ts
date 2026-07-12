/**
 * src/app/api/shifts/route.ts
 * POST — create a one-off shift for a staff member.
 *
 * BUG HISTORY (2026-07-15): this only checked getSession() (any logged-in
 * user), while the UI gates the "Add Shift" button behind isAdmin
 * (OWNER/MANAGER) client-side. A plain STAFF-level user could bypass that
 * UI restriction entirely by calling this endpoint directly (dev tools,
 * curl, etc.) and create shifts for any staffId — there's no legitimate
 * self-service reason for a regular staff member to schedule shifts, for
 * themselves or anyone else. Fixed with a real server-side requireAdmin()
 * check, matching what the UI already implies but never enforced.
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAdmin } from "@/lib/auth/session"

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  const body = await request.json()
  const shift = await prisma.shift.create({
    data: {
      staffId: body.staffId, date: new Date(body.date),
      startTime: body.startTime, endTime: body.endTime,
      type: body.type, role: body.role || null, createdBy: session.name,
    },
  })
  return NextResponse.json({ data: shift }, { status: 201 })
}
