import { requireAuth } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { ScheduleClient } from "@/components/schedule/schedule-client"
import { format, startOfWeek, endOfWeek, addWeeks } from "date-fns"

export const metadata = { title: "Staff Schedule" }

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: { week?: string }
}) {
  const session = await requireAuth()

  // week param = "YYYY-MM-DD" of the Monday. Default = current week
  const baseDate = searchParams.week ? new Date(searchParams.week + "T12:00:00") : new Date()
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 })

  const prevWeek = format(addWeeks(weekStart, -1), "yyyy-MM-dd")
  const nextWeek = format(addWeeks(weekStart, 1), "yyyy-MM-dd")

  const [shifts, callouts, staff] = await Promise.all([
    prisma.shift.findMany({
      where: { date: { gte: weekStart, lte: weekEnd } },
      include: { staff: { select: { id: true, name: true, color: true, role: true } } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    prisma.callout.findMany({
      where: { date: { gte: weekStart, lte: weekEnd } },
      include: {
        staff: { select: { id: true, name: true } },
        coveredBy: { select: { id: true, name: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.staff.findMany({
      where: { active: true },
      select: { id: true, name: true, color: true, role: true },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <ScheduleClient
      shifts={JSON.parse(JSON.stringify(shifts))}
      callouts={JSON.parse(JSON.stringify(callouts))}
      staff={staff}
      session={session}
      weekStart={format(weekStart, "yyyy-MM-dd")}
      prevWeek={prevWeek}
      nextWeek={nextWeek}
    />
  )
}
