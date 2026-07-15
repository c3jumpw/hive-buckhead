/**
 * src/lib/integrations/sendgrid.ts
 * =============================================================================
 * SendGrid email integration — every outbound transactional email in the app
 * goes through this module. Verified sender: reservations@thehivebuckhead.com
 * (domain em8148.thehivebuckhead.com, verified in SendGrid).
 *
 * Email inventory (who gets what, and when):
 *   sendReservationReceived   — guest, immediately on public RSVP submission
 *   sendReservationConfirmation — guest, when staff move status to CONFIRMED
 *   sendCancellationEmail     — guest, on cancellation
 *   sendOnboardingReceived    — new hire, immediately on onboarding submission
 *   sendOnboardingApproved    — new hire, when admin approves their onboarding
 *   sendAdminOnboardingAlert  — all active OWNER/MANAGER staff, on new submission
 *   sendStaffBlast            — arbitrary announcement to a list of staff emails
 *
 * BUG HISTORY (2026-07-15): sendOnboardingWelcome previously fired at
 * SUBMISSION time but both promised portal access immediately and never
 * distinguished "received, pending review" from "approved, you're in." That
 * function has been split into sendOnboardingReceived (submission — no
 * portal link, since the account isn't active yet) and sendOnboardingApproved
 * (approval — includes employee ID and portal link, since access is now real).
 * =============================================================================
 */

import sgMail from "@sendgrid/mail"
import { SENDGRID_CONFIG } from "@/lib/config"
import { getEffectiveSendgridKey } from "@/lib/integrations/settings-override"

// Deferred init — a missing key must never crash the build, only fail sends.
//
// REVISION (2026-07-15): now async and re-checks the effective key (DB
// override from Admin → Settings → Integration Settings, falling back to
// SENDGRID_API_KEY) every call instead of caching a boolean forever — a key
// entered or corrected in the admin UI needs to take effect without a
// redeploy, which a one-time "initialized" flag would have prevented.
let cachedKey: string | null = null
async function ensureInitialized(): Promise<boolean> {
  const key = await getEffectiveSendgridKey()
  if (!key) {
    console.error("[SendGrid] No API key configured (checked AppSettings override and SENDGRID_API_KEY) — email sending disabled")
    return false
  }
  if (key !== cachedKey) {
    sgMail.setApiKey(key)
    cachedKey = key
  }
  return true
}

type EmailResult = { success: boolean; messageId?: string; error?: string }

// =============================================================================
// RESERVATION EMAILS
// =============================================================================

/**
 * Sent immediately when a guest submits the public RSVP form.
 * Distinct from sendReservationConfirmation — this is NOT a confirmation,
 * it's an acknowledgment that the request was received and is pending
 * staff review. Wording matters here: promising "confirmed" before a human
 * has actually looked at availability would be misleading.
 */
export async function sendReservationReceived(
  to: string,
  data: { firstName: string; date: string; time: string; partySize: number; rsvpCode: string }
): Promise<EmailResult> {
  if (!(await ensureInitialized())) return { success: false, error: "SendGrid not configured" }
  try {
    const [res] = await sgMail.send({
      to, from: { email: SENDGRID_CONFIG.fromEmail, name: SENDGRID_CONFIG.fromName },
      subject: `We received your reservation request — Hive Buckhead`,
      html: receivedHtml(data),
      text: `HIVE BUCKHEAD — We received your request for ${data.date} at ${data.time}, party of ${data.partySize}. Ref: ${data.rsvpCode}. Our team will confirm within 2 hours during business hours.`,
    })
    return { success: true, messageId: res.headers["x-message-id"] as string }
  } catch (e: any) {
    console.error("[SendGrid] received-notice failed:", e?.response?.body ?? e)
    return { success: false, error: String(e) }
  }
}

/** Send reservation confirmation to guest — fires when staff set status to CONFIRMED */
export async function sendReservationConfirmation(
  to: string,
  data: { firstName: string; date: string; time: string; partySize: number; rsvpCode: string; section?: string }
): Promise<EmailResult> {
  if (!(await ensureInitialized())) return { success: false, error: "SendGrid not configured" }
  try {
    const [res] = await sgMail.send({
      to, from: { email: SENDGRID_CONFIG.fromEmail, name: SENDGRID_CONFIG.fromName },
      subject: `Your reservation is confirmed — ${data.date} at ${data.time}`,
      html: confirmHtml(data),
      text: `HIVE BUCKHEAD — Your reservation on ${data.date} at ${data.time} for ${data.partySize} guests is confirmed. Ref: ${data.rsvpCode}`,
    })
    return { success: true, messageId: res.headers["x-message-id"] as string }
  } catch (e: any) {
    console.error("[SendGrid] confirmation failed:", e?.response?.body ?? e)
    return { success: false, error: String(e) }
  }
}

