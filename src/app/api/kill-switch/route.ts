import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"

// GET — read current RSVP mode (public)
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

// PATCH — update RSVP mode
// The /control page is only reachable on the private staff portal domain
// (middleware blocks it on all public domains). Domain routing IS the auth
// layer for this low-stakes control (only affects which RSVP page guests see).
export async function PATCH(request: NextRequest) {
  let body: { rsvpMode?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { rsvpMode } = body

  if (!rsvpMode || !["online", "fallback", "closed"].includes(rsvpMode)) {
    return NextResponse.json(
      { error: "Invalid mode — must be online, fallback, or closed" },
      { status: 400 }
    )
  }

  try {
    const settings = await prisma.appSettings.upsert({
      where: { id: "singleton" },
      update: { rsvpMode },
      create: { id: "singleton", rsvpMode },
    })
    return NextResponse.json({ data: { rsvpMode: settings.rsvpMode }, success: true })
  } catch (err) {
    console.error("[kill-switch] DB error:", err)
    return NextResponse.json(
      { error: "Database error saving mode" },
      { status: 500 }
    )
  }
}
