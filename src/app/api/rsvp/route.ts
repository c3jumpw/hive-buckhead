/* eslint-disable @typescript-eslint/no-explicit-any */
// /api/rsvp — public endpoint for guest-facing lookup and change requests
// No staff auth required — guests use their RSVP code as the key

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { sendChangeRequestReceived, sendAdminNotification } from "@/lib/integrations/sendgrid"
import { logEmailAttempt, getAdminEmails } from "@/lib/db/activity-logger"

// Fields returned to the guest-facing manage/cancel page. Kept as a shared
// constant so both lookup paths (by code, and by phone+lastName) return an
// identical shape — the frontend's FoundReservation type expects this exact set.
const GUEST_RESERVATION_FIELDS = {
  id: true, rsvpCode: true, firstName: true, lastName: true,
  phone: true, email: true, date: true, arrivalTime: true,
  partySize: true, section: true, occasion: true, notes: true,
  status: true, changeRequest: true,
} as const

/**
 * GET /api/rsvp — guest reservation lookup, two supported modes:
 *   ?code=XXXXXXXX                    — exact match on RSVP code (primary path)
 *   ?phone=4045551234&lastName=Smith  — fallback for guests without their code
 *
 * BUG HISTORY (2026-07-14): the manage/cancel page's UI has always offered
 * "look up by phone + last name" as an alternative to entering an RSVP code
 * (see manage-rsvp-client.tsx handleLookup, which builds a
 * ?phone=...&lastName=... query when no code is entered). This handler
 * previously only ever read the `code` param and returned 400 "RSVP code
 * required" for every phone/lastName request, silently breaking that entire
 * lookup path for any guest who didn't have their code handy — with no
 * indication to the guest or staff that the feature was non-functional.
 *
 * Phone+lastName can match multiple past reservations for a repeat guest,
 * so we pick the most relevant one: prefer an upcoming (not completed/
 * cancelled) reservation over a historical one, and among ties prefer the
 * most recently created. This mirrors what a guest actually wants when they
 * say "find my reservation" — their current booking, not old history.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const code = params.get("code")?.toUpperCase()
  const phone = params.get("phone")?.replace(/\D/g, "")
  const lastName = params.get("lastName")?.trim()

  if (code) {
    const reservation = await prisma.reservation.findUnique({
      where: { rsvpCode: code },
      select: GUEST_RESERVATION_FIELDS,
    })
    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found. Please check your RSVP code." }, { status: 404 })
    }
    return NextResponse.json({ data: reservation })
  }

  if (phone && lastName) {
    // Find all reservations matching phone + last name (case-insensitive),
    // most recently created first, so we can prefer an active one below.
    const matches = await prisma.reservation.findMany({
      where: { phone, lastName: { equals: lastName, mode: "insensitive" } },
      select: GUEST_RESERVATION_FIELDS,
      orderBy: { createdAt: "desc" },
    })

    if (matches.length === 0) {
      return NextResponse.json({ error: "No reservation found with that phone number and last name." }, { status: 404 })
    }

    // Prefer the first match that's still active (not completed/cancelled);
    // fall back to the most recent one overall if everything is historical.
    const activeMatch = matches.find((r: (typeof matches)[number]) => !["COMPLETED", "CANCELLED"].includes(r.status))
    return NextResponse.json({ data: activeMatch ?? matches[0] })
  }

  return NextResponse.json({ error: "Provide either an RSVP code, or both phone number and last name." }, { status: 400 })
}

// POST /api/rsvp — guest submits change or cancellation request
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { rsvpCode, type, changeType, message, reason, newDate, newTime, newPartySize, newSection } = body

  if (!rsvpCode || !type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const reservation = await prisma.reservation.findUnique({
    where: { rsvpCode: rsvpCode.toUpperCase() },
    select: { id: true, status: true, firstName: true, lastName: true, email: true },
  })

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 })
  }

  if (["COMPLETED", "CANCELLED"].includes(reservation.status)) {
    return NextResponse.json(
      { error: `This reservation is already ${reservation.status.toLowerCase()} and cannot be modified.` },
      { status: 400 }
    )
  }

  const newStatus = type === "cancellation" ? "CANCELLATION_REQUESTED" : "CHANGE_REQUESTED"

  const updated = await prisma.$transaction(async (tx: any) => {
    const rsv = await tx.reservation.update({
      where: { id: reservation.id },
      data: {
        status: newStatus,
        changeRequest: {
          type, changeType: changeType ?? null, message: message ?? null,
          reason: reason ?? null,
          newDate: newDate ?? null, newTime: newTime ?? null,
          newPartySize: newPartySize ?? null, newSection: newSection ?? null,
          submittedAt: new Date().toISOString(),
        },
      },
      select: { rsvpCode: true, status: true },
    })

    await tx.activityLog.create({
      data: {
        reservationId: reservation.id,
        type: type === "cancellation" ? "cancellation_requested" : "change_requested",
        description: type === "cancellation"
          ? `Guest requested cancellation. Reason: ${reason ?? "Not specified"}.`
          : `Guest requested change (${changeType ?? "other"}): "${(message ?? "").slice(0, 80)}"`,
      },
    })

    return rsv
  })

  // 2026-07-16 addition — previously neither the guest nor any admin got
  // notified when a change/cancellation request came in; the only trace
  // was the ActivityLog entry above, invisible until someone happened to
  // look. Both fire-and-forget, same pattern as elsewhere in the app.
  if (reservation.email) {
    logEmailAttempt(
      sendChangeRequestReceived(reservation.email, { firstName: reservation.firstName, rsvpCode: updated.rsvpCode }),
      { channel: "EMAIL", recipient: reservation.email, subject: "Change Request Received", reservationId: reservation.id }
    ).catch(() => {})
  }
  getAdminEmails().then(emails => {
    if (emails.length === 0) return
    const label = type === "cancellation" ? "Cancellation" : "Change"
    sendAdminNotification(
      emails, `${label} request — ${reservation.firstName} ${reservation.lastName} (${updated.rsvpCode})`,
      type === "cancellation"
        ? `${reservation.firstName} ${reservation.lastName} requested to cancel RSVP ${updated.rsvpCode}. Reason: ${reason ?? "Not specified"}.`
        : `${reservation.firstName} ${reservation.lastName} requested a change (${changeType ?? "other"}) to RSVP ${updated.rsvpCode}: "${(message ?? "").slice(0, 200)}"`
    ).catch((err: unknown) => console.error("[RSVP] admin notification failed:", err))
  }).catch(() => {})

  return NextResponse.json({ data: updated })
}
