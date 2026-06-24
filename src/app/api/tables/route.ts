import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()

  if (!body.section || body.svgX === undefined || body.svgY === undefined) {
    return NextResponse.json({ error: "section, svgX, svgY required" }, { status: 400 })
  }

  // Generate a unique displayId if the provided one already exists
  let displayId = String(body.displayId ?? "NEW")
  const existing = await prisma.table.findUnique({ where: { displayId } })
  if (existing) {
    // Append a suffix until unique
    let suffix = 2
    while (await prisma.table.findUnique({ where: { displayId: `${displayId}-${suffix}` } })) {
      suffix++
    }
    displayId = `${displayId}-${suffix}`
  }

  try {
    const table = await prisma.table.create({
      data: {
        displayId,
        label:    body.label ?? null,
        capacity: Number(body.capacity ?? 2),
        section:  body.section,
        svgX:     Number(body.svgX),
        svgY:     Number(body.svgY),
        svgW:     body.svgW != null ? Number(body.svgW) : null,
        svgH:     body.svgH != null ? Number(body.svgH) : null,
        svgShape: body.svgShape ?? null,
      },
    })
    return NextResponse.json({ data: table }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    console.error("[POST /api/tables]", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
