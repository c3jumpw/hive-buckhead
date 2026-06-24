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

  const [staffCount, tableCount, rsvpCount, recentReservations, staff, tables, hours, messageTemplates] = await Promise.all([
    prisma.staff.count({ where: { active: true } }),
    prisma.table.count({ where: { active: true } }),
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
      stats={{ staffCount, tableCount, rsvpCount }}
      recentReservations={JSON.parse(JSON.stringify(recentReservations))}
      staff={staff}
      tables={tables}
      hours={JSON.parse(JSON.stringify(hours))}
      messageTemplates={messageTemplates}
      initialTab={tab}
    />
  )
}
