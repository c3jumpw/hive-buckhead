import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"

export async function GET() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } })
  return NextResponse.json({ data: settings ?? {} })
}

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session || session.accessLevel !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await request.json()
  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: body,
    create: { id: "singleton", ...body },
  })
  return NextResponse.json({ data: settings })
}
