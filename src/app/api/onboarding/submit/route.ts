/**
 * src/app/api/onboarding/submit/route.ts
 * =============================================================================
 * Final onboarding form submission handler.
 *
 * Flow:
 *   1. Verify onboarding portal session (access code was checked earlier)
 *   2. Validate both legal documents were acknowledged
 *   3. Generate a team ID (HB-001 format)
 *   4. Create Staff record — active:false, approvalStatus:PENDING (NOT
 *      immediately visible anywhere — see BUG HISTORY below)
 *   5. Create OnboardingRecord with signed-document timestamps
 *   6. Log the submission to the "Onboarding Log" Google Sheet (audit trail
 *      of all submissions, pending or not — distinct from the "Staff
 *      Records" sheet, which only gets the roster once approved)
 *   7. Send the new hire a "received, pending review" email — no portal
 *      link, since the account isn't active yet
 *   8. Notify all active OWNER/MANAGER staff that a submission needs review
 *
 * BUG HISTORY (2026-07-15): this route previously created Staff with no
 * explicit `active` value, which meant the Prisma schema default (`true`)
 * applied — every new hire was immediately live in staff lists, the login
 * dropdown, and dashboard counts, with zero admin review. It also called
 * logStaffToSheet() here (at submission), meaning unapproved staff were
 * already written into the "Staff Records" backup sheet before any human
 * had reviewed them. Both are fixed: active/approvalStatus now explicitly
 * gate visibility, and the Staff Records sheet write moved to the approval
 * route (src/app/api/onboarding/approve/route.ts).
 * =============================================================================
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { TEAM_ID_CONFIG } from "@/lib/config"
import { logOnboardingToSheet } from "@/lib/integrations/google-sheets"
import { sendOnboardingReceived, sendAdminOnboardingAlert } from "@/lib/integrations/sendgrid"
import { logEmailAttempt } from "@/lib/db/activity-logger"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  const session = request.cookies.get("hive-onboarding-session")
  if (session?.value !== "verified") {
    return NextResponse.json({ error: "Unauthorized — complete access code verification first" }, { status: 401 })
  }

  const body = await request.json()
  const { name, email, phone, role, pin, positionId, legalName, dateOfBirth, address,
          emergencyContact, emergencyPhone, startDate, tshirtSize,
          employmentSigned, codeOfConductSigned, signatureText, idDocumentPath } = body

  // Both legal documents must be acknowledged before a record can be created.
  // The client already gates this in the UI, but we re-verify server-side
  // since the client can't be trusted — this is the actual point at which
  // signing is legally recorded.
  if (!employmentSigned || !codeOfConductSigned) {
    return NextResponse.json({ error: "Both legal documents must be signed to complete onboarding" }, { status: 400 })
  }
  if (!signatureText || !String(signatureText).trim()) {
    return NextResponse.json({ error: "A digital signature is required to complete onboarding" }, { status: 400 })
  }
  if (!name || !email || !pin || pin.length < 4) {
    return NextResponse.json({ error: "Name, email, and 4-digit PIN required" }, { status: 400 })
  }

  /**
   * REHIRE HANDLING (2026-07-15 addition): previously, a former employee
   * re-onboarding with the same email they used before would hit a raw
   * Prisma P2002 unique-constraint error on Staff.email — surfaced to the
   * applicant as "An account with this email already exists," a dead end
   * with no path forward. That's correct for someone who already has a
   * live account, but wrong for a former staff member whose record was
   * deliberately deactivated via offboarding (employmentStatus:
   * TERMINATED) or a previously rejected application (approvalStatus:
   * REJECTED) — both are legitimate "start fresh" cases, not conflicts.
   *
   * If a matching record is in one of those states, this UPDATES it in
   * place (new PIN, new pending-approval state, fresh onboarding record)
   * instead of trying to CREATE a duplicate. A record that's still
   * active or pending is a genuine conflict and still gets rejected.
   */
  const existing = await prisma.staff.findUnique({ where: { email } })
  const isRehireCase = existing && (existing.employmentStatus === "TERMINATED" || existing.approvalStatus === "REJECTED")

  if (existing && !isRehireCase) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
  }

  const hashedPin = await bcrypt.hash(pin, 10)

  try {
    let staff
    let teamId: string

    if (isRehireCase && existing) {
      // Reuse their original team ID — it's already a permanent historical
      // identifier, no reason to burn a new sequential number on a rehire.
      teamId = existing.teamId ?? ""
      staff = await prisma.staff.update({
        where: { id: existing.id },
        data: {
          name, phone: phone || null, role: role || "Staff", positionId: positionId || null,
          pin: hashedPin, onboardingCompleted: true, onboardingCompletedAt: new Date(),
          active: false, approvalStatus: "PENDING",
          // Clear prior termination/rejection markers — this is a fresh start
          employmentStatus: "ACTIVE", terminatedAt: null, terminationNotes: null, terminatedBy: null,
        },
      })
      // Replace their prior onboarding record rather than stacking a second
      // one — OnboardingRecord.staffId is unique, so upsert is required.
      await prisma.onboardingRecord.upsert({
        where: { staffId: staff.id },
        update: {
          legalName: legalName || name, dateOfBirth: dateOfBirth || null,
          address: address || null, emergencyContact: emergencyContact || null, emergencyPhone: emergencyPhone || null,
          tshirtSize: tshirtSize || null, startDate: startDate ? new Date(startDate) : null,
          idDocumentUrl: idDocumentPath || null,
          signatureText: String(signatureText).trim(), signedAt: new Date(),
          employmentAgreementStatus: "SIGNED", employmentAgreementSignedAt: new Date(),
          codeOfConductStatus: "SIGNED", codeOfConductSignedAt: new Date(),
          completedAt: new Date(), ipAddressOnSign: request.headers.get("x-forwarded-for") ?? null,
        },
        create: {
          staffId: staff.id, legalName: legalName || name, dateOfBirth: dateOfBirth || null,
          address: address || null, emergencyContact: emergencyContact || null, emergencyPhone: emergencyPhone || null,
          tshirtSize: tshirtSize || null, startDate: startDate ? new Date(startDate) : null,
          idDocumentUrl: idDocumentPath || null,
          signatureText: String(signatureText).trim(), signedAt: new Date(),
          employmentAgreementStatus: "SIGNED", employmentAgreementSignedAt: new Date(),
          codeOfConductStatus: "SIGNED", codeOfConductSignedAt: new Date(),
          completedAt: new Date(), ipAddressOnSign: request.headers.get("x-forwarded-for") ?? null,
        },
      })
    } else {
      // Generate the next sequential team ID (HB-001, HB-002, ...)
      const prefix = TEAM_ID_CONFIG.prefix
      const existingIds = await prisma.staff.findMany({
        where: { teamId: { startsWith: prefix } }, select: { teamId: true }, orderBy: { teamId: "desc" },
      })
      const lastNum = existingIds.reduce((max: number, s: { teamId: string | null }) => {
        const num = parseInt(s.teamId?.replace(prefix + "-", "") ?? "0")
        return num > max ? num : max
      }, 0)
      teamId = prefix + "-" + String(lastNum + 1).padStart(TEAM_ID_CONFIG.digits, "0")

      staff = await prisma.staff.create({
        data: {
          teamId, name, email, phone: phone || null,
          role: role || "Staff", positionId: positionId || null,
          accessLevel: "STAFF", pin: hashedPin,
          onboardingCompleted: true, onboardingCompletedAt: new Date(),
          // Gate: invisible everywhere until an admin approves.
          // active:false is what actually excludes this record from every
          // existing `where: { active: true }` query across the app — no
          // other query changes were needed once this was set correctly.
          active: false,
          approvalStatus: "PENDING",
        },
      })

      await prisma.onboardingRecord.create({
        data: {
          staffId: staff.id, legalName: legalName || name, dateOfBirth: dateOfBirth || null,
          address: address || null, emergencyContact: emergencyContact || null, emergencyPhone: emergencyPhone || null,
          tshirtSize: tshirtSize || null, startDate: startDate ? new Date(startDate) : null,
          idDocumentUrl: idDocumentPath || null,
          signatureText: String(signatureText).trim(), signedAt: new Date(),
          employmentAgreementStatus: "SIGNED", employmentAgreementSignedAt: new Date(),
          codeOfConductStatus: "SIGNED", codeOfConductSignedAt: new Date(),
          completedAt: new Date(), ipAddressOnSign: request.headers.get("x-forwarded-for") ?? null,
        },
      })
    }

    // Audit trail of the submission itself — separate from the roster sheet.
    // Non-blocking: a Sheets failure must never block the onboarding flow.
    logOnboardingToSheet({ teamId, name, email, position: role || "Staff", completedAt: new Date().toISOString() }).catch(console.error)

    // New hire: "we got it, pending review" — no portal link, account isn't active.
    // BUG HISTORY (2026-07-15): previously fire-and-forget with .catch(console.error)
    // on a function that never throws — real failures (unverified sender,
    // invalid recipient) were invisible outside server logs. Now tracked
    // in MessageLog for real visibility from the admin dashboard.
    logEmailAttempt(
      sendOnboardingReceived(email, { name }),
      { channel: "EMAIL", recipient: email, subject: "Onboarding Received" }
    ).catch(() => {})

    // Admins: notify everyone with review authority. Query fresh rather than
    // relying on any cached list, since this needs to reflect current staff.
    prisma.staff.findMany({
      where: { active: true, accessLevel: { in: ["OWNER", "MANAGER"] } },
      select: { email: true },
    }).then(async (admins: { email: string }[]) => {
      const emails = admins.map((a: { email: string }) => a.email)
      if (emails.length === 0) return
      const result = await sendAdminOnboardingAlert(emails, { name, role: role || "Staff" })
      // sendAdminOnboardingAlert sends to multiple recipients and returns
      // an aggregate { sent, failed } count rather than the single-result
      // shape logEmailAttempt expects — logged directly here instead.
      await prisma.messageLog.create({
        data: {
          channel: "EMAIL", recipient: emails.join(", "),
          subject: `New onboarding submission awaiting approval: ${name}`,
          body: `Sent to ${result.sent} of ${emails.length} admins${result.failed > 0 ? `, ${result.failed} failed` : ""}`,
          status: result.failed === 0 ? "SENT" : (result.sent > 0 ? "PARTIAL" : "FAILED"),
          sentAt: new Date(),
        },
      }).catch(() => {})
    }).catch(console.error)

    return NextResponse.json({ data: { staffId: staff.id, teamId }, success: true }, { status: 201 })
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
    }
    console.error("[Onboarding] Submission error:", e)
    return NextResponse.json({ error: "Submission failed" }, { status: 500 })
  }
}
