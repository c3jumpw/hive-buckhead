/**
 * src/app/api/guides/route.ts
 * =============================================================================
 * GET  — list guides, filtered server-side to what the caller's access
 *        level can see (a MANAGER-only guide is never sent to a STAFF
 *        session at all, same as hasAccess() gating everywhere else).
 * POST — create a new guide (MANAGER/OWNER only).
 *
 * REVISION (2026-07-16): Resources originally shipped as a static file
 * (src/lib/resources/guides.ts) specifically because there was no content
 * yet — "we can develop the guides last." The Guide model already existed
 * in the schema at that point but was never wired up. Now that there's a
 * real, growing guide list and an explicit ask for a UI to manage it
 * without a code deploy each time, this makes that model real. The static
 * file's three placeholder guides are superseded by the real ones seeded
 * via this route — see the migration note in staff-portal-client.tsx.
 * =============================================================================
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession, requireAdmin } from "@/lib/auth/session"
import { hasAccess } from "@/lib/utils"

const LEVEL_RANK: Record<string, number> = { STAFF: 0, MANAGER: 1, OWNER: 2 }

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const guides = await prisma.guide.findMany({
    orderBy: [{ pinned: "desc" }, { category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
  })
  const visible = guides.filter((g: any) => hasAccess(session.accessLevel, g.minAccessLevel))
  return NextResponse.json({ data: visible })
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  const body = await request.json()
  const { title, body: guideBody, category, minAccessLevel, pinned, sortOrder } = body

  if (!title || !guideBody) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 })
  }
  if (minAccessLevel && !(minAccessLevel in LEVEL_RANK)) {
    return NextResponse.json({ error: "minAccessLevel must be STAFF, MANAGER, or OWNER" }, { status: 400 })
  }

  const guide = await prisma.guide.create({
    data: {
      title, body: guideBody,
      category: category || "General",
      minAccessLevel: minAccessLevel || "STAFF",
      pinned: !!pinned,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      authorId: session.id, authorName: session.name,
    },
  })
  return NextResponse.json({ data: guide }, { status: 201 })
}
