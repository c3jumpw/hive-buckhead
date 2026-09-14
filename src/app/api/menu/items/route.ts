import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.accessLevel === "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await request.json()
  const { sectionId, name, description, price, tags, sortOrder, featured } = body
  if (!sectionId || !name) return NextResponse.json({ error: "sectionId and name required" }, { status: 400 })
  const item = await prisma.menuItem.create({
    data: { sectionId, name, description, price, tags, sortOrder: sortOrder ?? 0, featured: featured ?? false },
  })
  return NextResponse.json({ data: item }, { status: 201 })
}
