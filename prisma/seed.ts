// prisma/seed.ts
// Run: npm run db:seed
// Seeds staff, tables, and operating hours with real Hive Buckhead data

import { PrismaClient } from "@prisma/client"
const AccessLevel = { ADMIN: "ADMIN", STAFF: "STAFF", FLOOR: "FLOOR" } as const
const Section = { FINE_DINING: "FINE_DINING", BAR: "BAR", DEN: "DEN", PATIO: "PATIO" } as const
const ShiftType = { OPEN: "OPEN", CLOSE: "CLOSE", DOUBLE: "DOUBLE", MID: "MID" } as const;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Hive Buckhead database...");

  // ── Staff ──────────────────────────────────────────────────────────────
  const staffData = [
    {
      name: "Admin User",
      email: "admin@hivebuckhead.com",
      role: "Manager on Duty",
      accessLevel: AccessLevel.ADMIN,
      pin: "1234",
      color: "#C9A96E",
    },
    {
      name: "Ashley Smith",
      email: "ashley@hivebuckhead.com",
      role: "Lead Server",
      accessLevel: AccessLevel.STAFF,
      pin: "2345",
      color: "#5B96C8",
    },
    {
      name: "Marcus Rivera",
      email: "marcus@hivebuckhead.com",
      role: "Server",
      accessLevel: AccessLevel.STAFF,
      pin: "3456",
      color: "#9B7EC8",
    },
    {
      name: "Jenna Park",
      email: "jenna@hivebuckhead.com",
      role: "Server",
      accessLevel: AccessLevel.STAFF,
      pin: "4567",
      color: "#3AACA8",
    },
    {
      name: "Devon Harris",
      email: "devon@hivebuckhead.com",
      role: "Server / Bar",
      accessLevel: AccessLevel.STAFF,
      pin: "5678",
      color: "#4CAF82",
    },
    {
      name: "Floor Staff",
      email: "floor@hivebuckhead.com",
      role: "Host",
      accessLevel: AccessLevel.FLOOR,
      pin: "6789",
      color: "#A89B84",
    },
  ];

  console.log("  Creating staff...");
  for (const s of staffData) {
    const hashedPin = await bcrypt.hash(s.pin, 10);
    await prisma.staff.upsert({
      where: { email: s.email },
      update: {},
      create: {
        name: s.name,
        email: s.email,
        role: s.role,
        accessLevel: s.accessLevel,
        pin: hashedPin,
        color: s.color,
        active: true,
      },
    });
  }

  // ── Tables ─────────────────────────────────────────────────────────────
  // Based on actual Hive Buckhead floor plan (PDF blueprints)
  const tablesData = [
    // ══ BAR STOOLS (20) — from approved JSON ══
    { displayId:"B1",  capacity:1, section:Section.BAR, svgX:340, svgY:140, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B2",  capacity:1, section:Section.BAR, svgX:360, svgY:140, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B3",  capacity:1, section:Section.BAR, svgX:380, svgY:140, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B4",  capacity:1, section:Section.BAR, svgX:400, svgY:140, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B5",  capacity:1, section:Section.BAR, svgX:420, svgY:140, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B6",  capacity:1, section:Section.BAR, svgX:440, svgY:140, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B7",  capacity:1, section:Section.BAR, svgX:260, svgY:180, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B8",  capacity:1, section:Section.BAR, svgX:260, svgY:200, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B9",  capacity:1, section:Section.BAR, svgX:260, svgY:220, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B10", capacity:1, section:Section.BAR, svgX:420, svgY:260, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B11", capacity:1, section:Section.BAR, svgX:260, svgY:260, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B12", capacity:1, section:Section.BAR, svgX:280, svgY:260, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B13", capacity:1, section:Section.BAR, svgX:300, svgY:260, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B14", capacity:1, section:Section.BAR, svgX:320, svgY:260, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B15", capacity:1, section:Section.BAR, svgX:340, svgY:260, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B16", capacity:1, section:Section.BAR, svgX:360, svgY:260, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B17", capacity:1, section:Section.BAR, svgX:380, svgY:260, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B18", capacity:1, section:Section.BAR, svgX:400, svgY:260, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B19", capacity:1, section:Section.BAR, svgX:460, svgY:260, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B20", capacity:1, section:Section.BAR, svgX:440, svgY:260, svgShape:"stool", svgW:17, svgH:17 },

    // ══ FINE DINING — round tables (cx = x + w/2, cy = y + h/2) ══
    { displayId:"T206", capacity:3, section:Section.FINE_DINING, svgShape:"round", svgX:200, svgY:100, svgW:40, svgH:40 },
    { displayId:"T207", capacity:3, section:Section.FINE_DINING, svgShape:"round", svgX:520, svgY:80,  w:40, h:40 },
    // Top wall 2-seat booths
    { displayId:"T200", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:260, svgY:80,  w:25, h:36 },
    { displayId:"T201", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:300, svgY:80,  w:25, h:35 },
    { displayId:"T202", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:340, svgY:80,  w:25, h:35 },
    { displayId:"T203", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:380, svgY:80,  w:25, h:36 },
    { displayId:"T204", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:420, svgY:80,  w:25, h:35 },
    { displayId:"T205", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:460, svgY:80,  w:25, h:35 },
    // Left wall booths
    { displayId:"T208", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:180, svgY:180, svgW:25, svgH:35 },
    { displayId:"T209", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:220, svgY:180, svgW:25, svgH:35 },
    // Right side 4-seat
    { displayId:"T210", capacity:4, section:Section.FINE_DINING, svgShape:"booth", svgX:500, svgY:120, svgW:56, svgH:36 },
    { displayId:"T211", capacity:4, section:Section.FINE_DINING, svgShape:"booth", svgX:500, svgY:180, svgW:56, svgH:36 },
    // Left lower 4-seat
    { displayId:"T212", capacity:4, section:Section.FINE_DINING, svgShape:"booth", svgX:180, svgY:240, svgW:56, svgH:36 },
    { displayId:"T213", capacity:4, section:Section.FINE_DINING, svgShape:"booth", svgX:180, svgY:300, svgW:56, svgH:36 },
    // Bottom row
    { displayId:"T214", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:300, svgY:300, svgW:25, svgH:35 },
    { displayId:"T215", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:340, svgY:300, svgW:25, svgH:35 },
    { displayId:"T216", capacity:3, section:Section.FINE_DINING, svgShape:"booth", svgX:380, svgY:300, svgW:25, svgH:35 },
    { displayId:"T217", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:420, svgY:300, svgW:25, svgH:35 },
    { displayId:"T218", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:460, svgY:300, svgW:25, svgH:35 },

    // ══ DEN / LOUNGE ══
    { displayId:"T11", capacity:4, svgShape:"booth", section:Section.DEN, svgX:160, svgY:380, svgW:30, svgH:36 },
    { displayId:"T12", capacity:4, svgShape:"booth", section:Section.DEN, svgX:200, svgY:380, svgW:30, svgH:36 },
    { displayId:"T13", capacity:4, svgShape:"booth", section:Section.DEN, svgX:280, svgY:380, svgW:30, svgH:36 },
    { displayId:"T14", capacity:4, svgShape:"booth", section:Section.DEN, svgX:320, svgY:380, svgW:30, svgH:36 },
    { displayId:"T15", capacity:4, svgShape:"booth", section:Section.DEN, svgX:360, svgY:380, svgW:30, svgH:36 },
    { displayId:"T16", capacity:4, svgShape:"booth", section:Section.DEN, svgX:400, svgY:380, svgW:30, svgH:36 },
    { displayId:"T17", capacity:4, svgShape:"booth", section:Section.DEN, svgX:440, svgY:380, svgW:30, svgH:36 },
    { displayId:"T18", capacity:4, svgShape:"booth", section:Section.DEN, svgX:480, svgY:380, svgW:30, svgH:36 },
    { displayId:"T19", capacity:4, svgShape:"booth", section:Section.DEN, svgX:520, svgY:380, svgW:30, svgH:36 },
    // Bottom row
    { displayId:"T20", capacity:4, svgShape:"booth", section:Section.DEN, svgX:160, svgY:480, svgW:30, svgH:36 },
    { displayId:"T21", capacity:4, svgShape:"booth", section:Section.DEN, svgX:220, svgY:480, svgW:30, svgH:36 },
    { displayId:"T22", capacity:4, svgShape:"booth", section:Section.DEN, svgX:280, svgY:480, svgW:30, svgH:36 },
    { displayId:"T23", capacity:4, svgShape:"booth", section:Section.DEN, svgX:360, svgY:480, svgW:30, svgH:36 },
    { displayId:"T24", capacity:4, svgShape:"booth", section:Section.DEN, svgX:420, svgY:480, svgW:30, svgH:36 },
    { displayId:"T25", capacity:4, svgShape:"booth", section:Section.DEN, svgX:480, svgY:480, svgW:30, svgH:36 },
    { displayId:"T26", capacity:3, svgShape:"booth", section:Section.DEN, svgX:540, svgY:480, svgW:30, svgH:32 },

    // ══ PATIO ══
    { displayId:"T101", label:"Big Booth B", capacity:6,  svgShape:"booth", section:Section.PATIO, svgX:760, svgY:140, svgW:86, svgH:44 },
    { displayId:"T102", label:"Big Booth A", capacity:10, svgShape:"booth", section:Section.PATIO, svgX:760, svgY:280, svgW:102, svgH:54 },
    { displayId:"T103", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:900,  svgY:140, svgW:56, svgH:36 },
    { displayId:"T104", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:980,  svgY:140, svgW:56, svgH:36 },
    { displayId:"T105", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:1100, svgY:140, svgW:56, svgH:36 },
    { displayId:"T106", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:1180, svgY:140, svgW:56, svgH:36 },
    { displayId:"T107", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:940,  svgY:240, svgW:56, svgH:36 },
    { displayId:"T108", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:1020, svgY:240, svgW:56, svgH:36 },
    { displayId:"T109", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:1100, svgY:240, svgW:56, svgH:36 },
    { displayId:"T110", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:1180, svgY:240, svgW:56, svgH:36 },
  ];

  console.log("  Creating tables...");
  for (const t of tablesData) {
    await prisma.table.upsert({
      where: { displayId: t.displayId },
      update: {},
      create: t,
    });
  }

  // ── Operating Hours ────────────────────────────────────────────────────
  console.log("  Creating operating hours...");
  const hours = [
    { dayOfWeek: 0, openTime: null, closeTime: null, closed: true },  // Sun
    { dayOfWeek: 1, openTime: "17:00", closeTime: "22:00", closed: false }, // Mon
    { dayOfWeek: 2, openTime: "17:00", closeTime: "22:00", closed: false }, // Tue
    { dayOfWeek: 3, openTime: "17:00", closeTime: "22:00", closed: false }, // Wed
    { dayOfWeek: 4, openTime: "17:00", closeTime: "22:00", closed: false }, // Thu
    { dayOfWeek: 5, openTime: "17:00", closeTime: "23:00", closed: false }, // Fri
    { dayOfWeek: 6, openTime: "16:00", closeTime: "23:00", closed: false }, // Sat
  ];

  for (const h of hours) {
    await prisma.operatingHours.upsert({
      where: { dayOfWeek: h.dayOfWeek },
      update: {},
      create: h,
    });
  }

  console.log("✅ Seed complete!");
  console.log(`   Staff: ${staffData.length}`);
  console.log(`   Tables: ${tablesData.length}`);
  console.log(`   Operating hours: 7 days`);
  console.log("");
  console.log("⚠️  IMPORTANT: Change all staff PINs before going live!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
