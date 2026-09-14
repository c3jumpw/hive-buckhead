import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.accessLevel === "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await request.json()
  const section = await prisma.menuSection.update({
    where: { id: params.id },
    data: body,
    include: { items: { orderBy: { sortOrder: "asc" } } },
  })
  return NextResponse.json({ data: section })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.accessLevel !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  await prisma.menuSection.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
