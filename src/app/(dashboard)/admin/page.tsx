import { requireAccessLevel } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { AdminClient } from "@/components/admin/admin-client"

export const metadata = { title: "Admin" }

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  const session = await requireAccessLevel("ADMIN")
  const tab = (searchParams.tab && searchParams.tab !== '') ? searchParams.tab : 'overview'

  /**
   * BUG HISTORY (2026-07-15): tableCount previously counted every active
   * Table row indiscriminately — including all 20 individual bar stool
   * records (svgShape: "stool"), each stored as its own Table entity with
   * capacity: 1 so the floor plan editor can position and track them
   * individually. That's the correct data model for the floor plan (each
   * stool needs its own status/position), but it meant the "Tables" stat
   * on the Overview page counted a single 20-seat bar as 20 "tables" —
   * conceptually wrong. Split into two counts: real tables (everything
   * that isn't a bar stool) and bar seats (stools specifically), shown as
   * two separate stat cards rather than one inflated number.
   */
  const [staffCount, tableCount, barSeatCount, rsvpCount, recentReservations, staff, tables, hours, messageTemplates] = await Promise.all([
    prisma.staff.count({ where: { active: true } }),
    prisma.table.count({ where: { active: true, svgShape: { not: "stool" } } }),
    prisma.table.count({ where: { active: true, svgShape: "stool" } }),
    prisma.reservation.count(),
    prisma.reservation.findMany({
      take: 8, orderBy: { createdAt: "desc" },
      include: { server: { select: { name: true } } },
    }),
    prisma.staff.findMany({
      where: { active: true },
      select: { id: true, name: true, role: true, accessLevel: true, color: true, email: true },
      orderBy: [{ accessLevel: "asc" }, { name: "asc" }],
    }),
    prisma.table.findMany({
      where: { active: true },
      select: { id: true, displayId: true, label: true, capacity: true, section: true, state: true, active: true },
      orderBy: [{ section: "asc" }, { displayId: "asc" }],
    }),
    prisma.operatingHours.findMany({ orderBy: { dayOfWeek: "asc" } }),
    Promise.resolve([
      { id: "confirm", name: "Reservation Confirmed", channel: "EMAIL", subject: "Your Reservation at Hive Buckhead is Confirmed!", body: "Hi {{firstName}},\n\nYour reservation at Hive Buckhead is confirmed!\n\nDate: {{date}}\nTime: {{time}}\nParty of: {{partySize}}\nRSVP #: {{rsvpCode}}\n\nIf you need to make changes, visit: {{changeUrl}}\n\nWe look forward to seeing you!\n\nHive Buckhead" },
      { id: "reminder", name: "Day-Of Reminder", channel: "SMS", subject: "", body: "Hi {{firstName}}! Reminder: your Hive Buckhead reservation is TODAY at {{time}} for {{partySize}}. RSVP #{{rsvpCode}}. See you soon! 🍸" },
      { id: "cancel", name: "Cancellation Confirmation", channel: "EMAIL", subject: "Your Reservation Has Been Cancelled", body: "Hi {{firstName}},\n\nYour reservation at Hive Buckhead on {{date}} at {{time}} has been cancelled per your request.\n\nRSVP #: {{rsvpCode}}\n\nWe hope to see you again soon.\n\nHive Buckhead" },
      { id: "thankyou", name: "Thank You", channel: "SMS", subject: "", body: "Hi {{firstName}}, thank you for dining with us at Hive Buckhead! We hope to see you again soon. 🥂" },
    ]),
  ])

  return (
    <AdminClient
      session={session}
      stats={{ staffCount, tableCount, barSeatCount, rsvpCount }}
      recentReservations={JSON.parse(JSON.stringify(recentReservations))}
      staff={staff}
      tables={tables}
      hours={JSON.parse(JSON.stringify(hours))}
      messageTemplates={messageTemplates}
      initialTab={tab}
    />
  )
}
