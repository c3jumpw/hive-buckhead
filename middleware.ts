/**
 * middleware.ts
 * =============================================================================
 * Domain-aware routing. Currently handles one case: root page.tsx
 * unconditionally redirects "/" to "/reservations" (the staff operations
 * dashboard) — correct for the vercel.app / staffportal domains where
 * that's the intended landing point, but wrong for
 * reservations.thehivebuckhead.com, which is meant to be the public
 * booking link shared with guests. Without this, a guest visiting that
 * domain's root would land on a staff login page.
 *
 * Rewrites (not redirects) reservations.thehivebuckhead.com/ to /rsvp
 * internally — the URL bar stays on the clean domain, no visible /rsvp
 * suffix required for the "easy public link" this domain is meant to be.
 * Every other path on that domain (e.g. /rsvp/manage) is untouched.
 * =============================================================================
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || ""
  if (hostname.startsWith("reservations.") && request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/rsvp", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: "/",
}
