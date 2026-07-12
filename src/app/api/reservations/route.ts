// src/app/api/reservations/route.ts
// GET  /api/reservations — list with filters
// POST /api/reservations — create new reservation

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createServerSupabaseClient } from "@/lib/auth/supabase-server";
import { getSession } from "@/lib/auth/session";
import { createReservationSchema } from "@/lib/validations/reservation";
import { generateRsvpCode } from "@/lib/utils";
import { sendReservationReceived, sendReservationConfirmation } from "@/lib/integrations/sendgrid";
import { sendReservationReceivedSms, sendReservationConfirmationSms } from "@/lib/integrations/quo";
import { upsertSystemeContact } from "@/lib/integrations/systeme";
import { SYSTEME_CONFIG } from "@/lib/config";
import { formatDate, formatTime } from "@/lib/utils";

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
// Two callers use this endpoint:
//   1. Public guest RSVP form (source: "web_form") — NO session, guest is anonymous
//   2. Staff creating a reservation on a guest's behalf — REQUIRES session
// The distinction matters: we cannot require login for the public booking form,
// but staff-created reservations still need an authenticated staffId for the
// activity log. Auth is enforced conditionally based on the declared source.

export async function POST(request: NextRequest) {
  const body = await request.json();
  const isPublicSubmission = body.source === "web_form";

  const session = await getSession();
  if (!session && !isPublicSubmission) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = createReservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    /**
     * BUG HISTORY (2026-07-15): AppSettings (maxPartySize, autoConfirm) is
     * now editable from Admin → Settings, but neither value previously had
     * any real effect on reservation creation — maxPartySize was a static
     * Zod .max(50), and autoConfirm wasn't read anywhere at all, meaning
     * toggling it in the admin UI persisted to the database but changed
     * nothing about what actually happened when a guest booked. Both are
     * now enforced here, in the one place a public reservation gets
     * created. Only fetched/applied for public submissions — a staff
     * member creating a reservation directly is already the "confirming"
     * action, these limits are specifically about the unattended public
     * booking flow.
     */
    const settings = isPublicSubmission
      ? await prisma.appSettings.findUnique({ where: { id: "singleton" } })
      : null;

    if (isPublicSubmission) {
      const maxPartySize = settings?.maxPartySize ?? 20;
      if (data.partySize > maxPartySize) {
        return NextResponse.json(
          { error: `For parties larger than ${maxPartySize}, please call us directly to arrange your reservation.` },
          { status: 400 }
        );
      }
    }

    const autoConfirm = isPublicSubmission && (settings?.autoConfirm ?? false);
    const initialStatus = autoConfirm ? "CONFIRMED" : "REQUESTED";

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
        status: initialStatus,
        activity: {
          create: {
            type: "created",
            description: session ? `Reservation created by ${session.name}` : `Reservation submitted via public RSVP form`,
            staffId: session?.id ?? null,
          },
        },
      },
      include: {
        server: { select: { id: true, name: true, color: true } },
        tables: { include: { table: true } },
        activity: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    // ── Public-submission side effects (email + CRM sync) ──────────────
    // BUG HISTORY (2026-07-15): neither of these fired at all — the guest
    // got no confirmation email/text on submission, and Systeme.io never
    // received the contact. Both integration modules existed and worked
    // correctly (verified separately), they were simply never called from
    // this route. Only fires for public submissions (source: "web_form")
    // with an email address — staff-created reservations don't need a
    // "we received your request" email (the staff member IS the receipt),
    // and Systeme.io upsert requires an email to key off of.
    //
    // Branches on autoConfirm (see BUG HISTORY above initialStatus): if
    // the admin has auto-confirm enabled, this reservation was created
    // with status CONFIRMED directly, so the guest gets the real
    // confirmation email/SMS and a past-customer CRM tag immediately —
    // not the "received, pending review" messaging, which would be
    // inaccurate since there's no pending review step in that mode.
    // Otherwise, behavior is unchanged from before: "received" messaging
    // + inquirer tag, with the existing Systeme.io automation removing
    // "inquirer" once a human later confirms and it becomes past-customer.
    if (isPublicSubmission && reservation.email) {
      if (autoConfirm) {
        sendReservationConfirmation(reservation.email, {
          firstName: reservation.firstName,
          date: formatDate(reservation.date),
          time: formatTime(reservation.arrivalTime),
          partySize: reservation.partySize,
          rsvpCode: reservation.rsvpCode,
        }).catch((err: unknown) => console.error("[Reservations] auto-confirm email failed:", err));

        upsertSystemeContact(
          reservation.email, reservation.firstName, reservation.lastName,
          reservation.phone ?? undefined, [SYSTEME_CONFIG.tags.pastCustomer]
        ).catch((err: unknown) => console.error("[Reservations] Systeme.io past-customer tag failed:", err));
      } else {
        sendReservationReceived(reservation.email, {
          firstName: reservation.firstName,
          date: formatDate(reservation.date),
          time: formatTime(reservation.arrivalTime),
          partySize: reservation.partySize,
          rsvpCode: reservation.rsvpCode,
        }).catch((err: unknown) => console.error("[Reservations] received-email failed:", err));

        upsertSystemeContact(
          reservation.email, reservation.firstName, reservation.lastName,
          reservation.phone ?? undefined, [SYSTEME_CONFIG.tags.inquirer]
        ).catch((err: unknown) => console.error("[Reservations] Systeme.io inquirer tag failed:", err));
      }
    }

    // SMS confirmation — fulfills the "confirmation text" half of the RSVP
    // form's consent language (see rsvp-form.tsx). Sent whenever a phone
    // number is present, independent of whether email was also provided —
    // phone is a required field on every reservation, email is optional.
    if (isPublicSubmission && reservation.phone) {
      if (autoConfirm) {
        sendReservationConfirmationSms(reservation.phone, {
          firstName: reservation.firstName,
          date: formatDate(reservation.date),
          time: formatTime(reservation.arrivalTime),
          partySize: reservation.partySize,
          rsvpCode: reservation.rsvpCode,
        }).catch((err: unknown) => console.error("[Reservations] auto-confirm SMS failed:", err));
      } else {
        sendReservationReceivedSms(reservation.phone, {
          firstName: reservation.firstName,
          date: formatDate(reservation.date),
          time: formatTime(reservation.arrivalTime),
          rsvpCode: reservation.rsvpCode,
        }).catch((err: unknown) => console.error("[Reservations] received-SMS failed:", err));
      }
    }

    return NextResponse.json({ data: reservation }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/reservations]", error);
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 }
    );
  }
}
