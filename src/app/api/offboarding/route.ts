/**
 * POST — process offboarding for a terminated staff member
 * Creates OffboardingRecord, deactivates Staff, logs to Google Sheets
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAdmin } from "@/lib/auth/session"
import { logOffboardingToSheet } from "@/lib/integrations/google-sheets"

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  const body = await request.json()
  const { staffId, terminationType, reason, notes, terminationDate, accessRevoked, equipmentReturned, finalPayProcessed, exitInterviewDone } = body
  if (!staffId || !terminationType || !terminationDate) {
    return NextResponse.json({ error: "staffId, terminationType, terminationDate required" }, { status: 400 })
  }
  const staff = await prisma.staff.findUnique({ where: { id: staffId }, select: { id: true, name: true, email: true, role: true, teamId: true } })
  if (!staff) return NextResponse.json({ error: "Staff member not found" }, { status: 404 })

  // Deactivate the staff member and record termination details
  await prisma.staff.update({
    where: { id: staffId },
    data: { active: false, employmentStatus: "TERMINATED", terminatedAt: new Date(terminationDate), terminationNotes: notes || null, terminatedBy: session.name },
  })

  // Create permanent offboarding record
  await prisma.offboardingRecord.create({
    data: {
      staffId, staffName: staff.name, staffEmail: staff.email, staffTeamId: staff.teamId,
      terminationDate: new Date(terminationDate), terminationType, reason: reason || null,
      notes: notes || null, processedBy: session.name,
      accessRevoked: accessRevoked || false, equipmentReturned: equipmentReturned || false,
      finalPayProcessed: finalPayProcessed || false, exitInterviewDone: exitInterviewDone || false,
    },
  })

  // Log to Google Sheets (non-blocking)
  logOffboardingToSheet({ teamId: staff.teamId ?? undefined, name: staff.name, email: staff.email, role: staff.role, terminationDate, reason: reason || terminationType, processedBy: session.name }).catch(console.error)

  return NextResponse.json({ success: true })
}
