import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tables = await prisma.table.findMany({
    orderBy: [{ section: "asc" }, { displayId: "asc" }],
    where: { active: true },
  })

  return NextResponse.json({ data: tables })
}
