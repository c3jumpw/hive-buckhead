/**
 * src/lib/integrations/quo.ts
 * =============================================================================
 * Quo SMS integration — sends text message confirmations to guests.
 *
 * REVISION HISTORY:
 *   2026-07-15 v1: built as src/lib/integrations/twilio.ts, using Twilio's
 *     REST API. Never deployed with real credentials.
 *   2026-07-15 v2 (this file): user clarified texts go through Quo, not
 *     Twilio — Quo is the same platform already referenced elsewhere in
 *     this codebase (customer messaging inbox link, QUO_CONFIG in
 *     src/lib/config.ts) which was previously believed to be link-only
 *     (no confirmed send API). Quo is OpenPhone's current brand name
 *     (rebranded late 2024) — "OpenPhone" and "Quo" are the same company/
 *     account, not two separate services. twilio.ts deleted; this file
 *     replaces it using Quo's actual REST API (verified against their
 *     current docs at quo.com/docs, api base api.quo.com/v1).
 *
 * IMPORTANT — Quo API credits: sending via the Quo API consumes prepaid
 * API credits, separate from a normal Quo texting/calling plan. If sends
 * start failing with a credits/payment-related error, that's the cause —
 * purchase API credits in the Quo dashboard, this is not a bug in this code.
 *
 * Endpoint: POST https://api.quo.com/v1/messages
 * Auth: Authorization header set to the raw API key (no "Bearer" prefix —
 *   confirmed against Quo's official docs example).
 * =============================================================================
 */

import { QUO_CONFIG } from "@/lib/config"
import { getEffectiveQuoKey } from "@/lib/integrations/settings-override"

type SmsResult = { success: boolean; id?: string; error?: string }

/**
 * Sends a single SMS via the Quo REST API.
 * @param to - Recipient phone number. Accepts a bare 10-digit US number
 *   (as stored on Reservation.phone) or full E.164 — normalizes to E.164
 *   with a +1 country code assumption, since all current guest/staff phone
 *   numbers in this system are US-based.
 * @param body - Message text content
 */
async function sendSms(to: string, body: string): Promise<SmsResult> {
  const apiKey = await getEffectiveQuoKey()
  if (!apiKey) {
    console.error("[Quo] No API key configured (checked AppSettings override and QUO_API_KEY) — SMS sending disabled")
    return { success: false, error: "SMS not configured" }
  }
  if (!QUO_CONFIG.fromNumber) {
    console.error("[Quo] No sending phone number configured")
    return { success: false, error: "SMS sender number not configured" }
  }

  const digits = to.replace(/\D/g, "")
  const toE164 = to.startsWith("+") ? to : `+1${digits}`

  try {
    const res = await fetch("https://api.quo.com/v1/messages", {
      method: "POST",
      headers: {
        "Authorization": apiKey,  // raw key, no "Bearer" prefix — per Quo's docs
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: body,
        from: QUO_CONFIG.fromNumber,
        to: [toE164],
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      console.error("[Quo] send failed:", json)
      return { success: false, error: json?.message ?? json?.error ?? "Quo API error" }
    }
    return { success: true, id: json?.data?.id ?? json?.id }
  } catch (e: unknown) {
    console.error("[Quo] network error:", e)
    return { success: false, error: String(e) }
  }
}

/** SMS sent immediately on public RSVP submission — mirrors sendReservationReceived's email */
export async function sendReservationReceivedSms(
  to: string,
  data: { firstName: string; date: string; time: string; rsvpCode: string }
): Promise<SmsResult> {
  return sendSms(to,
    `Hive Buckhead: Hi ${data.firstName}, we received your request for ${data.date} at ${data.time}. Ref: ${data.rsvpCode}. We'll confirm within 2 hrs during business hours.`
  )
}

/** SMS sent when staff confirm a reservation — mirrors sendReservationConfirmation's email */
export async function sendReservationConfirmationSms(
  to: string,
  data: { firstName: string; date: string; time: string; partySize: number; rsvpCode: string }
): Promise<SmsResult> {
  return sendSms(to,
    `Hive Buckhead: Confirmed! ${data.date} at ${data.time}, party of ${data.partySize}. Ref: ${data.rsvpCode}. See you soon!`
  )
}

/** SMS sent on cancellation — mirrors sendCancellationEmail */
export async function sendCancellationSms(
  to: string,
  data: { firstName: string; rsvpCode: string; date: string }
): Promise<SmsResult> {
  return sendSms(to,
    `Hive Buckhead: Hi ${data.firstName}, your reservation on ${data.date} (Ref: ${data.rsvpCode}) has been cancelled. We hope to see you soon.`
  )
}

/** Sends an arbitrary, staff-composed message — used by the reservation quick-send buttons */
export async function sendCustomSms(to: string, body: string): Promise<SmsResult> {
  return sendSms(to, body)
}
