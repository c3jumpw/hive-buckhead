// src/app/api/reservations/[id]/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
// GET    /api/reservations/:id
// PATCH  /api/reservations/:id
// DELETE /api/reservations/:id (admin only)

import { NextRequest, NextResponse } from "next/server";
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

  let subject = "", body = ""
  if (type === "confirm") {
    subject = `Your Hive Buckhead Reservation is Confirmed! 🥂`
    body = `Hi ${r.firstName},

Your reservation at Hive Buckhead is confirmed!

📅 ${dateStr}
🕐 ${timeStr}
👥 Party of ${r.partySize}
📋 RSVP #: ${r.rsvpCode}

Need to make changes? Visit:
${changeUrl}

We look forward to seeing you!

— Hive Buckhead`
  } else {
    subject = `Your Hive Buckhead Reservation Has Been Cancelled`
    body = `Hi ${r.firstName},

Your reservation at Hive Buckhead on ${dateStr} at ${timeStr} has been cancelled.

RSVP #: ${r.rsvpCode}

We hope to see you again soon.

— Hive Buckhead`
  }

  // 1. Always log to MessageLog
  try {
    await prisma.messageLog.create({
      data: {
        channel: "EMAIL",
        recipient: r.email ?? r.phone ?? r.firstName,
        subject,
        body,
        status: "PENDING",
        reservationId,
      },
    })
  } catch { /* MessageLog may not have reservationId field yet — non-fatal */ }

  // 2. Send via SendGrid if API key is configured
  const sgKey = process.env.SENDGRID_API_KEY
  const fromEmail = process.env.SENDGRID_FROM_EMAIL ?? "noreply@hivebuckhead.com"
  if (sgKey && r.email) {
    try {
      const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { "Authorization": `Bearer ${sgKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: r.email, name: `${r.firstName} ${r.lastName}` }] }],
          from: { email: fromEmail, name: "Hive Buckhead" },
          subject,
          content: [{ type: "text/plain", value: body }],
        }),
      })
      // Update log status
      if (resp.ok) {
        await prisma.messageLog.updateMany({
          where: { reservationId, status: "PENDING" },
          data: { status: "SENT", sentAt: new Date() },
        }).catch(() => {})
      }
    } catch { /* SendGrid failure is non-fatal — message is logged */ }
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
  if (parsed.data.status === "CONFIRMED" && current?.status !== "CONFIRMED") {
    const full = await prisma.reservation.findUnique({ where: { id }, select: { firstName: true, lastName: true, email: true, phone: true, date: true, arrivalTime: true, partySize: true, rsvpCode: true } })
    if (full) sendNotification(id, "confirm", { ...full, date: full.date.toISOString() }).catch(() => {})
  }
  if (parsed.data.status === "CANCELLED" && current?.status !== "CANCELLED") {
    const full = await prisma.reservation.findUnique({ where: { id }, select: { firstName: true, lastName: true, email: true, phone: true, date: true, arrivalTime: true, partySize: true, rsvpCode: true } })
    if (full) sendNotification(id, "cancel", { ...full, date: full.date.toISOString() }).catch(() => {})
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

async function handleApproveChange(
  id: string,
  body: { changeRequest?: Record<string, unknown> },
  session: { id: string; name: string }
) {
  const cr = body.changeRequest ?? {};

  const reservation = await prisma.$transaction(async (tx: any) => {
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
  if (!session || session.accessLevel !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.reservation.delete({ where: { id: params.id } });
  return NextResponse.json({ data: { deleted: true } });
}
