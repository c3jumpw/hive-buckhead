/**
 * POST — final onboarding form submission
 * Creates Staff + OnboardingRecord, logs to Google Sheets, sends welcome email
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { TEAM_ID_CONFIG } from "@/lib/config"
import { logStaffToSheet, logOnboardingToSheet } from "@/lib/integrations/google-sheets"
import { sendOnboardingWelcome } from "@/lib/integrations/sendgrid"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  const session = request.cookies.get("hive-onboarding-session")
  if (session?.value !== "verified") {
    return NextResponse.json({ error: "Unauthorized — complete access code verification first" }, { status: 401 })
  }
  const body = await request.json()
  const { name, email, phone, role, pin, positionId, legalName, dateOfBirth, address, emergencyContact, emergencyPhone, startDate, tshirtSize } = body
  if (!name || !email || !pin || pin.length < 4) {
    return NextResponse.json({ error: "Name, email, and 4-digit PIN required" }, { status: 400 })
  }
  const prefix = TEAM_ID_CONFIG.prefix
  const existingIds = await prisma.staff.findMany({ where: { teamId: { startsWith: prefix } }, select: { teamId: true }, orderBy: { teamId: "desc" } })
  const lastNum = existingIds.reduce((max: number, s: any) => {
    const num = parseInt(s.teamId?.replace(prefix + "-", "") ?? "0")
    return num > max ? num : max
  }, 0)
  const teamId = prefix + "-" + String(lastNum + 1).padStart(TEAM_ID_CONFIG.digits, "0")
  const hashedPin = await bcrypt.hash(pin, 10)
  try {
    const staff = await prisma.staff.create({
      data: { teamId, name, email, phone: phone || null, role: role || "Staff", positionId: positionId || null, accessLevel: "STAFF", pin: hashedPin, onboardingCompleted: true, onboardingCompletedAt: new Date() },
    })
    await prisma.onboardingRecord.create({
      data: { staffId: staff.id, legalName: legalName || name, dateOfBirth: dateOfBirth || null, address: address || null, emergencyContact: emergencyContact || null, emergencyPhone: emergencyPhone || null, tshirtSize: tshirtSize || null, startDate: startDate ? new Date(startDate) : null, employmentAgreementStatus: "PENDING", codeOfConductStatus: "PENDING", completedAt: new Date(), ipAddressOnSign: request.headers.get("x-forwarded-for") ?? null },
    })
    logStaffToSheet({ teamId, name, email, phone, role: role || "Staff", startDate, createdAt: new Date().toISOString() }).catch(console.error)
    logOnboardingToSheet({ teamId, name, email, position: role || "Staff", completedAt: new Date().toISOString() }).catch(console.error)
    sendOnboardingWelcome(email, { name, portalUrl: "https://staffportal.thehivebuckhead.com", startDate: startDate ? new Date(startDate).toLocaleDateString() : undefined }).catch(console.error)
    return NextResponse.json({ data: { staffId: staff.id, teamId }, success: true }, { status: 201 })
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
    console.error("[Onboarding] Submission error:", e)
    return NextResponse.json({ error: "Submission failed" }, { status: 500 })
  }
}