/** Send cancellation notice to guest */
export async function sendCancellationEmail(
  to: string,
  data: { firstName: string; rsvpCode: string; date: string }
): Promise<EmailResult> {
  if (!(await ensureInitialized())) return { success: false, error: "SendGrid not configured" }
  try {
    const [res] = await sgMail.send({
      to, from: { email: SENDGRID_CONFIG.fromEmail, name: SENDGRID_CONFIG.fromName },
      subject: `Reservation cancelled — Hive Buckhead`,
      html: `<p>Hi ${data.firstName}, your reservation on ${data.date} (Ref: ${data.rsvpCode}) has been cancelled. We hope to see you soon.</p>`,
      text: `Hi ${data.firstName}, your reservation on ${data.date} (Ref: ${data.rsvpCode}) has been cancelled.`,
    })
    return { success: true, messageId: res.headers["x-message-id"] as string }
  } catch (e: any) {
    console.error("[SendGrid] cancellation failed:", e?.response?.body ?? e)
    return { success: false, error: String(e) }
  }
}

/**
 * Free-form, staff-composed email to a guest — used by the "Message Guest"
 * panel on a reservation's detail view (any template, or free text).
 * Mirrors sendCustomSms() in quo.ts: same EmailResult shape, same pattern
 * of returning `{ success: false, error }` instead of throwing, so callers
 * can log the *real* failure reason via logEmailAttempt() rather than a
 * generic 500.
 */
export async function sendCustomEmail(
  to: string,
  data: { subject: string; body: string }
): Promise<EmailResult> {
  if (!(await ensureInitialized())) return { success: false, error: "SendGrid not configured" }
  try {
    const [res] = await sgMail.send({
      to, from: { email: SENDGRID_CONFIG.fromEmail, name: SENDGRID_CONFIG.fromName },
      subject: data.subject,
      text: data.body,
      html: `<div style="font-family:Georgia,serif;white-space:pre-line;">${data.body}</div>`,
    })
    return { success: true, messageId: res.headers["x-message-id"] as string }
  } catch (e: any) {
    // SendGrid's error body is where the actually-useful detail lives —
    // "sender identity not verified," "invalid API key," etc. Surface it
    // instead of just logging it, so the caller can show the real reason
    // in the UI (Recent Sends panel) instead of a flat "failed."
    const detail = e?.response?.body?.errors?.map((x: any) => x.message).join("; ") || e?.message || String(e)
    console.error("[SendGrid] custom message failed:", e?.response?.body ?? e)
    return { success: false, error: detail }
  }
}

// =============================================================================
// ONBOARDING EMAILS
// =============================================================================

/**
 * Sent immediately when a new hire completes the onboarding form.
 * Explicitly does NOT mention the staff portal or any login link — the
 * account is not active yet (approvalStatus: PENDING, active: false) and
 * won't be until an admin reviews and approves it. Overpromising access
 * here would just generate confused "why can't I log in" messages.
 */
export async function sendOnboardingReceived(
  to: string,
  data: { name: string }
): Promise<EmailResult> {
  if (!(await ensureInitialized())) return { success: false, error: "SendGrid not configured" }
  try {
    const [res] = await sgMail.send({
      to, from: { email: SENDGRID_CONFIG.fromEmail, name: SENDGRID_CONFIG.fromName },
      subject: `Thanks for completing onboarding, ${data.name}!`,
      html: `<div style="font-family:Georgia,serif;max-width:540px;margin:0 auto;">
        <h2 style="color:#C9A96E;">Onboarding Received</h2>
        <p>Hi ${data.name},</p>
        <p>Thank you for completing your onboarding paperwork. Your information has been submitted and your manager has been notified.</p>
        <p><strong>You'll receive a follow-up email once your account is approved</strong> — this is usually quick, but can take a little time depending on scheduling.</p>
        <p style="color:#888;font-size:12px;">— Hive Restaurant Buckhead, LLC</p>
      </div>`,
      text: `Hi ${data.name}, thanks for completing onboarding! Your manager has been notified. You'll receive a follow-up email once your account is approved.`,
    })
    return { success: true, messageId: res.headers["x-message-id"] as string }
  } catch (e: any) {
    console.error("[SendGrid] onboarding-received failed:", e?.response?.body ?? e)
    return { success: false, error: String(e) }
  }
}

