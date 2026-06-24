import { requireAccessLevel } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { AdminClient } from "@/components/admin/admin-client"

export const metadata = { title: "Tables & Sections" }

export default async function AdminTablesPage() {
  const session = await requireAccessLevel("ADMIN")
  const [tables, staff] = await Promise.all([
    prisma.table.findMany({ where: { active: true }, orderBy: [{ section: "asc" }, { displayId: "asc" }] }),
    prisma.staff.findMany({ where: { active: true }, select: { id: true, name: true, role: true, accessLevel: true, color: true, email: true, pin: true }, orderBy: { name: "asc" } }),
  ])
  return <AdminClient session={session} initialTab="tables" stats={{ staffCount: staff.length, tableCount: tables.length, rsvpCount: 0 }} recentReservations={[]} staff={staff} tables={tables} />
}
