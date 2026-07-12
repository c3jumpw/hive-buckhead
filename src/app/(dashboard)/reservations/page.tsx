// src/app/(dashboard)/reservations/page.tsx
// Server Component — fetches initial data, passes to client components.
// Next.js renders this on the server, so the page is never blank on load.

import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ReservationsClient } from "@/components/reservations/reservations-client";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "Reservations",
};

// Revalidate this page every 30 seconds (ISR)
export const revalidate = 30;

export default async function ReservationsPage() {
  const session = await requireAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  /**
   * BUG HISTORY (2026-07-15): this query previously fetched ONLY today's
   * reservations (gte today, lt tomorrow). The client component's own
   * "Today" / "Upcoming" / "Past" filters operate entirely on whatever is
   * in this initial dataset — there is no client-side fetch for other
   * dates (see reservations-client.tsx, which never calls GET
   * /api/reservations at all). The practical effect: switching to
   * "Upcoming" just re-filtered the same today-only list, which is why
   * any reservation dated even one day out — including every public RSVP
   * submission for a future date — silently never appeared anywhere in
   * the list/kanban/calendar views, even though it existed correctly in
   * the database (visible only in unfiltered widgets like "recent
   * activity" on the dashboard, which query separately).
   *
   * Fix: fetch a real window — 7 days back (covers "Past" and any
   * same-week edits) through 90 days ahead (covers the booking window
   * most guests use). This is still bounded (not the entire table) but
   * wide enough that every filter in the client actually has data.
   */
  const windowStart = new Date(today);
  windowStart.setDate(windowStart.getDate() - 7);
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + 90);

  // Fetch server-side for instant first render
  const reservations = await prisma.reservation.findMany({
    where: {
      date: {
        gte: windowStart,
        lt: windowEnd,
      },
    },
    include: {
      server: {
        select: { id: true, name: true, color: true },
      },
      tables: {
        include: {
          table: {
            select: { id: true, displayId: true, capacity: true, section: true },
          },
        },
      },
      activity: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
    orderBy: [{ date: "asc" }, { arrivalTime: "asc" }],
  });

  // Get all staff for assignment dropdowns
  const staff = await prisma.staff.findMany({
    where: { active: true, accessLevel: { in: ["OWNER", "MANAGER", "STAFF"] } },
    select: { id: true, name: true, color: true, role: true },
    orderBy: { name: "asc" },
  });

  // Get all tables for assignment dropdowns
  const tables = await prisma.table.findMany({
    where: { active: true },
    select: { id: true, displayId: true, capacity: true, section: true, state: true },
    orderBy: [{ section: "asc" }, { displayId: "asc" }],
  });

  return (
    <ReservationsClient
      initialReservations={JSON.parse(JSON.stringify(reservations))}
      staff={staff}
      tables={tables}
      session={session}
    />
  );
}
