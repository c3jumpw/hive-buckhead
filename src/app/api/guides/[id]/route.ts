/**
 * src/app/api/guides/[id]/route.ts
 * PATCH  — update a guide's content, category, access level, pin, or order
 * DELETE — permanently remove a guide (hard delete — unlike message
 *          templates, there's no "used elsewhere" reason to soft-delete
 *          these; a removed guide just shouldn't exist anymore)
 * Both MANAGER/OWNER only.
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAdmin } from "@/lib/auth/session"

const LEVEL_RANK: Record<string, number> = { STAFF: 0, MANAGER: 1, OWNER: 2 }

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin()
  const body = await request.json()
  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = body.title
  if (body.body !== undefined) data.body = body.body
  if (body.category !== undefined) data.category = body.category
  if (body.pinned !== undefined) data.pinned = !!body.pinned
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder
  if (body.minAccessLevel !== undefined) {
    if (!(body.minAccessLevel in LEVEL_RANK)) {
      return NextResponse.json({ error: "minAccessLevel must be STAFF, MANAGER, or OWNER" }, { status: 400 })
    }
    data.minAccessLevel = body.minAccessLevel
  }
  if (body.attachments !== undefined) data.attachments = Array.isArray(body.attachments) ? body.attachments : null

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 })
  }

  const guide = await prisma.guide.update({ where: { id: params.id }, data })
  return NextResponse.json({ data: guide })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin()
  await prisma.guide.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
