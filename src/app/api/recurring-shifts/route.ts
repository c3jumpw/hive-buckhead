/**
 * GET  — get recurring shifts for a staff member
 * POST — set/update recurring shift for a staff member on a given day
 * Admin/manager only — staff cannot edit their own recurring schedule
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAdmin } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  await requireAdmin()
  const staffId = new URL(request.url).searchParams.get("staffId")
  if (!staffId) return NextResponse.json({ error: "staffId required" }, { status: 400 })
  const shifts = await prisma.recurringShift.findMany({ where: { staffId, active: true }, orderBy: { dayOfWeek: "asc" } })
  return NextResponse.json({ data: shifts })
}

export async function POST(request: NextRequest) {
  await requireAdmin()
  const body = await request.json()
  const { staffId, dayOfWeek, startTime, endTime, type, role, isWorkDay } = body
  if (!staffId || dayOfWeek === undefined) return NextResponse.json({ error: "staffId and dayOfWeek required" }, { status: 400 })
  // Upsert — one recurring shift per staff per day
  const shift = await prisma.recurringShift.upsert({
    where: { staffId_dayOfWeek: { staffId, dayOfWeek } },
    update: { startTime: startTime || "17:00", endTime: endTime || "23:00", type: type || "CLOSE", role: role || null, isWorkDay: isWorkDay !== false },
    create: { staffId, dayOfWeek, startTime: startTime || "17:00", endTime: endTime || "23:00", type: type || "CLOSE", role: role || null, isWorkDay: isWorkDay !== false },
  })
  return NextResponse.json({ data: shift })
}
