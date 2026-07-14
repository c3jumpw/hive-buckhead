// Activity logger stub
export async function logActivity(..._args: any[]) {
  // Implemented via prisma.activityLog.create directly in routes
}

/**
 * Fetches email addresses for all active OWNER/MANAGER staff.
 * Shared helper — used by every "notify admins" call site (onboarding
 * submissions, profile changes, feedback, callouts) to avoid duplicating
 * the same query in four different route files.
 */
export async function getAdminEmails(): Promise<string[]> {
  const { prisma } = await import("@/lib/db/prisma")
  const admins = await prisma.staff.findMany({
    where: { active: true, accessLevel: { in: ["OWNER", "MANAGER"] } },
    select: { email: true },
  })
  return admins.map((a: { email: string }) => a.email)
}

/**
 * Wraps a fire-and-forget email/SMS send with a MessageLog entry recording
 * the actual outcome.
 *
 * BUG HISTORY (2026-07-15): background sends (RSVP-received, onboarding-
 * received/approved, admin alerts) used `.catch(err => console.error(...))`
 * on functions that NEVER THROW — sendReservationReceived, sendOnboarding-
 * Received, etc. all catch their own SendGrid errors internally and return
 * `{ success: false, error }` as a normal resolved value, not a rejected
 * promise. This means `.catch()` was dead code for the most common failure
 * mode (SendGrid rejecting a send — unverified sender, invalid recipient,
 * rate limit) — the ONLY trace was a server-side console.error the admin
 * has no way to see. This wrapper actually inspects the result and writes
 * a permanent, database-visible MessageLog row either way, so failures
 * are diagnosable from the app itself instead of requiring raw Vercel log
 * access nobody but Claude currently has.
 *
 * @param sendFn - the actual send call (e.g. sendReservationReceived(...))
 * @param meta - context for the log row
 */
export async function logEmailAttempt(
  sendFn: Promise<{ success: boolean; messageId?: string; error?: string }>,
  meta: { channel: "EMAIL" | "SMS"; recipient: string; subject: string; reservationId?: string }
): Promise<void> {
  const { prisma } = await import("@/lib/db/prisma")
  try {
    const result = await sendFn
    await prisma.messageLog.create({
      data: {
        channel: meta.channel, recipient: meta.recipient, subject: meta.subject,
        body: result.success ? "Sent successfully" : (result.error ?? "Unknown error"),
        status: result.success ? "SENT" : "FAILED",
        sentAt: new Date(),
        externalId: result.messageId ?? null,
        reservationId: meta.reservationId ?? null,
      },
    })
    if (!result.success) {
      console.error(`[logEmailAttempt] ${meta.channel} to ${meta.recipient} failed:`, result.error)
    }
  } catch (err) {
    // The send function itself is not expected to throw, but if something
    // upstream does (e.g. a network-level failure before SendGrid's own
    // try/catch could run), still record it rather than losing the trace.
    console.error(`[logEmailAttempt] unexpected error sending to ${meta.recipient}:`, err)
    await prisma.messageLog.create({
      data: {
        channel: meta.channel, recipient: meta.recipient, subject: meta.subject,
        body: String(err), status: "FAILED", sentAt: new Date(),
        reservationId: meta.reservationId ?? null,
      },
    }).catch(() => {})
  }
}
