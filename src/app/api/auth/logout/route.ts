import { NextResponse } from "next/server";

/**
 * BUG HISTORY (2026-07-15): staff-portal-client.tsx had a plain
 * <a href="/api/auth/logout"> link, which performs a GET navigation —
 * but only POST was handled here, producing a 405 error and never
 * actually clearing the session. That link is now fixed to use a proper
 * POST fetch, but this GET handler is added as defense-in-depth: any
 * future stray <a href> pointing here (rather than a fetch-based button)
 * will still correctly log the user out and redirect, instead of hitting
 * the same 405 failure mode again.
 */
export async function GET() {
  const response = NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  response.cookies.delete("hive-session");
  return response;
}

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("hive-session");
  return response;
}
