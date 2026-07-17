/**
 * middleware.ts
 * =============================================================================
 * Domain-aware routing for reservations.thehivebuckhead.com — the one
 * domain meant to be an "easy public link," per an explicit request that
 * this and the cancel/manage page be the ONLY things reachable there.
 *
 * REVISION (2026-07-16, same day): the original version only handled the
 * root path ("/") — real gap confirmed by a screenshot of
 * reservations.thehivebuckhead.com/login showing the staff sign-in
 * screen. Now allow-listed: only /rsvp* pages (the form and manage/cancel
 * page) plus what they depend on to function (API routes, /branding for
 * the logo, Next's own static assets) are reachable on this domain.
 * Anything else — /login included — redirects to the booking form
 * instead of exposing staff-only pages on the public domain.
 * =============================================================================
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const ALLOWED_PREFIXES = ["/rsvp", "/api", "/branding", "/_next", "/favicon.ico"]

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || ""
  const pathname = request.nextUrl.pathname

  if (!hostname.startsWith("reservations.")) {
    return NextResponse.next()
  }

  if (pathname === "/") {
    return NextResponse.rewrite(new URL("/rsvp", request.url))
  }

  const isAllowed = ALLOWED_PREFIXES.some(prefix => pathname.startsWith(prefix))
  if (!isAllowed) {
    return NextResponse.redirect(new URL("/rsvp", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
}
