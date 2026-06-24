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

  // Fetch today's reservations server-side for instant first render
  const reservations = await prisma.reservation.findMany({
    where: {
      date: {
        gte: new Date(today),
        lt: new Date(new Date(today).getTime() + 86400000),
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
    where: { active: true, accessLevel: { in: ["ADMIN", "STAFF"] } },
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
