/**
 * src/app/api/staff/invite/route.ts
 * =============================================================================
 * POST — invite a new staff member by email, replacing the old flow where
 * "Add New Staff" created a fully active account with an admin-assigned
 * PIN on the spot.
 *
 * New flow: creates a Staff record in an INVITED state (active:false,
 * onboardingCompleted:false — invisible everywhere the same way a
 * portal-submitted-but-unapproved record is, see the `active` field's own
 * doc comment on the Staff model), then emails them a link to the same
 * public onboarding portal self-service applicants use, plus the current
 * portal access code so the link is self-contained.
 *
 * When they complete that form, onboarding/submit/route.ts recognizes the
 * INVITED record by email (same mechanism as the existing rehire-detection
 * logic) and fills in their real details + chosen PIN, moving them to
 * PENDING — at which point they show up in the normal approval list,
 * exactly like a self-service applicant. Nothing about the review step
 * changes; only how the applicant record starts existing does.
 *
 * No PIN is collected here — there's nothing to hash yet. The Staff.pin
 * column is NOT NULL, so a random, never-enterable placeholder is stored
 * until they choose their real one.
 * =============================================================================
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"
import { APP_CONFIG, ONBOARDING_CONFIG } from "@/lib/config"
import { sendStaffInvite } from "@/lib/integrations/sendgrid"
import { logEmailAttempt, logAdminAction } from "@/lib/db/activity-logger"
import bcrypt from "bcryptjs"

function generateAccessCode(): string {
  const chars = ONBOARDING_CONFIG.codeCharset
  return Array.from({ length: ONBOARDING_CONFIG.codeLength },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("")
}

/** Returns the current valid onboarding access code, rotating it first if expired. Mirrors the logic in /api/onboarding/config — duplicated rather than imported since that route's functions aren't exported for reuse. */
async function getCurrentAccessCode(): Promise<string> {
  let config = await prisma.onboardingPortalConfig.findUnique({ where: { id: "singleton" } })
  if (!config || new Date() >= new Date(config.nextRotationAt)) {
    const plain = generateAccessCode()
    const hashed = await bcrypt.hash(plain, 10)
    const now = new Date()
    const nextRotation = new Date(now)
    nextRotation.setDate(now.getDate() + ONBOARDING_CONFIG.rotationDays)
    config = await prisma.onboardingPortalConfig.upsert({
      where: { id: "singleton" },
      update: { accessCodeHash: hashed, accessCodePlain: plain, rotatedAt: now, nextRotationAt: nextRotation },
      create: { id: "singleton", accessCodeHash: hashed, accessCodePlain: plain, rotatedAt: now, nextRotationAt: nextRotation },
    })
  }
  return config.accessCodePlain
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || (session.accessLevel !== "OWNER" && session.accessLevel !== "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { name, email, role, accessLevel } = await request.json()
  if (!name || !email || !role) {
    return NextResponse.json({ error: "Name, email, and role are required" }, { status: 400 })
  }

  // Same duplicate-email philosophy as onboarding/submit: a currently
  // active/pending/already-invited record is a real conflict, but a
  // terminated or rejected one is a legitimate "start fresh" case (also
  // handles re-inviting someone whose invite was sent and is just still
  // sitting unopened — not blocked, since resending isn't harmful).
  const existing = await prisma.staff.findUnique({ where: { email } })
  const blockingStates: string[] = ["PENDING", "APPROVED"]
  if (existing && existing.active) {
    return NextResponse.json({ error: "An active account with this email already exists" }, { status: 409 })
  }
  if (existing && blockingStates.includes(existing.approvalStatus) && existing.employmentStatus !== "TERMINATED") {
    return NextResponse.json({ error: "This email already has an account in progress" }, { status: 409 })
  }

  // Placeholder PIN — 32 random hex chars, can never be typed on a 4-digit
  // pad, and the record is active:false regardless, so login is blocked
  // twice over. Real PIN is set by the invitee during onboarding.
  const placeholderPin = await bcrypt.hash(Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(""), 10)

  const staff = existing
    ? await prisma.staff.update({
        where: { id: existing.id },
        data: {
          name, role, accessLevel: accessLevel ?? "STAFF", pin: placeholderPin,
          active: false, onboardingCompleted: false, approvalStatus: "INVITED",
          employmentStatus: "ACTIVE", terminatedAt: null, terminationNotes: null, terminatedBy: null,
        },
        select: { id: true, name: true, role: true, accessLevel: true, color: true, email: true, approvalStatus: true, active: true },
      })
    : await prisma.staff.create({
        data: { name, email, role, accessLevel: accessLevel ?? "STAFF", pin: placeholderPin, active: false, approvalStatus: "INVITED" },
        select: { id: true, name: true, role: true, accessLevel: true, color: true, email: true, approvalStatus: true, active: true },
      })

  const accessCode = await getCurrentAccessCode()

  logEmailAttempt(
    sendStaffInvite(email, { name, role, invitedBy: session.name, onboardingUrl: `${APP_CONFIG.onboardingUrl}?email=${encodeURIComponent(email)}`, accessCode }),
    { channel: "EMAIL", recipient: email, subject: "Staff Invite" }
  ).catch(() => {})

  logAdminAction({
    staffId: session.id,
    type: "staff_invited",
    description: `${session.name} invited ${name} (${email}) as a ${role}`,
    metadata: { targetStaffId: staff.id, role, accessLevel: accessLevel ?? "STAFF" },
  })

  return NextResponse.json({ data: staff }, { status: 201 })
}
