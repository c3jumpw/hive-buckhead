// src/app/api/reservations/[id]/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
// GET    /api/reservations/:id
// PATCH  /api/reservations/:id
// DELETE /api/reservations/:id (admin only)

import { NextRequest, NextResponse } from "next/server";
import { sendReservationConfirmation, sendCancellationEmail } from "@/lib/integrations/sendgrid";
import { sendReservationConfirmationSms, sendCancellationSms } from "@/lib/integrations/quo";
import { upsertSystemeContact } from "@/lib/integrations/systeme";
import { SYSTEME_CONFIG } from "@/lib/config";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import {
  updateReservationSchema,
  closeTableSchema,
  cancelReservationSchema,
} from "@/lib/validations/reservation";
import { STATUS_LABELS } from "@/lib/utils";
import type { ReservationStatus } from "@/types";

type Params = { params: { id: string } };

// ── Notification helper ────────────────────────────────────────────────────
// Logs to MessageLog every time. Sends real email via SendGrid if key is set.

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
}
function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number)
  return `${h % 12 || 12}:${m.toString().padStart(2,"0")} ${h < 12 ? "AM" : "PM"}`
}

async function sendNotification(
  reservationId: string,
  type: "confirm" | "cancel",
  r: { firstName: string; lastName: string; email?: string | null; phone?: string | null; date: string; arrivalTime: string; partySize: number; rsvpCode: string }
) {
  const changeUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/rsvp/manage?code=${r.rsvpCode}`
  const dateStr = formatDate(r.date)
  const timeStr = formatTime(r.arrivalTime)

  // Always log the notification attempt regardless of whether it actually
  // sends — preserves an audit trail even if SendGrid/Twilio are
  // unconfigured or the guest is missing a contact method.
  try {
    await prisma.messageLog.create({
      data: {
        channel: "EMAIL",
        recipient: r.email ?? r.phone ?? r.firstName,
        subject: type === "confirm" ? "Reservation Confirmed" : "Reservation Cancelled",
        body: `${type} notification for RSVP ${r.rsvpCode}`,
        status: "PENDING",
        reservationId,
      },
    })
  } catch { /* MessageLog may not have reservationId field yet — non-fatal */ }

  // ── Email ──
  // BUG HISTORY (2026-07-15): this function previously started with
  // `if (!r.email) return`, which skipped EVERYTHING below it — including
  // the SMS send and the Systeme.io sync — for any guest without an email
  // on file. Email and SMS are independent contact methods (phone is a
  // required field on every reservation, email is optional), so a missing
  // email should only skip the email send, not silently skip SMS too.
  if (r.email) {
    // Send via the shared SendGrid module (src/lib/integrations/sendgrid.ts) —
    // single source of truth for email templates and the verified sender
    // address, replacing the old inline fetch() implementation that
    // duplicated this logic with a stale fallback domain.
    const emailResult = type === "confirm"
      ? await sendReservationConfirmation(r.email, { firstName: r.firstName, date: dateStr, time: timeStr, partySize: r.partySize, rsvpCode: r.rsvpCode })
      : await sendCancellationEmail(r.email, { firstName: r.firstName, rsvpCode: r.rsvpCode, date: dateStr })

    if (emailResult.success) {
      await prisma.messageLog.updateMany({
        where: { reservationId, status: "PENDING" },
        data: { status: "SENT", sentAt: new Date(), externalId: emailResult.messageId ?? null },
      }).catch(() => {})
    }
  }

  // ── SMS ──
  // Fulfills the "confirmation text" half of the RSVP form's consent
  // language. Fires independently of the email branch above — gated only
  // on phone presence, which every reservation has.
  if (r.phone) {
    if (type === "confirm") {
      sendReservationConfirmationSms(r.phone, { firstName: r.firstName, date: dateStr, time: timeStr, partySize: r.partySize, rsvpCode: r.rsvpCode })
        .catch((err: unknown) => console.error("[Reservations] confirmation SMS failed:", err))
    } else {
      sendCancellationSms(r.phone, { firstName: r.firstName, rsvpCode: r.rsvpCode, date: dateStr })
        .catch((err: unknown) => console.error("[Reservations] cancellation SMS failed:", err))
    }
  }

  // ── Systeme.io sync ──
  // Requires an email — Systeme.io contacts are keyed by email address,
  // there's no phone-based contact model on their side, so this branch
  // staying gated on r.email is a real external constraint, not a bug.
  if (r.email) {
    // Tag depends on the transition:
    //   confirm -> past-customer (guest now has a confirmed upcoming visit).
    //              An existing Systeme.io automation removes the "inquirer"
    //              tag automatically once past-customer is applied — nothing
    //              further needed on this end for that part.
    //   cancel  -> inquirer, since the booking did not result in a completed visit
    const tag = type === "confirm" ? SYSTEME_CONFIG.tags.pastCustomer : SYSTEME_CONFIG.tags.inquirer
    upsertSystemeContact(r.email, r.firstName, r.lastName, r.phone ?? undefined, [tag]).catch((err: unknown) =>
      console.error("[Systeme.io] sync failed for reservation", reservationId, err)
    )
  }
}

// ── GET /api/reservations/:id ──────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
    include: {
      server: { select: { id: true, name: true, color: true, role: true } },
      tables: { include: { table: true } },
      activity: { orderBy: { createdAt: "desc" } },
      messages: { orderBy: { sentAt: "desc" } },
    },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: reservation });
}

// ── PATCH /api/reservations/:id ────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { action } = body;

    // Route to specific action handlers
    switch (action) {
      case "close_table":
        return handleCloseTable(params.id, body, session);
      case "cancel":
        return handleCancel(params.id, body, session);
      case "approve_change":
        return handleApproveChange(params.id, body, session);
      case "deny_change":
        return handleDenyChange(params.id, body, session);
      default:
        return handleUpdate(params.id, body, session);
    }
  } catch (error) {
    console.error("[PATCH /api/reservations/:id]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

// ── Action: General update ─────────────────────────────────────────────────

async function handleUpdate(
  id: string,
  body: unknown,
  session: { id: string; name: string }
) {
  const parsed = updateReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { tableIds, status, ...updateData } = parsed.data;

  // Track status change for activity log
  const current = await prisma.reservation.findUnique({
    where: { id },
    select: { status: true },
  });

  const reservation = await prisma.$transaction(async (tx: any) => {
    // Update main record
    const updated = await tx.reservation.update({
      where: { id },
      data: {
        ...updateData,
        ...(status && { status }),
        ...(status === "CONFIRMED" && { confirmedAt: new Date(), confirmedById: session.id }),
        ...(status === "SEATED" && { seatedAt: new Date() }),
        ...(status === "COMPLETED" && { completedAt: new Date() }),
        ...(status === "CANCELLED" && { cancelledAt: new Date() }),
        // Reassign tables if provided
        ...(tableIds && {
          tables: {
            deleteMany: {},
            create: tableIds.map((tid) => ({ tableId: tid })),
          },
        }),
      },
      include: {
        server: { select: { id: true, name: true, color: true } },
        tables: { include: { table: true } },
        activity: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    // ── Keep linked tables' own state in sync with the reservation status ──
    // BUG HISTORY (2026-07-15): the "seat a guest" action exists in TWO
    // independent places — Floor View (floor-client.tsx) and the
    // Reservations list (reservations-client.tsx's SeatGuestModal). Floor
    // View's client code always made a SECOND api call afterward
    // (PATCH /api/tables/:id) to mark the table SEATED; the Reservations
    // page's client code did not — it only ever PATCHed the reservation
    // itself. Result: seating a guest from the Reservations list correctly
    // updated the reservation's status and its table links, but the
    // table's own `state` field stayed whatever it was before (typically
    // AVAILABLE or RESERVED) — so Floor View kept showing that table as
    // empty while a guest was actually seated there.
    //
    // Fixed here, server-side, inside the same transaction as the status
    // change, so EVERY current and future caller gets correct table-state
    // sync automatically — this is no longer something each client has to
    // separately remember to do.
    const linkedTableIds = updated.tables.map((rt: { tableId: string }) => rt.tableId)
    if (linkedTableIds.length > 0) {
      if (status === "SEATED") {
        await tx.table.updateMany({ where: { id: { in: linkedTableIds } }, data: { state: "SEATED" } })
      } else if (status === "CONFIRMED") {
        // A confirmed reservation with tables assigned reserves those
        // tables on the floor plan ahead of arrival — but only if they're
        // not already seated/dirty from a different, still-active party.
        await tx.table.updateMany({
          where: { id: { in: linkedTableIds }, state: "AVAILABLE" },
          data: { state: "RESERVED" },
        })
      }
    }

    // Log activity
    if (status && status !== current?.status) {
      await tx.activityLog.create({
        data: {
          reservationId: id,
          staffId: session.id,
          type: "status_change",
          description: `Status changed to ${STATUS_LABELS[status as ReservationStatus]} by ${session.name}`,
        },
      });
    }

    return updated;
  });

  // Send notification after transaction (non-blocking)
  //
  // BUG HISTORY (2026-07-15): both calls below used .catch(() => {}) —
  // completely silent, zero logging. If sendNotification threw for any
  // reason outside the specific SendGrid/Quo functions' own internal
  // error handling (both of which DO log via console.error), there would
  // be no trace anywhere that anything went wrong. A confirmed reservation
  // that produced no email/SMS was genuinely undiagnosable from Vercel
  // logs alone. Now logs the failure explicitly with the reservation id
  // and notification type, so a "no email arrived" report can actually be
  // traced to a specific error message instead of silence.
  if (parsed.data.status === "CONFIRMED" && current?.status !== "CONFIRMED") {
    const full = await prisma.reservation.findUnique({ where: { id }, select: { firstName: true, lastName: true, email: true, phone: true, date: true, arrivalTime: true, partySize: true, rsvpCode: true } })
    if (full) sendNotification(id, "confirm", { ...full, date: full.date.toISOString() })
      .catch((err: unknown) => console.error(`[sendNotification] confirm failed for reservation ${id}:`, err))
  }
  if (parsed.data.status === "CANCELLED" && current?.status !== "CANCELLED") {
    const full = await prisma.reservation.findUnique({ where: { id }, select: { firstName: true, lastName: true, email: true, phone: true, date: true, arrivalTime: true, partySize: true, rsvpCode: true } })
    if (full) sendNotification(id, "cancel", { ...full, date: full.date.toISOString() })
      .catch((err: unknown) => console.error(`[sendNotification] cancel failed for reservation ${id}:`, err))
  }

  return NextResponse.json({ data: reservation });
}

// ── Action: Close table & log order ───────────────────────────────────────

async function handleCloseTable(
  id: string,
  body: unknown,
  session: { id: string; name: string }
) {
  const parsed = closeTableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { orderTotal, tipAmount, closingRemarks } = parsed.data;

  const reservation = await prisma.$transaction(async (tx: any) => {
    // Update reservation
    const updated = await tx.reservation.update({
      where: { id },
      data: {
        status: "COMPLETED",
        orderTotal,
        tipAmount: tipAmount ?? null,
        closingRemarks,
        completedAt: new Date(),
        closedById: session.id,
      },
      include: {
        server: { select: { id: true, name: true, color: true } },
        tables: { include: { table: true } },
        activity: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    // Mark assigned tables as dirty (need bussing)
    const tableIds = updated.tables.map((rt: {tableId: string}) => rt.tableId);
    if (tableIds.length > 0) {
      await tx.table.updateMany({
        where: { id: { in: tableIds } },
        data: { state: "DIRTY" },
      });
    }

    // Log activity
    await tx.activityLog.create({
      data: {
        reservationId: id,
        staffId: session.id,
        type: "order_closed",
        description: `Table closed by ${session.name}. Order: $${orderTotal.toFixed(2)}${tipAmount ? ` + tip $${tipAmount.toFixed(2)}` : ""}. "${closingRemarks.slice(0, 60)}"`,
      },
    });

    return updated;
  });

  return NextResponse.json({ data: reservation });
}

// ── Action: Cancel ─────────────────────────────────────────────────────────

async function handleCancel(
  id: string,
  body: unknown,
  session: { id: string; name: string }
) {
  const parsed = cancelReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { reason, remarks } = parsed.data;

  const reservation = await prisma.$transaction(async (tx: any) => {
    const updated = await tx.reservation.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
      include: {
        server: { select: { id: true, name: true, color: true } },
        tables: { include: { table: true } },
        activity: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    await tx.activityLog.create({
      data: {
        reservationId: id,
        staffId: session.id,
        type: "cancelled",
        description: `Cancelled by ${session.name}. Reason: ${reason}${remarks ? ". " + remarks : ""}`,
      },
    });

    return updated;
  });

  // Send cancellation notification
  const full = await prisma.reservation.findUnique({ where: { id }, select: { firstName: true, lastName: true, email: true, phone: true, date: true, arrivalTime: true, partySize: true, rsvpCode: true } })
  if (full) sendNotification(id, "cancel", { ...full, date: full.date.toISOString() }).catch(() => {})

  return NextResponse.json({ data: reservation });
}

// ── Action: Approve change request ────────────────────────────────────────

/**
 * BUG HISTORY (2026-07-15): this previously read the change details from
 * `body.changeRequest` — i.e. whatever the calling client happened to have
 * in its own local state and chose to echo back — rather than the
 * reservation's actual current changeRequest value in the database. In
 * practice the one caller (reservations-client.tsx) does pass back what it
 * read from the server, so this worked, but it's fragile: if that client's
 * local copy went stale (another staff member updated the reservation
 * first, or the page hadn't refreshed), approving would silently apply
 * outdated change data instead of what the guest actually most recently
 * requested. Fixed to read changeRequest directly from the database inside
 * the transaction — the only source of truth that can't go stale.
 */
async function handleApproveChange(
  id: string,
  _body: unknown,
  session: { id: string; name: string }
) {
  const reservation = await prisma.$transaction(async (tx: any) => {
    const current = await tx.reservation.findUnique({ where: { id }, select: { changeRequest: true } })
    const cr = (current?.changeRequest as Record<string, unknown>) ?? {}

    const updated = await tx.reservation.update({
      where: { id },
      data: {
        status: "CONFIRMED",
        changeRequest: null as any,
        ...(cr.newDate     ? { date: new Date(cr.newDate as string) }      : {}),
        ...(cr.newTime     ? { arrivalTime: cr.newTime as string }          : {}),
        ...(cr.newPartySize? { partySize: cr.newPartySize as number }       : {}),
        ...(cr.newSection  ? { section: cr.newSection as string }           : {}),
      },
      include: {
        server: { select: { id: true, name: true, color: true } },
        tables: { include: { table: true } },
        activity: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    await tx.activityLog.create({
      data: {
        reservationId: id,
        staffId: session.id,
        type: "change_approved",
        description: `Change request approved by ${session.name}`,
      },
    });

    return updated;
  });

  return NextResponse.json({ data: reservation });
}

// ── Action: Deny change request ───────────────────────────────────────────

async function handleDenyChange(
  id: string,
  _body: unknown,
  session: { id: string; name: string }
) {
  const reservation = await prisma.$transaction(async (tx: any) => {
    const updated = await tx.reservation.update({
      where: { id },
      data: { status: "CONFIRMED", changeRequest: null as any },
      include: {
        server: { select: { id: true, name: true, color: true } },
        tables: { include: { table: true } },
        activity: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    await tx.activityLog.create({
      data: {
        reservationId: id,
        staffId: session.id,
        type: "change_denied",
        description: `Change request denied by ${session.name} — reservation kept active`,
      },
    });

    return updated;
  });

  return NextResponse.json({ data: reservation });
}

// ── DELETE /api/reservations/:id (admin only) ──────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || (session.accessLevel !== "OWNER" && session.accessLevel !== "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.reservation.delete({ where: { id: params.id } });
  return NextResponse.json({ data: { deleted: true } });
}
