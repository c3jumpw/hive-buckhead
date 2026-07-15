/**
 * src/app/api/settings/integrations/route.ts
 * =============================================================================
 * GET  — masked status of each editable integration credential: is a value
 *        active at all, and if so did it come from the admin override in
 *        AppSettings or the env var in Vercel. Never returns a usable key.
 * PATCH — set (or clear) one credential's admin override. Requires
 *        OWNER/MANAGER and the caller's own current PIN, per the
 *        "changing configuration settings should have a reconfirmation of
 *        the passcode" requirement — same verifyStaffPin() check already
 *        used by /api/staff-portal/profile for PIN/email/phone changes.
 *
 * Google Sheets and the database connection are intentionally NOT editable
 * here — those are a multi-line service-account key and a connection
 * string, not a single token, and are still managed directly in Vercel's
 * env vars. This route covers the three integrations that are a single API
 * key: SendGrid, Quo, Systeme.io.
 * =============================================================================
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession, verifyStaffPin } from "@/lib/auth/session"
import { invalidateOverrideCache } from "@/lib/integrations/settings-override"

type Key = "sendgrid" | "quo" | "systeme"
const FIELD: Record<Key, "sendgridApiKeyOverride" | "quoApiKeyOverride" | "systemeApiKeyOverride"> = {
  sendgrid: "sendgridApiKeyOverride",
  quo: "quoApiKeyOverride",
  systeme: "systemeApiKeyOverride",
}
const ENV_VAR: Record<Key, string | undefined> = {
  sendgrid: process.env.SENDGRID_API_KEY,
  quo: process.env.QUO_API_KEY,
  systeme: process.env.SYSTEME_IO_API_KEY,
}

function mask(value: string): string {
  const tail = value.slice(-4)
  return `•••••••••• ${tail}`
}

async function requireAdminSession() {
  const session = await getSession()
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const
  if (session.accessLevel === "STAFF") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const
  }
  return { session } as const
}

export async function GET() {
  const auth = await requireAdminSession()
  if ("error" in auth) return auth.error

  const row = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
    select: { sendgridApiKeyOverride: true, quoApiKeyOverride: true, systemeApiKeyOverride: true },
  })

  const data: Record<Key, { configured: boolean; source: "override" | "env" | "none"; masked: string | null }> = {} as any
  for (const key of Object.keys(FIELD) as Key[]) {
    const override = row?.[FIELD[key]] ?? null
    const envVal = ENV_VAR[key] ?? null
    const active = override || envVal || null
    data[key] = {
      configured: !!active,
      source: override ? "override" : envVal ? "env" : "none",
      masked: active ? mask(active) : null,
    }
  }
  return NextResponse.json({ data })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminSession()
  if ("error" in auth) return auth.error
  const { session } = auth

  const { integration, apiKey, currentPin } = await request.json()
  if (!integration || !(integration in FIELD)) {
    return NextResponse.json({ error: "integration must be one of: sendgrid, quo, systeme" }, { status: 400 })
  }
  if (typeof apiKey !== "string") {
    return NextResponse.json({ error: "apiKey is required (send an empty string to clear the override)" }, { status: 400 })
  }
  if (!currentPin) return NextResponse.json({ error: "Current PIN required" }, { status: 400 })

  const verified = await verifyStaffPin(session.id, String(currentPin))
  if (!verified) return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 })

  const field = FIELD[integration as Key]
  const trimmed = apiKey.trim()
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: { [field]: trimmed || null },
    create: { id: "singleton", [field]: trimmed || null },
  })
  invalidateOverrideCache()

  // Master edit log entry — reservationId left null; this is a system-level
  // change, not tied to any one reservation. staffId records who did it.
  await prisma.activityLog.create({
    data: {
      staffId: session.id,
      type: "integration_settings_changed",
      description: trimmed
        ? `${session.name} updated the ${integration} API key`
        : `${session.name} cleared the ${integration} API key override (now using the Vercel env var)`,
    },
  }).catch((e: unknown) => console.error("[settings/integrations] activity log write failed:", e))

  return NextResponse.json({
    data: { configured: !!trimmed, source: trimmed ? "override" : (ENV_VAR[integration as Key] ? "env" : "none"), masked: trimmed ? mask(trimmed) : null },
  })
}
