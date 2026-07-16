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
 * Records a system-level admin action — staff created/edited/offboarded,
 * onboarding approved/rejected, settings changed, etc. reservationId is
 * always null here (see logEmailAttempt above for the reservation-scoped
 * equivalent). This is the single write path behind the master admin edit
 * log (Settings → Admin Activity Log) added 2026-07-16 — every call site
 * below funnels through here so the log has one consistent shape instead
 * of each route hand-rolling its own prisma.activityLog.create().
 */
export async function logAdminAction(params: {
  staffId: string
  type: string
  description: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const { prisma } = await import("@/lib/db/prisma")
  await prisma.activityLog.create({
    data: {
      reservationId: null,
      staffId: params.staffId,
      type: params.type,
      description: params.description,
      metadata: params.metadata ? (params.metadata as any) : undefined,
    },
  }).catch((e: unknown) => console.error(`[logAdminAction] failed to log "${params.type}":`, e))
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
  meta: {
    channel: "EMAIL" | "SMS"; recipient: string; subject: string; reservationId?: string
    // Optional — added for manual staff-composed sends (Message Guest panel),
    // which need to know WHO sent it and want the actual message text kept
    // on success, not just "Sent successfully." System-triggered sends
    // (confirmations, onboarding emails) don't pass these and keep the
    // original behavior exactly as before.
    staffId?: string; body?: string
    // 2026-07-16 addition — needed to write a readable ActivityLog entry
    // (see below). Only meaningful alongside staffId; system-triggered
    // sends have neither.
    staffName?: string
  }
): Promise<void> {
  const { prisma } = await import("@/lib/db/prisma")
  let outcome: { success: boolean; messageId?: string; error?: string } | null = null
  try {
    const result = await sendFn
    outcome = result
    await prisma.messageLog.create({
      data: {
        channel: meta.channel, recipient: meta.recipient, subject: meta.subject,
        body: result.success ? (meta.body ?? "Sent successfully") : (result.error ?? "Unknown error"),
        status: result.success ? "SENT" : "FAILED",
        sentAt: new Date(),
        externalId: result.messageId ?? null,
        reservationId: meta.reservationId ?? null,
        staffId: meta.staffId ?? null,
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
    outcome = { success: false, error: String(err) }
    await prisma.messageLog.create({
      data: {
        channel: meta.channel, recipient: meta.recipient, subject: meta.subject,
        body: String(err), status: "FAILED", sentAt: new Date(),
        reservationId: meta.reservationId ?? null,
        staffId: meta.staffId ?? null,
      },
    }).catch(() => {})
  }

  // 2026-07-16 addition — mirror the outcome onto the reservation's own
  // Activity timeline (reservation-detail-panel.tsx reads ActivityLog, not
  // MessageLog, so without this a sent/failed message was invisible there
  // even though it showed up in the admin-wide Recent Sends panel).
  if (meta.reservationId && outcome) {
    const channelLabel = meta.channel === "EMAIL" ? "Email" : "Text"
    const who = meta.staffName ? ` by ${meta.staffName}` : ""
    await prisma.activityLog.create({
      data: {
        reservationId: meta.reservationId,
        staffId: meta.staffId ?? null,
        type: outcome.success ? "message_sent" : "message_failed",
        description: outcome.success
          ? `${channelLabel} sent to guest${who}`
          : `${channelLabel} failed to send${who}: ${outcome.error ?? "Unknown error"}`,
      },
    }).catch((e: unknown) => console.error("[logEmailAttempt] activity log write failed:", e))
  }
}
