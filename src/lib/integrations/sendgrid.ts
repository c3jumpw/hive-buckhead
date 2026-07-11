/**
 * src/lib/integrations/sendgrid.ts
 * SendGrid email integration — all outbound emails go through this module.
 * Verified sender: reservations@thehivebuckhead.com (em8148.thehivebuckhead.com verified)
 */

import sgMail from "@sendgrid/mail"
import { SENDGRID_CONFIG } from "@/lib/config"

// Initialize SDK — runs once per server process
sgMail.setApiKey(SENDGRID_CONFIG.apiKey)

type EmailResult = { success: boolean; messageId?: string; error?: string }

/** Send reservation confirmation to guest */
export async function sendReservationConfirmation(
  to: string,
  data: { firstName: string; date: string; time: string; partySize: number; rsvpCode: string; section?: string }
): Promise<EmailResult> {
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

/** Onboarding welcome email — does NOT include access code (given verbally by admin) */
export async function sendOnboardingWelcome(
  to: string,
  data: { name: string; portalUrl: string; startDate?: string }
): Promise<EmailResult> {
  try {
    const [res] = await sgMail.send({
      to, from: { email: SENDGRID_CONFIG.fromEmail, name: SENDGRID_CONFIG.fromName },
      subject: `Welcome to Hive Buckhead, ${data.name}!`,
      html: `<div style="font-family:Georgia,serif;max-width:540px;margin:0 auto;">
        <h2 style="color:#C9A96E;">Welcome to the Team</h2>
        <p>Hi ${data.name}, your manager will give you a one-time access code to complete onboarding at:</p>
        <p><a href="${data.portalUrl}">${data.portalUrl}</a></p>
        ${data.startDate ? `<p>Start date: <strong>${data.startDate}</strong></p>` : ""}
        <p style="color:#888;font-size:12px;">— Hive Restaurant Buckhead, LLC</p>
      </div>`,
      text: `Welcome ${data.name}! Complete onboarding at ${data.portalUrl}. Your manager has your access code.`,
    })
    return { success: true, messageId: res.headers["x-message-id"] as string }
  } catch (e: any) {
    console.error("[SendGrid] onboarding welcome failed:", e?.response?.body ?? e)
    return { success: false, error: String(e) }
  }
}

/** Message blast to multiple staff members — sent individually so no BCC exposure */
export async function sendStaffBlast(
  toEmails: string[], subject: string, message: string, fromName: string
): Promise<{ sent: number; failed: number }> {
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

/** HTML template for reservation confirmations */
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
