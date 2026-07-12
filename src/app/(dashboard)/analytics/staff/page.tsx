import { requireAccessLevel } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { StaffIntelligenceClient } from "@/components/analytics/staff-intelligence-client"

export const metadata = { title: "Staff Intelligence" }

export default async function StaffIntelligencePage() {
  await requireAccessLevel("ADMIN")

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const staff = await prisma.staff.findMany({
    where: { active: true, accessLevel: { in: ["OWNER", "MANAGER", "STAFF"] } },
    select: {
      id: true, name: true, color: true, role: true, accessLevel: true,
      reservations: {
        where: { date: { gte: ninetyDaysAgo } },
        select: { status: true, orderTotal: true, tipAmount: true, partySize: true, date: true, seatedAt: true, completedAt: true },
      },
      shifts: {
        where: { date: { gte: ninetyDaysAgo } },
        select: { date: true, startTime: true, endTime: true, type: true },
      },
      callouts: {
        where: { date: { gte: ninetyDaysAgo } },
        select: { date: true, reason: true },
      },
    },
    orderBy: { name: "asc" },
  })

  return <StaffIntelligenceClient staff={JSON.parse(JSON.stringify(staff))} />
}
