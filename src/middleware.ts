/**
 * middleware.ts
 * =============================================================================
 * Domain-aware routing:
 *
 * menu.hivebuckhead.com            → /menu-standalone.html (full static menu)
 * reservations.thehivebuckhead.com → RSVP booking form + public menu
 * staffportal / onboarding domains → full app (no restrictions)
 * =============================================================================
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const RESERVATION_ALLOWED = ["/rsvp", "/menu", "/api", "/branding", "/_next", "/favicon.ico"]

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || ""
  const pathname = request.nextUrl.pathname

  // ── menu.hivebuckhead.com → standalone static menu page ────────────────
  if (hostname.startsWith("menu.")) {
    // Serve the static HTML file for any path on this domain
    // (assets like /_next still pass through normally)
    if (pathname.startsWith("/_next") || pathname.startsWith("/api") || 
        pathname === "/favicon.ico") {
      return NextResponse.next()
    }
    // Rewrite root and all other paths to the static menu file
    return NextResponse.rewrite(new URL("/menu-standalone.html", request.url))
  }

  // ── reservations.thehivebuckhead.com → RSVP + menu only ───────────────
  if (hostname.startsWith("reservations.")) {
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/rsvp", request.url))
    }
    const isAllowed = RESERVATION_ALLOWED.some(prefix => pathname.startsWith(prefix))
    if (!isAllowed) {
      return NextResponse.redirect(new URL("/rsvp", request.url))
    }
    return NextResponse.next()
  }

  // ── All other domains (staffportal, onboarding) → full access ─────────
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
