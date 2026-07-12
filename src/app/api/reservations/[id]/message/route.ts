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
 * =============================================================================
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"
import sgMail from "@sendgrid/mail"
import { SENDGRID_CONFIG } from "@/lib/config"
import { sendCustomSms } from "@/lib/integrations/quo"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { channel, body } = await request.json()
  if (!channel || !body) return NextResponse.json({ error: "channel and body required" }, { status: 400 })

  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
    select: { email: true, phone: true, firstName: true, lastName: true, rsvpCode: true },
  })
  if (!reservation) return NextResponse.json({ error: "Reservation not found" }, { status: 404 })

  try {
    if (channel === "email") {
      if (!reservation.email) return NextResponse.json({ error: "This guest has no email on file" }, { status: 400 })
      if (!SENDGRID_CONFIG.apiKey) return NextResponse.json({ error: "SendGrid not configured" }, { status: 503 })
      sgMail.setApiKey(SENDGRID_CONFIG.apiKey)
      await sgMail.send({
        to: reservation.email,
        from: { email: SENDGRID_CONFIG.fromEmail, name: SENDGRID_CONFIG.fromName },
        subject: `A message from Hive Buckhead — RSVP ${reservation.rsvpCode}`,
        text: body,
        html: `<div style="font-family:Georgia,serif;white-space:pre-line;">${body}</div>`,
      })
    } else if (channel === "sms") {
      if (!reservation.phone) return NextResponse.json({ error: "This guest has no phone on file" }, { status: 400 })
      const result = await sendCustomSms(reservation.phone, body)
      if (!result.success) {
        return NextResponse.json({ error: result.error ?? "Quo send failed" }, { status: 502 })
      }
    } else {
      return NextResponse.json({ error: "channel must be 'email' or 'sms'" }, { status: 400 })
    }

    await prisma.messageLog.create({
      data: {
        channel: channel === "email" ? "EMAIL" : "SMS",
        recipient: channel === "email" ? (reservation.email ?? "") : (reservation.phone ?? ""),
        subject: "Manual message", body, status: "SENT", sentAt: new Date(),
        reservationId: params.id, staffId: session.id,
      },
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    console.error("[Reservation message]", e)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
