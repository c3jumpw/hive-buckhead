// src/lib/auth/session.ts
// Server-side session utilities.

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import type { SessionStaff, AccessLevel } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require("bcryptjs");

// ── Session cookie name ────────────────────────────────────────────────────

const SESSION_COOKIE = "hive-session";

// ── Get current session from cookie ───────────────────────────────────────

export async function getSession(): Promise<SessionStaff | null> {
  try {
    const cookieStore = cookies();
    const raw = cookieStore.get(SESSION_COOKIE)?.value;
    if (!raw) return null;

    const session = JSON.parse(raw) as {
      staffId: string;
      name: string;
      accessLevel: string;
      loginAt: number;
    };

    // Expire after 12 hours
    if (Date.now() - session.loginAt > 12 * 60 * 60 * 1000) return null;

    // Verify staff still exists and is active
    const staff = await prisma.staff.findUnique({
      where: { id: session.staffId, active: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accessLevel: true,
        color: true,
      },
    });

    if (!staff) return null;

    return {
      ...staff,
      accessLevel: staff.accessLevel as AccessLevel,
    };
  } catch {
    return null;
  }
}

// ── Require auth — redirects to login if not authenticated ─────────────────

export async function requireAuth(): Promise<SessionStaff> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

// ── Access level helpers ───────────────────────────────────────────────────

const ACCESS_LEVEL_ORDER: Record<AccessLevel, number> = {
  FLOOR: 1,
  STAFF: 2,
  ADMIN: 3,
};

export async function requireAccessLevel(
  minimum: AccessLevel
): Promise<SessionStaff> {
  const session = await requireAuth();
  if (ACCESS_LEVEL_ORDER[session.accessLevel] < ACCESS_LEVEL_ORDER[minimum]) {
    redirect("/unauthorized");
  }
  return session;
}

export function hasAccess(
  userLevel: AccessLevel,
  required: AccessLevel
): boolean {
  return ACCESS_LEVEL_ORDER[userLevel] >= ACCESS_LEVEL_ORDER[required];
}

// ── PIN verification ───────────────────────────────────────────────────────

export async function verifyStaffPin(
  staffId: string,
  pin: string
): Promise<SessionStaff | null> {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId, active: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      accessLevel: true,
      color: true,
      pin: true,
    },
  });

  if (!staff) return null;

  const valid = await bcrypt.compare(pin, staff.pin);
  if (!valid) return null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { pin: _pin, ...safeStaff } = staff;

  return {
    ...safeStaff,
    accessLevel: safeStaff.accessLevel as AccessLevel,
  };
}
