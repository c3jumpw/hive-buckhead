import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"

// GET /api/menu/sections — public, no auth needed
export async function GET() {
  try {
    const sections = await prisma.menuSection.findMany({
      where: { active: true },
      include: {
        items: {
          where: { active: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    })
    return NextResponse.json({ data: sections })
  } catch {
    return NextResponse.json({ error: "Menu unavailable" }, { status: 500 })
  }
}

// POST /api/menu/sections — create section (manager+ only)
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.accessLevel === "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await request.json()
  const { name, description, sortOrder, availableDays, availableFrom, availableTo } = body
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const section = await prisma.menuSection.create({
    data: { name, description, sortOrder: sortOrder ?? 0, availableDays, availableFrom, availableTo },
    include: { items: true },
  })
  return NextResponse.json({ data: section }, { status: 201 })
}
