/**
 * POST — verifies access code, sets portal session cookie
 * Public endpoint — the access code IS the authentication
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  const { code } = await request.json()
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 })
  const config = await prisma.onboardingPortalConfig.findUnique({ where: { id: "singleton" } })
  if (!config) return NextResponse.json({ error: "Portal not configured — contact admin" }, { status: 500 })
  if (new Date() > new Date(config.nextRotationAt)) {
    return NextResponse.json({ error: "Access code expired — contact your manager for today\'s code" }, { status: 401 })
  }
  const valid = await bcrypt.compare(code.trim().toUpperCase(), config.accessCodeHash)
  if (!valid) return NextResponse.json({ error: "Invalid access code" }, { status: 401 })
  const res = NextResponse.json({ success: true })
  res.cookies.set("hive-onboarding-session", "verified", {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "strict", maxAge: 60 * 60 * 2, path: "/",
  })
  return res
}
