import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const reservationId = formData.get("reservationId") as string
    const rsvpCode = formData.get("rsvpCode") as string

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ url: null, warning: "Storage not configured" })
    }

    const ext = file.name.split(".").pop() ?? "jpg"
    const fileName = `receipts/${reservationId}/${rsvpCode}-${Date.now()}.${ext}`
    const bytes = await file.arrayBuffer()

    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/hive-receipts/${fileName}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type": file.type,
          "x-upsert": "true",
        },
        body: bytes,
      }
    )

    if (!uploadRes.ok) {
      return NextResponse.json({ url: null, warning: "Upload failed" })
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/hive-receipts/${fileName}`
    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error("[Receipt upload]", error)
    return NextResponse.json({ url: null, warning: "Upload error" })
  }
}
