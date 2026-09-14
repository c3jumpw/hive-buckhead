// prisma/seed.ts
// Run: npm run db:seed
// Seeds staff, tables, and operating hours with real Hive Buckhead data

import { PrismaClient } from "@prisma/client"
const AccessLevel = { OWNER: "OWNER", MANAGER: "MANAGER", STAFF: "STAFF" } as const
const Section = { FINE_DINING: "FINE_DINING", BAR: "BAR", DEN: "DEN", PATIO: "PATIO" } as const
const ShiftType = { OPEN: "OPEN", CLOSE: "CLOSE", DOUBLE: "DOUBLE", MID: "MID" } as const;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Hive Buckhead database...");

  // ── Staff ──────────────────────────────────────────────────────────────
  // 2026-07-15: real names assigned for OWNER and MANAGER per business
  // request — Kennedy Okere (Owner) and Gennee' Kelley (Manager). All other
  // staff remain placeholder data as explicitly requested ("keep all other
  // placeholder staff names and details"). No MANAGER-level entry existed
  // in the original seed data — this adds one rather than renaming an
  // existing STAFF-level entry, since promoting a placeholder server to
  // MANAGER would have silently changed their access level too.
  const staffData = [
    {
      name: "Kennedy Okere",
      email: "admin@hivebuckhead.com",
      role: "Manager on Duty",
      accessLevel: AccessLevel.OWNER,
      pin: "1234",
      color: "#C9A96E",
    },
    {
      name: "Gennee' Kelley",
      email: "manager@hivebuckhead.com",
      role: "General Manager",
      accessLevel: AccessLevel.MANAGER,
      pin: "9012",
      color: "#D4894C",
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
      accessLevel: AccessLevel.STAFF,
      pin: "6789",
      color: "#A89B84",
    },
  ];

  console.log("  Creating staff...");
  for (const s of staffData) {
    const hashedPin = await bcrypt.hash(s.pin, 10);
    await prisma.staff.upsert({
      where: { email: s.email },
      // BUG HISTORY (2026-07-15): this was `update: {}` — completely
      // empty. Re-running the seed against a database that already has a
      // staff member with this email (true for every seeded account after
      // the very first run) would match by email and update NOTHING,
      // silently no-op'ing. This is why simply re-running `npm run
      // db:seed` after renaming Admin User -> Kennedy Okere in this file
      // would NOT have actually changed the name in the live database.
      //
      // Fixed to propagate name/role/color on re-seed (the fields someone
      // would legitimately want corrected by editing this file and
      // re-running), while deliberately NOT touching pin or accessLevel
      // here — if a real staff member changed their own PIN via the Staff
      // Portal profile editor, or an admin changed someone's access level
      // through the admin UI, re-seeding must not silently overwrite
      // those live changes back to placeholder values.
      update: { name: s.name, role: s.role, color: s.color },
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
    // ══ BAR STOOLS (20) — around the outside of bar counter (x:250-450, y:148-268) ══
    // Top row of stools (above the bar, y≈136)
    { displayId:"B1",  capacity:1, section:Section.BAR, svgX:256, svgY:136, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B2",  capacity:1, section:Section.BAR, svgX:276, svgY:136, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B3",  capacity:1, section:Section.BAR, svgX:296, svgY:136, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B4",  capacity:1, section:Section.BAR, svgX:316, svgY:136, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B5",  capacity:1, section:Section.BAR, svgX:336, svgY:136, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B6",  capacity:1, section:Section.BAR, svgX:356, svgY:136, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B7",  capacity:1, section:Section.BAR, svgX:376, svgY:136, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B8",  capacity:1, section:Section.BAR, svgX:396, svgY:136, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B9",  capacity:1, section:Section.BAR, svgX:416, svgY:136, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B10", capacity:1, section:Section.BAR, svgX:436, svgY:136, svgShape:"stool", svgW:17, svgH:17 },
    // Left stools (to the left of the bar, x≈238)
    { displayId:"B11", capacity:1, section:Section.BAR, svgX:236, svgY:160, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B12", capacity:1, section:Section.BAR, svgX:236, svgY:182, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B13", capacity:1, section:Section.BAR, svgX:236, svgY:204, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B14", capacity:1, section:Section.BAR, svgX:236, svgY:226, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B15", capacity:1, section:Section.BAR, svgX:236, svgY:248, svgShape:"stool", svgW:17, svgH:17 },
    // Bottom stools (below the bar, y≈276)
    { displayId:"B16", capacity:1, section:Section.BAR, svgX:256, svgY:276, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B17", capacity:1, section:Section.BAR, svgX:276, svgY:276, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B18", capacity:1, section:Section.BAR, svgX:316, svgY:276, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B19", capacity:1, section:Section.BAR, svgX:356, svgY:276, svgShape:"stool", svgW:17, svgH:17 },
    { displayId:"B20", capacity:1, section:Section.BAR, svgX:436, svgY:276, svgShape:"stool", svgW:17, svgH:17 },

    // ══ FINE DINING — filling the teal section (168,48)→(580,358), avoiding bar area ══
    // Top wall 2-seat booths (y≈60, spread across top)
    { displayId:"T200", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:175, svgY:56, svgW:30, svgH:36 },
    { displayId:"T201", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:215, svgY:56, svgW:30, svgH:36 },
    { displayId:"T202", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:468, svgY:56, svgW:30, svgH:36 },
    { displayId:"T203", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:508, svgY:56, svgW:30, svgH:36 },
    { displayId:"T204", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:540, svgY:56, svgW:30, svgH:36 },
    // Top area round tables (3-seat, above bar left)
    { displayId:"T206", capacity:3, section:Section.FINE_DINING, svgShape:"round", svgX:184, svgY:100, svgW:44, svgH:44 },
    { displayId:"T207", capacity:3, section:Section.FINE_DINING, svgShape:"round", svgX:536, svgY:100, svgW:44, svgH:44 },
    // Right of kitchen area (between kitchen right edge and wall)
    { displayId:"T210", capacity:4, section:Section.FINE_DINING, svgShape:"booth", svgX:494, svgY:100, svgW:30, svgH:36 },
    { displayId:"T211", capacity:4, section:Section.FINE_DINING, svgShape:"booth", svgX:494, svgY:150, svgW:30, svgH:36 },
    { displayId:"T212", capacity:4, section:Section.FINE_DINING, svgShape:"booth", svgX:494, svgY:200, svgW:30, svgH:36 },
    { displayId:"T213", capacity:4, section:Section.FINE_DINING, svgShape:"booth", svgX:494, svgY:250, svgW:30, svgH:36 },
    { displayId:"T214", capacity:4, section:Section.FINE_DINING, svgShape:"booth", svgX:494, svgY:300, svgW:30, svgH:36 },
    // Left wall (angled) — 4-seat tables down left side
    { displayId:"T208", capacity:4, section:Section.FINE_DINING, svgShape:"booth", svgX:168, svgY:160, svgW:56, svgH:36 },
    { displayId:"T209", capacity:4, section:Section.FINE_DINING, svgShape:"booth", svgX:168, svgY:210, svgW:56, svgH:36 },
    // Bottom row (between bar bottom and den line at y:358)
    { displayId:"T215", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:175, svgY:300, svgW:30, svgH:36 },
    { displayId:"T216", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:215, svgY:300, svgW:30, svgH:36 },
    { displayId:"T217", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:310, svgY:300, svgW:30, svgH:36 },
    { displayId:"T218", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:350, svgY:300, svgW:30, svgH:36 },
    { displayId:"T219", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:390, svgY:300, svgW:30, svgH:36 },
    { displayId:"T220", capacity:2, section:Section.FINE_DINING, svgShape:"booth", svgX:430, svgY:300, svgW:30, svgH:36 },

    // ══ DEN / LOUNGE — in salmon section (153,358)→(580,560) ══
    // Top row of den booth tables
    { displayId:"T11", capacity:4, svgShape:"booth", section:Section.DEN, svgX:160, svgY:372, svgW:56, svgH:36 },
    { displayId:"T12", capacity:4, svgShape:"booth", section:Section.DEN, svgX:228, svgY:372, svgW:56, svgH:36 },
    { displayId:"T13", capacity:4, svgShape:"booth", section:Section.DEN, svgX:296, svgY:372, svgW:56, svgH:36 },
    { displayId:"T14", capacity:4, svgShape:"booth", section:Section.DEN, svgX:364, svgY:372, svgW:56, svgH:36 },
    { displayId:"T15", capacity:4, svgShape:"booth", section:Section.DEN, svgX:432, svgY:372, svgW:56, svgH:36 },
    { displayId:"T16", capacity:4, svgShape:"booth", section:Section.DEN, svgX:500, svgY:372, svgW:56, svgH:36 },
    // Bottom row of den booth tables
    { displayId:"T17", capacity:4, svgShape:"booth", section:Section.DEN, svgX:160, svgY:476, svgW:56, svgH:36 },
    { displayId:"T18", capacity:4, svgShape:"booth", section:Section.DEN, svgX:228, svgY:476, svgW:56, svgH:36 },
    { displayId:"T19", capacity:4, svgShape:"booth", section:Section.DEN, svgX:296, svgY:476, svgW:56, svgH:36 },
    { displayId:"T20", capacity:4, svgShape:"booth", section:Section.DEN, svgX:364, svgY:476, svgW:56, svgH:36 },
    { displayId:"T21", capacity:4, svgShape:"booth", section:Section.DEN, svgX:432, svgY:476, svgW:56, svgH:36 },
    { displayId:"T22", capacity:4, svgShape:"booth", section:Section.DEN, svgX:500, svgY:476, svgW:56, svgH:36 },

    // ══ PATIO — upper (752,48→1252,130) and main (752,130→1252,352) sections ══
    // Big Booth B (6-seat) — upper-left of patio, in dark entry strip
    { displayId:"T101", label:"Big Booth B", capacity:6,  svgShape:"booth", section:Section.PATIO, svgX:758, svgY:56,  svgW:86, svgH:44 },
    // Big Booth A (10-seat) — lower-left, in patio main section  
    { displayId:"T102", label:"Big Booth A", capacity:10, svgShape:"booth", section:Section.PATIO, svgX:758, svgY:200, svgW:102, svgH:54 },
    // Patio grid row 1 (y≈140, in patio main body)
    { displayId:"T103", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:868,  svgY:140, svgW:56, svgH:36 },
    { displayId:"T104", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:942,  svgY:140, svgW:56, svgH:36 },
    { displayId:"T105", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:1016, svgY:140, svgW:56, svgH:36 },
    { displayId:"T106", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:1090, svgY:140, svgW:56, svgH:36 },
    { displayId:"T107", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:1164, svgY:140, svgW:56, svgH:36 },
    // Patio grid row 2
    { displayId:"T108", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:868,  svgY:198, svgW:56, svgH:36 },
    { displayId:"T109", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:942,  svgY:198, svgW:56, svgH:36 },
    { displayId:"T110", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:1016, svgY:198, svgW:56, svgH:36 },
    { displayId:"T111", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:1090, svgY:198, svgW:56, svgH:36 },
    { displayId:"T112", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:1164, svgY:198, svgW:56, svgH:36 },
    // Patio grid row 3
    { displayId:"T113", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:868,  svgY:280, svgW:56, svgH:36 },
    { displayId:"T114", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:942,  svgY:280, svgW:56, svgH:36 },
    { displayId:"T115", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:1016, svgY:280, svgW:56, svgH:36 },
    { displayId:"T116", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:1090, svgY:280, svgW:56, svgH:36 },
    { displayId:"T117", capacity:4, svgShape:"booth", section:Section.PATIO, svgX:1164, svgY:280, svgW:56, svgH:36 },
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

  // Seed default message templates — matches the wording previously
  // hardcoded in reservation-detail-panel.tsx, now editable by admins via
  // the Messages tab and shared as a single source of truth with the
  // reservation quick-send buttons. {{placeholder}} tokens are substituted
  // at send time by renderTemplate() in src/lib/utils/index.ts.
  const templateData = [
    { name: "Confirm", channel: "EMAIL" as const, subject: "Your reservation is confirmed",
      body: "Hi {{firstName}},\n\nYour reservation at Hive Buckhead is confirmed for {{date}} at {{time}}, party of {{partySize}}.\n\nRSVP # {{rsvpCode}}\n\nHive Buckhead" },
    { name: "Confirm", channel: "SMS" as const, subject: null,
      body: "Hi {{firstName}}! Confirmed: Hive Buckhead {{date}} at {{time}}, party of {{partySize}}. RSVP #{{rsvpCode}}" },
    { name: "Reminder", channel: "EMAIL" as const, subject: "Reminder: your reservation today",
      body: "Hi {{firstName}},\n\nReminder: your Hive Buckhead reservation is today at {{time}} for {{partySize}}.\n\nHive Buckhead" },
    { name: "Reminder", channel: "SMS" as const, subject: null,
      body: "Hi {{firstName}}, reminder: your Hive Buckhead table is today at {{time}} 🍸" },
    { name: "Thank You", channel: "EMAIL" as const, subject: "Thank you for dining with us",
      body: "Hi {{firstName}},\n\nThank you for dining with us at Hive Buckhead!\n\nHive Buckhead" },
    { name: "Thank You", channel: "SMS" as const, subject: null,
      body: "Hi {{firstName}}! Thank you for dining at Hive Buckhead — hope to see you again! 🥂" },
  ]
  for (const t of templateData) {
    const existing = await prisma.messageTemplate.findFirst({ where: { name: t.name, channel: t.channel } })
    if (!existing) await prisma.messageTemplate.create({ data: t })
  }

  console.log("✅ Seed complete!");
  console.log(`   Staff: ${staffData.length}`);
  console.log(`   Tables: ${tablesData.length}`);
  console.log(`   Operating hours: 7 days`);
  console.log(`   Message templates: ${templateData.length}`);
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
