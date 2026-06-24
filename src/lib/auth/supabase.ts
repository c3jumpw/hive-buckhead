// src/lib/auth/supabase.ts
// Re-exports both clients for backwards compatibility.
// Prefer importing directly from supabase-browser or supabase-server
// to keep the bundle clean.

export { createBrowserSupabaseClient } from "./supabase-browser";
export { createServerSupabaseClient } from "./supabase-server";
