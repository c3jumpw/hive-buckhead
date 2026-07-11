/**
 * GET  — list all positions (all authenticated staff)
 * POST — create new position (owner only)
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession, requireOwner } from "@/lib/auth/session"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const positions = await prisma.position.findMany({ where: { active: true }, orderBy: { name: "asc" } })
  return NextResponse.json({ data: positions })
}

export async function POST(request: NextRequest) {
  await requireOwner()
  const body = await request.json()
  if (!body.name) return NextResponse.json({ error: "Position name required" }, { status: 400 })
  const position = await prisma.position.create({
    data: { name: body.name, description: body.description || null, department: body.department || null },
  })
  return NextResponse.json({ data: position }, { status: 201 })
}
