/**
 * src/app/api/message-logs/route.ts
 * GET — recent message send attempts (admin/manager only), most recent first.
 * Built 2026-07-15 alongside logEmailAttempt so send failures are visible
 * from the admin dashboard instead of requiring raw Vercel log access.
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAdmin } from "@/lib/auth/session"

export async function GET() {
  await requireAdmin()
  const logs = await prisma.messageLog.findMany({
    orderBy: { sentAt: "desc" },
    take: 30,
  })
  return NextResponse.json({ data: logs })
}
