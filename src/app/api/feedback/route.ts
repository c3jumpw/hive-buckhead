/**
 * GET  — list feedback submissions (admin/manager only)
 * POST — submit feedback (any authenticated staff)
 *
 * Notifies admins by email on every submission (2026-07-15 addition) —
 * previously feedback only appeared in the in-app Feedback Inbox, meaning
 * an admin had to remember to check it. Feedback tagged "safety" is
 * exactly the kind of thing that shouldn't wait for someone to happen to
 * open the admin dashboard.
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession, requireAdmin } from "@/lib/auth/session"
import { sendAdminNotification } from "@/lib/integrations/sendgrid"
import { getAdminEmails } from "@/lib/db/activity-logger"

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

  // Non-blocking — feedback submission must never fail because the
  // notification email had a problem. Anonymous submissions still notify
  // admins (that's the point), just without revealing who sent it.
  getAdminEmails().then(emails => {
    if (emails.length > 0) {
      sendAdminNotification(
        emails,
        `New staff feedback (${category || "general"})`,
        `From: ${isAnonymous ? "Anonymous" : session.name}\nCategory: ${category || "general"}\n\n${message}`
      ).catch((err: unknown) => console.error("[Feedback] admin notification failed:", err))
    }
  }).catch((err: unknown) => console.error("[Feedback] failed to fetch admin emails:", err))

  return NextResponse.json({ data: feedback }, { status: 201 })
}
