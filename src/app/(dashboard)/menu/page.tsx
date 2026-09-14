import { requireAccessLevel } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { MenuManagerClient } from "@/components/admin/menu-manager-client"

export const metadata = { title: "Menu Management" }

export default async function MenuAdminPage() {
  await requireAccessLevel("MANAGER")

  let sections: unknown[] = []
  try {
    sections = await prisma.menuSection.findMany({
      include: { items: { orderBy: [{ featured: "desc" }, { sortOrder: "asc" }] } },
      orderBy: { sortOrder: "asc" },
    })
  } catch { /* Table not yet migrated */ }

  return <MenuManagerClient sections={JSON.parse(JSON.stringify(sections))} />
}
