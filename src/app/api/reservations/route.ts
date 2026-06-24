// src/app/api/reservations/route.ts
// GET  /api/reservations — list with filters
// POST /api/reservations — create new reservation

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createServerSupabaseClient } from "@/lib/auth/supabase-server";
import { getSession } from "@/lib/auth/session";
import { createReservationSchema } from "@/lib/validations/reservation";
import { generateRsvpCode } from "@/lib/utils";

// ── GET /api/reservations ──────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const date = searchParams.get("date");         // "2024-03-15" or omit for all
  const status = searchParams.get("status");      // ReservationStatus or omit
  const search = searchParams.get("q");           // name/phone/rsvpCode
  const serverId = searchParams.get("serverId");  // filter by server

  try {
    const reservations = await prisma.reservation.findMany({
      where: {
        ...(date && {
          date: {
            gte: new Date(date),
            lt: new Date(new Date(date).getTime() + 86400000),
          },
        }),
        ...(status && { status: status as never }),
        ...(serverId && { serverId }),
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
            { rsvpCode: { contains: search.toUpperCase() } },
          ],
        }),
      },
      include: {
        server: { select: { id: true, name: true, color: true } },
        tables: {
          include: {
            table: {
              select: { id: true, displayId: true, capacity: true, section: true },
            },
          },
        },
        activity: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: [{ date: "asc" }, { arrivalTime: "asc" }],
    });

    return NextResponse.json({ data: reservations });
  } catch (error) {
    console.error("[GET /api/reservations]", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}

// ── POST /api/reservations ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createReservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Generate a unique RSVP code
    let rsvpCode = generateRsvpCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.reservation.findUnique({ where: { rsvpCode } });
      if (!existing) break;
      rsvpCode = generateRsvpCode();
      attempts++;
    }

    const reservation = await prisma.reservation.create({
      data: {
        rsvpCode,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email || null,
        date: new Date(data.date),
        arrivalTime: data.arrivalTime,
        partySize: data.partySize,
        section: data.section || null,
        occasion: data.occasion || null,
        notes: data.notes || null,
        source: body.source || "staff",
        status: "REQUESTED",
        activity: {
          create: {
            type: "created",
            description: `Reservation created by ${session.name}`,
            staffId: session.id,
          },
        },
      },
      include: {
        server: { select: { id: true, name: true, color: true } },
        tables: { include: { table: true } },
        activity: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    return NextResponse.json({ data: reservation }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/reservations]", error);
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 }
    );
  }
}
