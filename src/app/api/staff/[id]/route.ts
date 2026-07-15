import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"
import { logAdminAction } from "@/lib/db/activity-logger"

const bcrypt = require("bcryptjs")

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || (session.accessLevel !== "OWNER" && session.accessLevel !== "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await request.json()
  const update: Record<string, unknown> = {}
  const changedFields: string[] = []
  if (body.name)        { update.name = body.name; changedFields.push("name") }
  if (body.role)        { update.role = body.role; changedFields.push("role") }
  if (body.accessLevel) { update.accessLevel = body.accessLevel; changedFields.push("access level") }
  if (body.email)       { update.email = body.email; changedFields.push("email") }
  if (body.color)       { update.color = body.color; changedFields.push("color") }
  if (body.pin && body.pin.length === 4) {
    update.pin = await bcrypt.hash(body.pin, 10)
    changedFields.push("PIN")
  }
  const before = await prisma.staff.findUnique({ where: { id: params.id }, select: { name: true } })
  const updated = await prisma.staff.update({
    where: { id: params.id },
    data: update,
    select: { id: true, name: true, role: true, accessLevel: true, color: true, email: true },
  })

  // Master admin edit log — 2026-07-16 addition. Uses the pre-update name
  // in the description (falls back to the post-update name if the lookup
  // somehow missed) so a name-change edit reads naturally either way.
  if (changedFields.length > 0) {
    logAdminAction({
      staffId: session.id,
      type: "staff_edited",
      description: `${session.name} updated ${before?.name ?? updated.name}'s ${changedFields.join(", ")}`,
      metadata: { targetStaffId: params.id, fields: changedFields },
    })
  }

  return NextResponse.json({ data: updated })
}
