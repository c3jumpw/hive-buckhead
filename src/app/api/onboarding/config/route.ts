/**
 * GET  — returns current plain access code (admin only)
 * POST — rotates the code (admin manual button)
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAdmin } from "@/lib/auth/session"
import { ONBOARDING_CONFIG } from "@/lib/config"
import bcrypt from "bcryptjs"

function generateCode(): string {
  const chars = ONBOARDING_CONFIG.codeCharset
  return Array.from({ length: ONBOARDING_CONFIG.codeLength },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("")
}

export async function GET() {
  await requireAdmin()
  let config = await prisma.onboardingPortalConfig.findUnique({ where: { id: "singleton" } })
  if (!config || new Date() >= new Date(config.nextRotationAt)) config = await rotateCode()
  return NextResponse.json({ data: { accessCode: config.accessCodePlain, rotatedAt: config.rotatedAt, nextRotationAt: config.nextRotationAt } })
}

export async function POST() {
  await requireAdmin()
  const config = await rotateCode()
  return NextResponse.json({ data: { accessCode: config.accessCodePlain, rotatedAt: config.rotatedAt, nextRotationAt: config.nextRotationAt } })
}

async function rotateCode() {
  const plain = generateCode()
  const hashed = await bcrypt.hash(plain, 10)
  const now = new Date()
  const nextRotation = new Date(now)
  nextRotation.setDate(now.getDate() + ONBOARDING_CONFIG.rotationDays)
  return prisma.onboardingPortalConfig.upsert({
    where: { id: "singleton" },
    update: { accessCodeHash: hashed, accessCodePlain: plain, rotatedAt: now, nextRotationAt: nextRotation },
    create: { id: "singleton", accessCodeHash: hashed, accessCodePlain: plain, rotatedAt: now, nextRotationAt: nextRotation },
  })
}
