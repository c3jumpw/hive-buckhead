/**
 * src/app/api/diagnostics/route.ts
 * =============================================================================
 * GET — reports which external integrations have credentials configured in
 * the current environment. Admin/manager only.
 *
 * This does NOT make live API calls to each service (avoids burning Quo
 * API credits or SendGrid quota just to check a status page) — it only
 * confirms whether the required environment variable(s) are present and
 * non-empty. A "configured: true" here means the app CAN attempt to use
 * that integration; it does not guarantee the credential is valid, the
 * SendGrid domain is verified, or the Quo account has API credits — those
 * still require an actual send to fully confirm.
 *
 * Built 2026-07-15 directly in response to a real "no email/SMS arrived"
 * report where the root cause turned out to be missing Vercel environment
 * variables rather than a code bug — this panel exists so that
 * distinction is visible in 5 seconds instead of requiring a live test
 * and log-diving every time.
 * =============================================================================
 */
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/session"

export async function GET() {
  await requireAdmin()

  const checks = {
    sendgrid: {
      configured: Boolean(process.env.SENDGRID_API_KEY),
      detail: process.env.SENDGRID_API_KEY ? "SENDGRID_API_KEY is set" : "SENDGRID_API_KEY is missing — emails cannot send",
    },
    quo: {
      configured: Boolean(process.env.QUO_API_KEY),
      detail: process.env.QUO_API_KEY ? "QUO_API_KEY is set" : "QUO_API_KEY is missing — texts cannot send",
    },
    systemeIo: {
      configured: Boolean(process.env.SYSTEME_IO_API_KEY),
      detail: process.env.SYSTEME_IO_API_KEY ? "SYSTEME_IO_API_KEY is set" : "SYSTEME_IO_API_KEY is missing — CRM sync disabled",
    },
    googleSheets: {
      configured: Boolean(process.env.GOOGLE_PRIVATE_KEY),
      detail: process.env.GOOGLE_PRIVATE_KEY ? "GOOGLE_PRIVATE_KEY is set" : "GOOGLE_PRIVATE_KEY is missing — sheet logging disabled",
    },
    database: {
      configured: Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL),
      detail: (process.env.DATABASE_URL && process.env.DIRECT_URL) ? "DATABASE_URL and DIRECT_URL are set" : "Database URLs missing",
    },
  }

  return NextResponse.json({ data: checks })
}
