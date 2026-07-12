/**
 * src/app/api/auth/pin-login/route.ts
 * =============================================================================
 * Verifies a staff PIN and sets the session cookie.
 *
 * Flow:
 *   1. Client sends { staffId, pin } — staffId is the staff record's database
 *      id, selected from the login dropdown (see /api/auth/staff-list).
 *   2. verifyStaffPin() looks up the staff by id and checks the PIN via bcrypt.
 *   3. On success, sets the "hive-session" cookie using the SAME encoding
 *      (base64 JSON) and shape (SessionStaff) that getSession() in
 *      src/lib/auth/session.ts expects when reading it back. These two files
 *      must stay in sync — createSessionValue/getSessionCookieOptions are the
 *      single source of truth for the cookie format, imported here rather
 *      than reimplemented, to prevent the two from drifting apart again.
 *
 * Rate limiting:
 *   In-memory map, 10 attempts per 15 minutes per IP. Resets on server
 *   restart/redeploy — acceptable for a low-traffic internal staff login,
 *   not intended as a substitute for a persistent rate limiter at scale.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyStaffPin, createSessionValue, getSessionCookieOptions } from "@/lib/auth/session"
import { staffLoginSchema } from "@/lib/validations/reservation"

// In-memory rate limit tracker: IP -> { count, resetAt }
const attempts = new Map<string, { count: number; resetAt: number }>()

/**
 * Simple sliding-window rate limiter keyed by IP.
 * @param key - identifier to rate-limit on (client IP)
 * @returns true if the request is allowed, false if the limit was exceeded
 */
function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "local"

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const parsed = staffLoginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    // staffId here is the staff record's database id (selected from dropdown),
    // NOT an email — verifyStaffPin looks up by id, matching how the login
    // form actually works (staff pick their name, not type an email).
    const { staffId, pin } = parsed.data

    const staff = await verifyStaffPin(staffId, pin)

    if (!staff) {
      return NextResponse.json(
        { error: "Incorrect name or PIN. Please try again." },
        { status: 401 }
      )
    }

    const response = NextResponse.json({ data: staff })

    // Set cookie using the SAME encoding/shape that getSession() reads.
    // Do not hand-roll this here — any drift between how the cookie is
    // written and how it's read silently breaks every protected page.
    const cookieOptions = getSessionCookieOptions()
    response.cookies.set(cookieOptions.name, createSessionValue(staff), {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      maxAge: cookieOptions.maxAge,
      path: cookieOptions.path,
    })

    return response
  } catch (error) {
    console.error("[PIN login]", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
