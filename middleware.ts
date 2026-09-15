/**
 * middleware.ts
 * =============================================================================
 * Domain-aware routing:
 *
 * menu.hivebuckhead.com            → /menu-site (Route Handler serving menu HTML)
 * reservations.thehivebuckhead.com → RSVP booking form + public /menu page
 * staffportal / onboarding domains → full app (no restrictions)
 * =============================================================================
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const RESERVATION_ALLOWED = ["/rsvp", "/menu", "/api", "/branding", "/_next", "/favicon.ico"]

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || ""
  const pathname = request.nextUrl.pathname

  // ── menu.hivebuckhead.com → Route Handler serving standalone menu HTML ──
  if (hostname.startsWith("menu.")) {
    // Let Next.js assets and API pass through
    if (pathname.startsWith("/_next") || pathname.startsWith("/api") ||
        pathname === "/favicon.ico") {
      return NextResponse.next()
    }
    // Rewrite everything else to the Route Handler
    return NextResponse.rewrite(new URL("/menu-site", request.url))
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

  // ── All other domains → full access ───────────────────────────────────
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
