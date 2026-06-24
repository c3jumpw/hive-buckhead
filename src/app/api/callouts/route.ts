import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json()
  const callout = await prisma.callout.create({
    data: {
      staffId: body.staffId, date: new Date(body.date),
      reason: body.reason, coveredById: body.coveredById || null,
      notes: body.notes || null, loggedBy: session.name,
    },
  })
  return NextResponse.json({ data: callout }, { status: 201 })
}
