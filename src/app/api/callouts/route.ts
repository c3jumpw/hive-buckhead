/**
 * src/app/api/callouts/route.ts
 * POST — log a callout (staff member unable to work a scheduled shift).
 *
 * Unlike shifts, self-reporting a callout ("I'm calling out sick today")
 * is a legitimate action for any staff member, not just admins — that's
 * a normal real-world workflow. What's NOT legitimate is a STAFF-level
 * user logging a callout on someone ELSE's behalf via a raw API call,
 * bypassing whatever the UI intended.
 *
 * BUG HISTORY (2026-07-15): previously accepted any staffId in the request
 * body with no check that it matched the caller — a STAFF-level user could
 * log a callout for a coworker. Fixed: OWNER/MANAGER may log a callout for
 * anyone (needed when a staff member calls the restaurant directly rather
 * than self-reporting); STAFF-level callers are restricted to staffId
 * matching their own session.
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const isAdmin = session.accessLevel === "OWNER" || session.accessLevel === "MANAGER"

  if (!isAdmin && body.staffId !== session.id) {
    return NextResponse.json({ error: "You can only log a callout for yourself" }, { status: 403 })
  }

  const callout = await prisma.callout.create({
    data: {
      staffId: body.staffId, date: new Date(body.date),
      reason: body.reason, coveredById: body.coveredById || null,
      notes: body.notes || null, loggedBy: session.name,
    },
  })
  return NextResponse.json({ data: callout }, { status: 201 })
}
