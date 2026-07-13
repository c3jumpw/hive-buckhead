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
 *
 * Also notifies admins by email (2026-07-15 addition) — a callout affects
 * same-day staffing and shouldn't wait for someone to check the schedule
 * page to be noticed.
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"
import { sendAdminNotification } from "@/lib/integrations/sendgrid"
import { getAdminEmails } from "@/lib/db/activity-logger"

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const isAdmin = session.accessLevel === "OWNER" || session.accessLevel === "MANAGER"

  if (!isAdmin && body.staffId !== session.id) {
    return NextResponse.json({ error: "You can only log a callout for yourself" }, { status: 403 })
  }

  const staffMember = await prisma.staff.findUnique({ where: { id: body.staffId }, select: { name: true } })

  const callout = await prisma.callout.create({
    data: {
      staffId: body.staffId, date: new Date(body.date),
      reason: body.reason, coveredById: body.coveredById || null,
      notes: body.notes || null, loggedBy: session.name,
    },
  })

  // Non-blocking — logging a callout must never fail because the
  // notification email had a problem. Same-day staffing gaps are time
  // sensitive, so this fires immediately rather than waiting for anyone
  // to check the schedule page.
  getAdminEmails().then(emails => {
    if (emails.length > 0) {
      sendAdminNotification(
        emails,
        `Callout logged: ${staffMember?.name ?? "Unknown"}`,
        `${staffMember?.name ?? "A staff member"} called out for ${new Date(body.date).toLocaleDateString()} — reason: ${body.reason}.${body.notes ? `\n\nNotes: ${body.notes}` : ""}\n\nLogged by: ${session.name}`
      ).catch((err: unknown) => console.error("[Callout] admin notification failed:", err))
    }
  }).catch((err: unknown) => console.error("[Callout] failed to fetch admin emails:", err))

  return NextResponse.json({ data: callout }, { status: 201 })
}
