import { requireAccessLevel } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { AdminClient } from "@/components/admin/admin-client"

export const metadata = { title: "Staff" }

export default async function AdminStaffPage() {
  const session = await requireAccessLevel("ADMIN")
  const staff = await prisma.staff.findMany({ where: { active: true }, select: { id: true, name: true, role: true, accessLevel: true, color: true, email: true, pin: true }, orderBy: { name: "asc" } })
  return <AdminClient session={session} initialTab="staff" stats={{ staffCount: staff.length, tableCount: 0, rsvpCount: 0 }} recentReservations={[]} staff={staff} tables={[]} hours={[]} messageTemplates={[]} />
}
