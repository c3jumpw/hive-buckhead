import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json()
  const shift = await prisma.shift.create({
    data: {
      staffId: body.staffId, date: new Date(body.date),
      startTime: body.startTime, endTime: body.endTime,
      type: body.type, role: body.role || null, createdBy: session.name,
    },
  })
  return NextResponse.json({ data: shift }, { status: 201 })
}
