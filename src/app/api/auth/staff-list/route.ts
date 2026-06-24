// src/app/api/auth/staff-list/route.ts
// Returns the list of active staff for the login dropdown.
// Public endpoint — no auth required (just names and roles, no sensitive data).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const staff = await prisma.staff.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      role: true,
      accessLevel: true,
    },
    orderBy: [
      { accessLevel: "asc" }, // ADMIN first
      { name: "asc" },
    ],
  });

  return NextResponse.json({ data: staff });
}
