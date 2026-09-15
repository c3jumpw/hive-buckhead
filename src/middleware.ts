/**
 * middleware.ts
 * =============================================================================
 * Domain-aware routing:
 *
 * reservations.thehivebuckhead.com → RSVP + menu (guest-facing only)
 * menu.hivebuckhead.com            → /menu page (standalone menu site)
 * staffportal-*.thehivebuckhead.com → full staff dashboard (all routes)
 * =============================================================================
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const RESERVATION_ALLOWED = ["/rsvp", "/menu", "/api", "/branding", "/_next", "/favicon.ico"]

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || ""
  const pathname = request.nextUrl.pathname

  // ── menu.hivebuckhead.com → serve /menu for all paths ──────────────────
  if (hostname.startsWith("menu.")) {
    if (pathname === "/" || pathname === "") {
      return NextResponse.rewrite(new URL("/menu", request.url))
    }
    // Allow /menu itself and assets, redirect everything else to /menu
    if (pathname.startsWith("/menu") || pathname.startsWith("/_next") || 
        pathname.startsWith("/api") || pathname.startsWith("/branding") ||
        pathname === "/favicon.ico") {
      return NextResponse.next()
    }
    return NextResponse.rewrite(new URL("/menu", request.url))
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

  // ── All other domains (staffportal) → pass through ────────────────────
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
