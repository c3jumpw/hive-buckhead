/**
 * src/app/api/onboarding/document-url/route.ts
 * =============================================================================
 * GET ?path=... — generates a short-lived signed URL to view a private
 * onboarding document. Admin/manager only.
 *
 * SECURITY: the document itself lives in a private Supabase Storage
 * bucket (hive-onboarding-docs) with no public access. This route is the
 * ONLY way to view a document, and requires an authenticated admin
 * session — the signed URL it returns expires in 10 minutes, so even if
 * it were somehow shared or logged, it stops working shortly after.
 * =============================================================================
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  await requireAdmin()

  const path = request.nextUrl.searchParams.get("path")
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 })
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/storage/v1/object/sign/hive-onboarding-docs/${path}`,
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn: 600 }), // 10 minutes
      }
    )
    if (!res.ok) {
      const errText = await res.text()
      console.error("[Onboarding document-url]", errText)
      return NextResponse.json({ error: "Could not generate viewing link" }, { status: 502 })
    }
    const json = await res.json()
    return NextResponse.json({ url: `${supabaseUrl}/storage/v1${json.signedURL}` })
  } catch (error) {
    console.error("[Onboarding document-url]", error)
    return NextResponse.json({ error: "Failed to generate link" }, { status: 500 })
  }
}
