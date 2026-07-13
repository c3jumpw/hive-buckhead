/**
 * src/app/api/onboarding/upload-document/route.ts
 * =============================================================================
 * POST — uploads an ID document (driver's license, passport) during the
 * public onboarding flow.
 *
 * SECURITY (2026-07-15): this uses a PRIVATE Supabase Storage bucket
 * (hive-onboarding-docs), not the public bucket used for close-table
 * receipts (hive-receipts). ID documents are sensitive PII — a photo of
 * someone's driver's license or passport must never be reachable via a
 * guessable/permanent public URL the way receipt images are. This route
 * returns only the internal storage PATH, never a public URL. Viewing the
 * document later requires an admin session and a short-lived signed URL
 * generated on demand — see /api/onboarding/document-url.
 *
 * SETUP REQUIRED: the "hive-onboarding-docs" bucket must be created in the
 * Supabase dashboard (Storage → New Bucket) with "Public" turned OFF. It
 * will not be created automatically by this code.
 *
 * Auth: checks the onboarding portal's own session cookie (the applicant
 * isn't a staff member yet, so getSession()/staff auth doesn't apply here —
 * same pattern as /api/onboarding/submit).
 * =============================================================================
 */
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const session = request.cookies.get("hive-onboarding-session")
  if (session?.value !== "verified") {
    return NextResponse.json({ error: "Unauthorized — complete access code verification first" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const docType = (formData.get("docType") as string) || "id"

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 400 })
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "File must be a JPG, PNG, WEBP, or PDF" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 503 })
    }

    const ext = file.name.split(".").pop() ?? "jpg"
    // Path includes a random component, not just a predictable id, so a
    // leaked/guessed path alone isn't enough to find a specific document —
    // meaningful defense-in-depth even though the bucket itself is private.
    const randomId = Math.random().toString(36).slice(2, 10)
    const path = `onboarding/${docType}-${Date.now()}-${randomId}.${ext}`
    const bytes = await file.arrayBuffer()

    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/hive-onboarding-docs/${path}`,
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
      const errText = await uploadRes.text()
      console.error("[Onboarding upload] Supabase Storage error:", errText)
      return NextResponse.json({ error: "Upload failed — the storage bucket may not be set up yet" }, { status: 502 })
    }

    // Return only the internal path — never a public URL.
    return NextResponse.json({ path })
  } catch (error) {
    console.error("[Onboarding upload]", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
