import { requireAccessLevel } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { AdminClient } from "@/components/admin/admin-client"

export const metadata = { title: "Operating Hours" }

export default async function AdminHoursPage() {
  const session = await requireAccessLevel("ADMIN")
  const [hours, staff] = await Promise.all([
    prisma.operatingHours.findMany({ orderBy: { dayOfWeek: "asc" } }),
    prisma.staff.findMany({ where: { active: true }, select: { id: true, name: true, role: true, accessLevel: true, color: true, email: true, pin: true }, orderBy: { name: "asc" } }),
  ])
  return <AdminClient session={session} initialTab="hours" stats={{ staffCount: 0, tableCount: 0, rsvpCount: 0 }} recentReservations={[]} staff={staff} tables={[]} hours={hours} messageTemplates={[]} />
}