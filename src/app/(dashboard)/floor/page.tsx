import { requireAuth } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { FloorClient } from "@/components/floor/floor-client"

export const metadata = { title: "Floor View" }
export const revalidate = 10

export default async function FloorPage() {
  const session = await requireAuth()
  const today = new Date()
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

  const [tables, upcoming] = await Promise.all([
    prisma.table.findMany({
      where: { active: true },
      include: {
        reservationTables: {
          include: {
            reservation: {
              select: { id: true, firstName: true, lastName: true, partySize: true, arrivalTime: true, status: true, date: true },
            },
          },
          where: { reservation: { status: { in: ["CONFIRMED", "SEATED", "REQUESTED"] } } },
          take: 1,
        },
      },
      orderBy: [{ section: "asc" }, { displayId: "asc" }],
    }),
    prisma.reservation.findMany({
      where: {
        status: { in: ["CONFIRMED", "REQUESTED"] },
        date: { gte: today, lte: tomorrow },
      },
      select: {
        id: true, firstName: true, lastName: true,
        partySize: true, arrivalTime: true, date: true, rsvpCode: true,
        tables: { select: { tableId: true } },
      },
      orderBy: { arrivalTime: "asc" },
    }),
  ])

  return (
    <FloorClient
      tables={JSON.parse(JSON.stringify(tables))}
      session={session}
      upcomingReservations={JSON.parse(JSON.stringify(upcoming))}
    />
  )
}
