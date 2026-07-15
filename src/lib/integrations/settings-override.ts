/**
 * src/lib/integrations/settings-override.ts
 * =============================================================================
 * Resolves the *effective* API key for each external integration: an
 * admin-entered value in Admin → Settings → Integration Settings, falling
 * back to the env var set in Vercel if nothing's been entered in the UI.
 *
 * Why this exists: SENDGRID_CONFIG.apiKey / QUO_CONFIG.apiKey / etc. in
 * src/lib/config.ts are synchronous getters that only ever read
 * process.env — by design, since most of config.ts is imported in places
 * that can't easily go async. Editing a key from the admin UI requires a DB
 * read, which is async, so rather than turning every getter in config.ts
 * async (and chasing `await` through every call site that touches
 * SENDGRID_CONFIG/QUO_CONFIG/SYSTEME_CONFIG), this module is the ONE place
 * that layers the DB override on top. Only the three integration modules
 * (sendgrid.ts, quo.ts, systeme.ts) call into this — everything else in the
 * app is unaffected.
 *
 * Resolution order: AppSettings.<x>Override (if set and non-empty) → env var.
 *
 * Cached for 30s per server instance so a burst of sends (e.g. a message
 * blast) doesn't hit the DB once per message. A saved change in the admin
 * UI can take up to 30s to apply to in-flight serverless instances — fine
 * for credentials, which don't need to propagate instantly.
 * =============================================================================
 */

import { prisma } from "@/lib/db/prisma"

type Overrides = {
  sendgridApiKeyOverride: string | null
  quoApiKeyOverride: string | null
  systemeApiKeyOverride: string | null
}

const EMPTY_OVERRIDES: Overrides = {
  sendgridApiKeyOverride: null,
  quoApiKeyOverride: null,
  systemeApiKeyOverride: null,
}

let cached: { data: Overrides; fetchedAt: number } | null = null
const CACHE_MS = 30_000

async function getOverrides(): Promise<Overrides> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) return cached.data
  try {
    const row = await prisma.appSettings.findUnique({
      where: { id: "singleton" },
      select: { sendgridApiKeyOverride: true, quoApiKeyOverride: true, systemeApiKeyOverride: true },
    })
    const data = row ?? EMPTY_OVERRIDES
    cached = { data, fetchedAt: Date.now() }
    return data
  } catch (e) {
    // DB unreachable — don't let a diagnostics/config problem take down
    // sends entirely. Fall back to env-only behavior for this call.
    console.error("[settings-override] failed to load AppSettings, falling back to env vars:", e)
    return EMPTY_OVERRIDES
  }
}

/** Clears the cache immediately after a save, so the next send picks up the new key without waiting out the TTL. */
export function invalidateOverrideCache() {
  cached = null
}

export async function getEffectiveSendgridKey(): Promise<string> {
  const o = await getOverrides()
  return o.sendgridApiKeyOverride || process.env.SENDGRID_API_KEY || ""
}

export async function getEffectiveQuoKey(): Promise<string | null> {
  const o = await getOverrides()
  return o.quoApiKeyOverride || process.env.QUO_API_KEY || null
}

export async function getEffectiveSystemeKey(): Promise<string> {
  const o = await getOverrides()
  return o.systemeApiKeyOverride || process.env.SYSTEME_IO_API_KEY || ""
}
