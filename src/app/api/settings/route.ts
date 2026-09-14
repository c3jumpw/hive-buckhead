import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"

export async function GET() {
  // Settings are public-readable for the RSVP form to check mode
  // But we never expose integration key overrides to clients
  try {
    const settings = await prisma.appSettings.findUnique({ 
      where: { id: "singleton" },
      select: {
        maxPartySize: true,
        bookingWindowDays: true,
        autoConfirm: true,
        restaurantName: true,
        restaurantPhone: true,
        restaurantEmail: true,
        rsvpFormUrl: true,
        rsvpMode: true,
        rsvpFallbackMessage: true,
        // Never expose raw keys — send masked versions only
        sendgridApiKeyOverride: false,
        quoApiKeyOverride: false,
        systemeApiKeyOverride: false,
      }
    })
    return NextResponse.json({ data: settings ?? {} })
  } catch {
    // rsvpMode columns may not exist yet (pre-migration) — return safe defaults
    try {
      const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safe = { ...(settings as any) }
      delete safe.sendgridApiKeyOverride
      delete safe.quoApiKeyOverride
      delete safe.systemeApiKeyOverride
      return NextResponse.json({ data: safe ?? {} })
    } catch {
      return NextResponse.json({ data: {} })
    }
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session || (session.accessLevel !== "OWNER" && session.accessLevel !== "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await request.json()
  // Strip keys that should never be updated via this endpoint
  // (integration keys go through /api/settings/integrations)
  const { sendgridApiKeyOverride, quoApiKeyOverride, systemeApiKeyOverride, ...safeBody } = body
  void sendgridApiKeyOverride; void quoApiKeyOverride; void systemeApiKeyOverride

  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: safeBody,
    create: { id: "singleton", ...safeBody },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safe = { ...(settings as any) }
  delete safe.sendgridApiKeyOverride
  delete safe.quoApiKeyOverride
  delete safe.systemeApiKeyOverride
  return NextResponse.json({ data: safe })
}
