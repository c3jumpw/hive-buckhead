/**
 * src/app/api/upload/guide-attachment/route.ts
 * =============================================================================
 * POST — uploads an image or document for a Resource Hub guide, same
 * pattern as /api/upload/receipt. Requires a "hive-guide-attachments"
 * public bucket to exist in Supabase Storage — create it once from the
 * Supabase dashboard (Storage → New bucket → public) before this works;
 * it isn't created automatically.
 *
 * MANAGER/OWNER only — matches who can edit guides at all.
 * =============================================================================
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/session"

const MAX_SIZE = 15 * 1024 * 1024 // 15MB — documents run larger than photos

export async function POST(request: NextRequest) {
  await requireAdmin()

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 15MB)" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 503 })
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const fileName = `guides/${Date.now()}-${safeName}`
    const bytes = await file.arrayBuffer()

    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/hive-guide-attachments/${fileName}`,
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": file.type || "application/octet-stream", "x-upsert": "true" },
        body: bytes,
      }
    )

    if (!uploadRes.ok) {
      const detail = await uploadRes.text().catch(() => "")
      console.error("[Guide attachment upload] Supabase error:", detail)
      return NextResponse.json({ error: "Upload failed — check that the hive-guide-attachments bucket exists and is public" }, { status: 502 })
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/hive-guide-attachments/${fileName}`
    return NextResponse.json({ url: publicUrl, name: file.name })
  } catch (error) {
    console.error("[Guide attachment upload]", error)
    return NextResponse.json({ error: "Upload error" }, { status: 500 })
  }
}
