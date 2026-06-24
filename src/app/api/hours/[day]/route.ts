import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"

// GET — public, used by RSVP form to generate time slots
export async function GET(request: NextRequest, { params }: { params: { day: string } }) {
  const dayOfWeek = parseInt(params.day)
  const hours = await prisma.operatingHours.findUnique({ where: { dayOfWeek } })
  // Default hours if not set
  if (!hours) {
    return NextResponse.json({ data: { dayOfWeek, openTime: "17:00", closeTime: "23:00", closed: false } })
  }
  return NextResponse.json({ data: hours })
}

export async function PATCH(request: NextRequest, { params }: { params: { day: string } }) {
  const session = await getSession()
  if (!session || session.accessLevel !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await request.json()
  const dayOfWeek = parseInt(params.day)
  const hours = await prisma.operatingHours.upsert({
    where: { dayOfWeek },
    update: body,
    create: { dayOfWeek, ...body },
  })
  return NextResponse.json({ data: hours })
}
