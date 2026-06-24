import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const data: Record<string, unknown> = {}

  if (body.state     !== undefined) data.state     = body.state
  if (body.displayId !== undefined) data.displayId = String(body.displayId)
  if (body.label     !== undefined) data.label     = body.label ?? null
  if (body.capacity  !== undefined) data.capacity  = Number(body.capacity)
  if (body.section   !== undefined) data.section   = body.section
  if (body.svgX      !== undefined) data.svgX      = Number(body.svgX)
  if (body.svgY      !== undefined) data.svgY      = Number(body.svgY)
  if (body.svgW      !== undefined) data.svgW      = body.svgW != null ? Number(body.svgW) : null
  if (body.svgH      !== undefined) data.svgH      = body.svgH != null ? Number(body.svgH) : null
  if (body.svgShape  !== undefined) data.svgShape  = body.svgShape ?? null

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 })
  }

  try {
    const table = await prisma.table.update({ where: { id: params.id }, data })
    return NextResponse.json({ data: table })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // Soft delete — mark inactive so reservation history is preserved
    const table = await prisma.table.update({
      where: { id: params.id },
      data: { active: false }
    })
    return NextResponse.json({ data: table })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
