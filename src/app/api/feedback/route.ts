/**
 * GET  — list feedback submissions (admin/manager only)
 * POST — submit feedback (any authenticated staff)
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession, requireAdmin } from "@/lib/auth/session"

export async function GET() {
  await requireAdmin()
  const feedback = await prisma.staffFeedback.findMany({ orderBy: { createdAt: "desc" }, take: 100 })
  return NextResponse.json({ data: feedback })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json()
  const { message, category, isAnonymous } = body
  if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 })
  const feedback = await prisma.staffFeedback.create({
    data: {
      staffId: isAnonymous ? null : session.id,
      staffName: isAnonymous ? null : session.name,
      category: category || "general",
      message, isAnonymous: isAnonymous || false,
    },
  })
  return NextResponse.json({ data: feedback }, { status: 201 })
}
