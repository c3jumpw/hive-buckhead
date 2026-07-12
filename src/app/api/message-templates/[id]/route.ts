/**
 * src/app/api/message-templates/[id]/route.ts
 * PATCH  — update a template's content (admin/manager only)
 * DELETE — soft-delete (active: false) a template (admin/manager only)
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAdmin } from "@/lib/auth/session"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin()
  const body = await request.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.channel !== undefined) data.channel = body.channel
  if (body.subject !== undefined) data.subject = body.subject || null
  if (body.body !== undefined) data.body = body.body

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 })
  }

  const template = await prisma.messageTemplate.update({ where: { id: params.id }, data })
  return NextResponse.json({ data: template })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin()
  const template = await prisma.messageTemplate.update({
    where: { id: params.id }, data: { active: false },
  })
  return NextResponse.json({ data: template })
}
