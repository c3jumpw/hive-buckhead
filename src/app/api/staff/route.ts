import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"
const bcrypt = require("bcryptjs")

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.accessLevel !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await request.json()
  const { name, email, role, accessLevel, pin, color } = body
  if (!name || !email || !role || !pin) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }
  const hashedPin = await bcrypt.hash(pin, 10)
  const staff = await prisma.staff.create({
    data: { name, email, role, accessLevel: accessLevel ?? "STAFF", pin: hashedPin, color: color ?? "#5B96C8", active: true },
    select: { id: true, name: true, role: true, accessLevel: true, color: true, email: true },
  })
  return NextResponse.json({ data: staff }, { status: 201 })
}
