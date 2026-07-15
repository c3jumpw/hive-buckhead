import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"

// Non-secret fields only. AppSettings also holds sendgridApiKeyOverride /
// quoApiKeyOverride / systemeApiKeyOverride (2026-07-16 addition) — those
// are deliberately excluded here on both GET and PATCH. GET has no auth
// check at all, so returning them here would leak API keys to anyone with
// a session; and PATCH here has no passcode confirmation, so accepting them
// here would let someone change a credential without the reconfirmation
// step. Both are only reachable through /api/settings/integrations, which
// enforces OWNER/MANAGER + current-PIN on every write.
const SAFE_FIELDS = {
  id: true, maxPartySize: true, bookingWindowDays: true, autoConfirm: true,
  restaurantName: true, restaurantPhone: true, restaurantEmail: true, rsvpFormUrl: true,
  updatedAt: true,
} as const

export async function GET() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" }, select: SAFE_FIELDS })
  return NextResponse.json({ data: settings ?? {} })
}

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session || (session.accessLevel !== "OWNER" && session.accessLevel !== "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await request.json()
  const allowedKeys = Object.keys(SAFE_FIELDS).filter(k => k !== "id" && k !== "updatedAt")
  const safeBody = Object.fromEntries(Object.entries(body).filter(([k]) => allowedKeys.includes(k)))
  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: safeBody,
    create: { id: "singleton", ...safeBody },
    select: SAFE_FIELDS,
  })
  return NextResponse.json({ data: settings })
}
