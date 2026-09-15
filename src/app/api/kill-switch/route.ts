import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"

// GET — read current mode (no auth needed, used by /rsvp page and /control)
export async function GET() {
  try {
    const settings = await prisma.appSettings.findUnique({
      where: { id: "singleton" },
      select: { rsvpMode: true, rsvpFallbackMessage: true },
    })
    return NextResponse.json({ data: settings ?? { rsvpMode: "online" } })
  } catch {
    return NextResponse.json({ data: { rsvpMode: "online" } })
  }
}

// PATCH — update mode
// Accepts either:
//   (a) a valid dashboard session cookie (logged-in OWNER/MANAGER), OR
//   (b) the x-kill-switch-secret header matching KILL_SWITCH_SECRET env var
//       → used by the /control page which has no login requirement
export async function PATCH(request: NextRequest) {
  // Check secret header first (for /control page without login)
  const secret = request.headers.get("x-kill-switch-secret")
  const envSecret = process.env.KILL_SWITCH_SECRET

  const hasValidSecret = envSecret && secret && secret === envSecret

  if (!hasValidSecret) {
    // Fall back to session auth (logged-in dashboard user)
    const session = await getSession()
    if (!session || (session.accessLevel !== "OWNER" && session.accessLevel !== "MANAGER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const body = await request.json()
  const { rsvpMode, rsvpFallbackMessage } = body

  if (!["online", "fallback", "closed"].includes(rsvpMode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 })
  }

  const update: Record<string, string> = { rsvpMode }
  if (rsvpFallbackMessage) update.rsvpFallbackMessage = rsvpFallbackMessage

  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update,
    create: { id: "singleton", ...update },
  })

  return NextResponse.json({ data: { rsvpMode: settings.rsvpMode } })
}
