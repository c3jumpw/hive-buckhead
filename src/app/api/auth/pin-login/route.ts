// src/app/api/auth/pin-login/route.ts
// Verifies staff PIN and sets a secure session cookie.

import { NextRequest, NextResponse } from "next/server";
import { verifyStaffPin } from "@/lib/auth/session";
import { staffLoginSchema } from "@/lib/validations/reservation";

// Simple rate limiter — max 10 attempts per 15 minutes per IP
const attempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = staffLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { staffId, pin } = parsed.data;

    // Verify PIN against bcrypt hash in DB
    const staff = await verifyStaffPin(staffId, pin);

    if (!staff) {
      return NextResponse.json(
        { error: "Incorrect name or PIN. Please try again." },
        { status: 401 }
      );
    }

    // Set secure httpOnly session cookie
    const response = NextResponse.json({
      data: {
        id: staff.id,
        name: staff.name,
        role: staff.role,
        accessLevel: staff.accessLevel,
        color: staff.color,
      },
    });

    response.cookies.set("hive-session", JSON.stringify({
      staffId: staff.id,
      name: staff.name,
      accessLevel: staff.accessLevel,
      loginAt: Date.now(),
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 12, // 12 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[PIN login]", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
