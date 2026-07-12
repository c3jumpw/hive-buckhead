/**
 * src/app/api/message-templates/route.ts
 * GET  — list all active templates (any authenticated staff — used by the
 *        reservation quick-send buttons, not just admins)
 * POST — create a new template (admin/manager only)
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession, requireAdmin } from "@/lib/auth/session"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const templates = await prisma.messageTemplate.findMany({
    where: { active: true },
    orderBy: [{ channel: "asc" }, { name: "asc" }],
  })
  return NextResponse.json({ data: templates })
}

export async function POST(request: NextRequest) {
  await requireAdmin()
  const body = await request.json()
  const { name, channel, subject, body: templateBody } = body

  if (!name || !channel || !templateBody) {
    return NextResponse.json({ error: "name, channel, and body are required" }, { status: 400 })
  }
  if (channel !== "EMAIL" && channel !== "SMS") {
    return NextResponse.json({ error: "channel must be EMAIL or SMS" }, { status: 400 })
  }

  const template = await prisma.messageTemplate.create({
    data: { name, channel, subject: subject || null, body: templateBody },
  })
  return NextResponse.json({ data: template }, { status: 201 })
}
