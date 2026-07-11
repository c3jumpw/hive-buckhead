/**
 * GET  — list announcements (staff portal + admin)
 * POST — create announcement (admin/manager only)
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession, requireAdmin } from "@/lib/auth/session"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const announcements = await prisma.announcement.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 50,
    include: { reads: { where: { staffId: session.id }, select: { readAt: true } } },
  })
  return NextResponse.json({ data: announcements })
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  const body = await request.json()
  const { title, body: msgBody, targetGroup, pinned } = body
  if (!title || !msgBody) return NextResponse.json({ error: "Title and body required" }, { status: 400 })
  const announcement = await prisma.announcement.create({
    data: { title, body: msgBody, targetGroup: targetGroup || "all", pinned: pinned || false, authorId: session.id, authorName: session.name },
  })
  return NextResponse.json({ data: announcement }, { status: 201 })
}
