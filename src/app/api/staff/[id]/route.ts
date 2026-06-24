import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"

const bcrypt = require("bcryptjs")

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.accessLevel !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await request.json()
  const update: Record<string, unknown> = {}
  if (body.name)        update.name = body.name
  if (body.role)        update.role = body.role
  if (body.accessLevel) update.accessLevel = body.accessLevel
  if (body.email)       update.email = body.email
  if (body.color)       update.color = body.color
  if (body.pin && body.pin.length === 4) {
    update.pin = await bcrypt.hash(body.pin, 10)
  }
  const updated = await prisma.staff.update({
    where: { id: params.id },
    data: update,
    select: { id: true, name: true, role: true, accessLevel: true, color: true, email: true },
  })
  return NextResponse.json({ data: updated })
}
