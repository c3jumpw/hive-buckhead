import { requireAccessLevel } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { AdminClient } from "@/components/admin/admin-client"

export const metadata = { title: "Settings" }

export default async function AdminSettingsPage() {
  const session = await requireAccessLevel("ADMIN")
  const staff = await prisma.staff.findMany({ where: { active: true }, select: { id: true, name: true, role: true, accessLevel: true, color: true, email: true, pin: true }, orderBy: { name: "asc" } })
  return <AdminClient session={session} initialTab="settings" stats={{ staffCount: 0, tableCount: 0, rsvpCount: 0 }} recentReservations={[]} staff={staff} tables={[]} hours={[]} messageTemplates={[]} />
}
