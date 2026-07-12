/**
 * src/lib/auth/session.ts
 * Session management — PIN-based auth for all staff roles.
 * OWNER > MANAGER > STAFF access hierarchy.
 */

import { cookies } from "next/headers"
import { prisma } from "@/lib/db/prisma"

export type SessionStaff = {
  id: string; name: string; email: string
  role: string; accessLevel: string; color: string
}

const COOKIE_NAME = "hive-session"
const COOKIE_MAX_AGE = 60 * 60 * 12  // 12 hours

// Ordered from lowest to highest privilege — used for rank comparison
const ACCESS_RANK: Record<string, number> = { STAFF: 0, FLOOR: 0, MANAGER: 1, ADMIN: 1, OWNER: 2 }

/** Read and validate session cookie. Returns null if missing or invalid. */
export async function getSession(): Promise<SessionStaff | null> {
  try {
    const cookieStore = cookies()
    const cookie = cookieStore.get(COOKIE_NAME)
    if (!cookie?.value) return null
    const session = JSON.parse(Buffer.from(cookie.value, "base64").toString("utf-8")) as SessionStaff
    // Revalidate against DB to catch deactivated accounts
    const staff = await prisma.staff.findUnique({
      where: { id: session.id, active: true },
      select: { id: true, name: true, email: true, role: true, accessLevel: true, color: true },
    })
    if (!staff) return null
    return { ...staff, accessLevel: staff.accessLevel as string }
  } catch { return null }
}

/** Requires any valid session. Redirects to /login if missing. */
export async function requireSession(): Promise<SessionStaff> {
  const { redirect } = await import("next/navigation")
  const session = await getSession()
  if (!session) redirect("/login")
  return session!
}

/** Requires MANAGER or OWNER. Redirects STAFF to staff portal. */
export async function requireAdmin(): Promise<SessionStaff> {
  const { redirect } = await import("next/navigation")
  const session = await getSession()
  if (!session) redirect("/login")
  const level = session!.accessLevel
  if (level === "STAFF") redirect("/staff-portal")  // legacy FLOOR removed — STAFF now covers floor-only users
  return session!
}

/** Requires OWNER only. Used for destructive operations. */
export async function requireOwner(): Promise<SessionStaff> {
  const { redirect } = await import("next/navigation")
  const session = await getSession()
  if (!session) redirect("/login")
  if (session!.accessLevel !== "OWNER") redirect("/unauthorized")
  return session!
}

/** Backward-compatible — maps old ADMIN/FLOOR to new levels */
export async function requireAccessLevel(level: string): Promise<SessionStaff> {
  if (level === "ADMIN" || level === "OWNER" || level === "MANAGER") return requireAdmin()
  return requireSession()
}

/** Legacy alias used by some existing routes */
export async function requireAuth(): Promise<SessionStaff> { return requireSession() }

/** Verify a staff PIN against bcrypt hash — used in login route */
export async function verifyStaffPin(email: string, pin: string): Promise<SessionStaff | null> {
  const bcrypt = await import("bcryptjs")
  const staff = await prisma.staff.findUnique({
    where: { email, active: true },
    select: { id: true, name: true, email: true, role: true, accessLevel: true, color: true, pin: true },
  })
  if (!staff) return null
  const valid = await bcrypt.compare(String(pin), staff.pin)
  if (!valid) return null
  const { pin: _, ...sessionData } = staff
  return { ...sessionData, accessLevel: sessionData.accessLevel as string }
}

export function createSessionValue(staff: SessionStaff): string {
  return Buffer.from(JSON.stringify(staff)).toString("base64")
}

export function getSessionCookieOptions(maxAge?: number) {
  return {
    name: COOKIE_NAME, httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: maxAge ?? COOKIE_MAX_AGE, path: "/",
  }
}
