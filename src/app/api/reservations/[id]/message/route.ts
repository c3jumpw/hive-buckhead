/**
 * src/app/api/reservations/[id]/message/route.ts
 * =============================================================================
 * POST — send a manual, staff-composed message (SMS or email) to a guest
 * about a specific reservation. Used by the quick-template buttons in
 * reservation-detail-panel.tsx (now backed by real MessageTemplate records).
 *
 * BUG HISTORY (2026-07-15): the client already had a fully-built compose UI
 * for this — channel tabs, message templates, a send button — but it called
 * nothing on the backend. Clicking a template just showed a fake "Message
 * queued" toast; nothing was ever actually sent. This route makes that
 * real, using the same SendGrid/Quo modules already wired into the
 * automatic confirm/cancel notifications — one source of truth for how
 * messages actually go out.
 *
 * REVISION (2026-07-15, same day): initial version of this route inlined a
 * raw Twilio API call directly here, duplicating logic that also lived in
 * a separate twilio.ts module. User clarified texts go through Quo, not
 * Twilio. Replaced with a call to sendCustomSms() from
 * src/lib/integrations/quo.ts — no inline SMS logic here anymore.
 *
 * REVISION (2026-07-16): the email branch still inlined a raw sgMail call
 * with its own try/catch that discarded whatever SendGrid actually said
 * and returned a flat "Failed to send message" — and neither branch ever
 * wrote a MessageLog row on failure, only on success, so a failed send was
 * invisible everywhere except Vercel's function logs. Both channels now go
 * through logEmailAttempt (the same wrapper the automatic confirm/cancel/
 * onboarding emails use), which always writes a MessageLog row — success
 * or failure — with the real provider error in `body`, visible in the
 * Recent Sends panel. The real error is also returned to the client, so
 * the toast shows what actually went wrong instead of a generic message.
 * =============================================================================
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"
import { sendCustomEmail } from "@/lib/integrations/sendgrid"
import { sendCustomSms } from "@/lib/integrations/quo"
import { logEmailAttempt } from "@/lib/db/activity-logger"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { channel, body } = await request.json()
  if (!channel || !body) return NextResponse.json({ error: "channel and body required" }, { status: 400 })
  if (channel !== "email" && channel !== "sms") {
    return NextResponse.json({ error: "channel must be 'email' or 'sms'" }, { status: 400 })
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
    select: { email: true, phone: true, firstName: true, lastName: true, rsvpCode: true },
  })
  if (!reservation) return NextResponse.json({ error: "Reservation not found" }, { status: 404 })

  if (channel === "email" && !reservation.email) {
    return NextResponse.json({ error: "This guest has no email on file" }, { status: 400 })
  }
  if (channel === "sms" && !reservation.phone) {
    return NextResponse.json({ error: "This guest has no phone on file" }, { status: 400 })
  }

  const subject = `A message from Hive Buckhead — RSVP ${reservation.rsvpCode}`
  const recipient = channel === "email" ? reservation.email! : reservation.phone!

  // Run the actual send once, reuse the result both for the MessageLog
  // entry (via logEmailAttempt) and for the HTTP response — so the log and
  // what the client sees can never disagree with each other.
  const result = channel === "email"
    ? await sendCustomEmail(recipient, { subject, body })
    : await sendCustomSms(recipient, body)

  await logEmailAttempt(Promise.resolve(result), {
    channel: channel === "email" ? "EMAIL" : "SMS",
    recipient, subject, body,
    reservationId: params.id,
    staffId: session.id,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error || "Failed to send message" }, { status: 502 })
  }
  return NextResponse.json({ success: true })
}
