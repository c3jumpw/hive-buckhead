/**
 * PATCH /api/staff-portal/profile
 * Staff can update their own email, phone, or PIN.
 * Requires current PIN for verification (prevents unauthorized changes).
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"
import bcrypt from "bcryptjs"

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { email, phone, newPin, currentPin } = await request.json()
  if (!currentPin) return NextResponse.json({ error: "Current PIN required" }, { status: 400 })

  // Verify current PIN before allowing changes
  const staff = await prisma.staff.findUnique({ where: { id: session.id }, select: { pin: true } })
  if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 })

  const pinValid = await bcrypt.compare(String(currentPin), staff.pin)
  if (!pinValid) return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 })

  const updateData: Record<string, string> = {}
  if (email) updateData.email = email
  if (phone) updateData.phone = phone
  if (newPin) {
    if (String(newPin).length !== 4 || !/^\d{4}$/.test(String(newPin))) {
      return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 })
    }
    updateData.pin = await bcrypt.hash(String(newPin), 10)
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 })
  }

  const updated = await prisma.staff.update({ where: { id: session.id }, data: updateData })
  return NextResponse.json({ data: { name: updated.name, email: updated.email } })
}
