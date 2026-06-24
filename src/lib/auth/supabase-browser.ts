// src/lib/auth/supabase-browser.ts
// Browser-only Supabase client. Safe to import in "use client" components.
// Does NOT import next/headers — purely client-side.

import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