/**
 * Sent when an admin approves a pending onboarding submission.
 * Includes the employee ID (team ID) and a direct link to the staff portal.
 *
 * SECURITY NOTE: this intentionally does NOT include the staff member's PIN.
 * PINs are stored bcrypt-hashed and the plaintext value is never persisted
 * anywhere after the onboarding form submits — there is nothing to email.
 * Sending a credential in plaintext email is a real security risk (email is
 * not an encrypted channel, and inboxes get compromised), so this reminds
 * the new hire to use the PIN they set during onboarding rather than
 * repeating it back to them.
 */
export async function sendOnboardingApproved(
  to: string,
  data: { name: string; teamId: string; portalUrl: string }
): Promise<EmailResult> {
  if (!(await ensureInitialized())) return { success: false, error: "SendGrid not configured" }
  try {
    const [res] = await sgMail.send({
      to, from: { email: SENDGRID_CONFIG.fromEmail, name: SENDGRID_CONFIG.fromName },
      subject: `You're approved! Welcome to Hive Buckhead, ${data.name}`,
      html: `<div style="font-family:Georgia,serif;max-width:540px;margin:0 auto;background:#faf9f7;padding:32px;border-radius:8px;">
        <h1 style="color:#C9A96E;font-size:24px;">Welcome to the Team!</h1>
        <p>Hi ${data.name},</p>
        <p>Great news — your onboarding has been approved and your account is now active.</p>
        <div style="background:#fff;border:1px solid #e0d5c0;border-radius:6px;padding:16px;margin:20px 0;">
          <p style="margin:0 0 6px;font-size:13px;color:#888;">Your Employee ID</p>
          <p style="margin:0;font-size:20px;font-weight:bold;color:#C9A96E;font-family:monospace;">${data.teamId}</p>
        </div>
        <p>Log in to the staff portal using your Employee ID and the 4-digit PIN you created during onboarding:</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${data.portalUrl}" style="background:#C9A96E;color:#0E0C0A;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">Open Staff Portal</a>
        </div>
        <p style="font-size:12px;color:#888;">${data.portalUrl}</p>
        <p style="font-size:13px;">We're excited to have you on the team. See you soon!</p>
        <p style="color:#888;font-size:12px;">— Hive Restaurant Buckhead, LLC</p>
      </div>`,
      text: `Welcome to Hive Buckhead, ${data.name}! Your account is approved. Employee ID: ${data.teamId}. Log in at ${data.portalUrl} using the PIN you created during onboarding.`,
    })
    return { success: true, messageId: res.headers["x-message-id"] as string }
  } catch (e: any) {
    console.error("[SendGrid] onboarding-approved failed:", e?.response?.body ?? e)
    return { success: false, error: String(e) }
  }
}

/**
 * Generic admin notification — sent to all active OWNER/MANAGER staff.
 * Used for events an admin should know about but that don't need a
 * dedicated template: profile changes, feedback submissions, callouts.
 * Sent individually (not BCC) for the same privacy reason as sendStaffBlast.
 */
export async function sendAdminNotification(
  adminEmails: string[],
  subject: string,
  message: string
): Promise<{ sent: number; failed: number }> {
  if (!(await ensureInitialized())) return { sent: 0, failed: adminEmails.length }
  let sent = 0, failed = 0
  for (const email of adminEmails) {
    try {
      await sgMail.send({
        to: email, from: { email: SENDGRID_CONFIG.fromEmail, name: SENDGRID_CONFIG.fromName },
        subject,
        html: `<div style="font-family:Georgia,serif;max-width:480px;"><p style="white-space:pre-line;">${message}</p></div>`,
        text: message,
      })
      sent++
    } catch (e: any) {
      console.error(`[SendGrid] admin notification failed for ${email}:`, e?.response?.body ?? e)
      failed++
    }
  }
  return { sent, failed }
}

/** Notifies active admins (OWNER/MANAGER) that a new onboarding submission
 * needs review. Sent individually to each recipient, not BCC'd.
 */
