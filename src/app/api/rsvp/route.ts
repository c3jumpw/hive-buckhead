/* eslint-disable @typescript-eslint/no-explicit-any */
// /api/rsvp — public endpoint for guest-facing lookup and change requests
// No staff auth required — guests use their RSVP code as the key

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"

// GET /api/rsvp?code=XXXXXXXX — look up reservation by RSVP code
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.toUpperCase()
  if (!code) return NextResponse.json({ error: "RSVP code required" }, { status: 400 })

  const reservation = await prisma.reservation.findUnique({
    where: { rsvpCode: code },
    select: {
      id: true, rsvpCode: true, firstName: true, lastName: true,
      phone: true, email: true, date: true, arrivalTime: true,
      partySize: true, section: true, occasion: true, notes: true,
      status: true, changeRequest: true,
    },
  })

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found. Please check your RSVP code." }, { status: 404 })
  }

  return NextResponse.json({ data: reservation })
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
    select: { id: true, status: true, firstName: true, lastName: true },
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

  return NextResponse.json({ data: updated })
}
