import { requireAccessLevel } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { AnalyticsClient } from "@/components/analytics/analytics-client"

export const metadata = { title: "Analytics" }

export default async function AnalyticsPage() {
  await requireAccessLevel("ADMIN")

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const eightWeeksAgo = new Date()
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)

  const [totalRsvp, completedRsvp, cancelledRsvp, allReservations, staffPerf] = await Promise.all([
    prisma.reservation.count(),
    prisma.reservation.count({ where: { status: "COMPLETED" } }),
    prisma.reservation.count({ where: { status: "CANCELLED" } }),
    prisma.reservation.findMany({
      where: { createdAt: { gte: eightWeeksAgo } },
      select: {
        id: true, date: true, arrivalTime: true, partySize: true,
        status: true, orderTotal: true, createdAt: true, section: true,
        seatedAt: true, completedAt: true,
      },
      orderBy: { date: "asc" },
    }),
    prisma.staff.findMany({
      where: { active: true, accessLevel: { in: ["ADMIN", "STAFF"] } },
      select: {
        id: true, name: true, color: true, role: true,
        _count: { select: { reservations: true, shifts: true, callouts: true } },
        reservations: {
          where: { status: "COMPLETED" },
          select: { orderTotal: true, partySize: true, tipAmount: true },
        },
      },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <AnalyticsClient
      stats={{ totalRsvp, completedRsvp, cancelledRsvp }}
      allReservations={JSON.parse(JSON.stringify(allReservations))}
      staffPerf={JSON.parse(JSON.stringify(staffPerf))}
    />
  )
}