export async function sendAdminOnboardingAlert(
  adminEmails: string[],
  data: { name: string; role: string }
): Promise<{ sent: number; failed: number }> {
  if (!(await ensureInitialized())) return { sent: 0, failed: adminEmails.length }
  let sent = 0, failed = 0
  for (const email of adminEmails) {
    try {
      await sgMail.send({
        to: email, from: { email: SENDGRID_CONFIG.fromEmail, name: SENDGRID_CONFIG.fromName },
        subject: `New onboarding submission awaiting approval: ${data.name}`,
        html: `<div style="font-family:Georgia,serif;max-width:480px;">
          <p><strong>${data.name}</strong> (${data.role}) has completed onboarding and is awaiting your approval.</p>
          <p>Review and approve at: <a href="https://hive-buckhead.vercel.app/admin?tab=team">Admin → Team Tools</a></p>
        </div>`,
        text: `${data.name} (${data.role}) has completed onboarding and is awaiting approval. Review at: /admin?tab=team`,
      })
      sent++
    } catch (e: any) {
      console.error(`[SendGrid] admin alert failed for ${email}:`, e?.response?.body ?? e)
      failed++
    }
  }
  return { sent, failed }
}

/** Message blast to multiple staff members — sent individually so no BCC exposure */
export async function sendStaffBlast(
  toEmails: string[], subject: string, message: string, fromName: string
): Promise<{ sent: number; failed: number }> {
  if (!(await ensureInitialized())) return { sent: 0, failed: toEmails.length }
  let sent = 0, failed = 0
  for (const email of toEmails) {
    try {
      await sgMail.send({
        to: email,
        from: { email: SENDGRID_CONFIG.fromEmail, name: `${fromName} — Hive Buckhead` },
        subject,
        html: `<div style="font-family:Georgia,serif;max-width:540px;"><p style="white-space:pre-line;">${message}</p><hr><p style="color:#888;font-size:12px;">Hive Restaurant Buckhead, LLC</p></div>`,
        text: `${subject}\n\n${message}\n\n— ${fromName}, Hive Buckhead`,
      })
      sent++
    } catch (e: any) {
      console.error(`[SendGrid] blast failed for ${email}:`, e?.response?.body ?? e)
      failed++
    }
  }
  return { sent, failed }
}

// =============================================================================
// HTML TEMPLATES
// =============================================================================

function receivedHtml(d: { firstName: string; date: string; time: string; partySize: number; rsvpCode: string }) {
  return `<div style="font-family:Georgia,serif;max-width:540px;margin:0 auto;">
    <div style="background:#0E0C0A;padding:20px;text-align:center;"><h1 style="color:#C9A96E;margin:0;">HIVE BUCKHEAD</h1></div>
    <div style="padding:28px;border:1px solid #e0d5c0;">
      <p>Hi <strong>${d.firstName}</strong>, we received your reservation request:</p>
      <table style="width:100%;"><tr><td style="color:#888;">Date</td><td><strong>${d.date}</strong></td></tr>
      <tr><td style="color:#888;">Time</td><td><strong>${d.time}</strong></td></tr>
      <tr><td style="color:#888;">Party</td><td><strong>${d.partySize} guests</strong></td></tr>
      <tr><td style="color:#888;">Ref #</td><td style="color:#C9A96E;font-family:monospace;"><strong>${d.rsvpCode}</strong></td></tr></table>
      <p style="font-size:13px;">Your request is <strong>pending confirmation</strong> — our team will follow up within 2 hours during business hours.</p>
      <p style="font-size:12px;color:#888;">Manage your request: <a href="https://reservations.thehivebuckhead.com/change">reservations.thehivebuckhead.com/change</a></p>
    </div>
  </div>`
}

function confirmHtml(d: { firstName: string; date: string; time: string; partySize: number; rsvpCode: string; section?: string }) {
  return `<div style="font-family:Georgia,serif;max-width:540px;margin:0 auto;">
    <div style="background:#0E0C0A;padding:20px;text-align:center;"><h1 style="color:#C9A96E;margin:0;">HIVE BUCKHEAD</h1></div>
    <div style="padding:28px;border:1px solid #e0d5c0;">
      <p>Hi <strong>${d.firstName}</strong>, your reservation is confirmed:</p>
      <table style="width:100%;"><tr><td style="color:#888;">Date</td><td><strong>${d.date}</strong></td></tr>
      <tr><td style="color:#888;">Time</td><td><strong>${d.time}</strong></td></tr>
      <tr><td style="color:#888;">Party</td><td><strong>${d.partySize} guests</strong></td></tr>
      <tr><td style="color:#888;">Ref #</td><td style="color:#C9A96E;font-family:monospace;"><strong>${d.rsvpCode}</strong></td></tr></table>
      <p style="font-size:12px;color:#888;">Modify or cancel: <a href="https://reservations.thehivebuckhead.com/change">reservations.thehivebuckhead.com/change</a></p>
    </div>
  </div>`
}
