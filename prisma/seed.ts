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

// =============================================================================
// MENU SEED — Pre-populate with all items from the existing WordPress menu
// Run with: npm run db:seed
// =============================================================================

  console.log("Seeding menu sections and items...")

  // Wipe existing menu data to avoid duplicates
  await prisma.menuItem.deleteMany()
  await prisma.menuSection.deleteMany()

  const menuData = [
    {
      name: "Brunch",
      description: "All day, every day · Substituted sides on fixed entrées may have an upcharge",
      sortOrder: 0,
      items: [
        { name: "Chicken Burger", price: 18.5, desc: "Fried chicken breast, american cheese, lettuce, tomato, onions, hive house aioli. Flavors: BBQ, Buffalo, Plain. Choice of fries or sweet fries (+$4)" },
        { name: "Catfish Burger", price: 18.5, desc: "Fried catfish filet, lettuce, tomato, onions, hive house aioli, tartar sauce, coleslaw. Choice of fries or sweet fries (+$4)" },
        { name: "Smash Burger", price: 23.5, desc: "Smashed ground beef, american cheese, arugula, onions, pickles, house burger sauce. Choice of fries or sweet fries (+$4)" },
        { name: "Breakfast Cheeseburger", price: 27, desc: "Ground beef patty, lettuce, tomato, hive burger sauce, avocado spread, any egg choice, bacon. Choice of grits, fries, sweet fries (+$4), or breakfast potatoes (+$6)" },
        { name: "Vegan Burger", price: 30, desc: "Veggie patty, lettuce, tomato, vegan house mayo, choice of vegan mozzarella or vegan cheddar. Choice of fries, sweet fries (+$4), or brussels sprouts (+$9)" },
        { name: "Wagyu Burger", price: 45, desc: "Ground wagyu beef, american cheese, lettuce, tomato, caramelized onions, mushrooms, house mayo. Temp: medium / medium well" },
        { name: "Lobster & Crab Grilled Cheese Panini", price: 33, desc: "Lobster and lump crab grilled cheese on french bread, served with fries" },
        { name: "Catfish & Grits", price: 20.5, desc: "2 fried catfish filets, southern styled grits, creole sauce (contains dairy)" },
        { name: "Whiting & Grits", price: 20.5, desc: "2 fried whiting filets, southern styled grits, creole sauce (contains dairy)" },
        { name: "Shrimp & Grits", price: 20.5, desc: "Shrimp sautéed with garlic, lemon juice, and butter, southern styled grits (contains dairy)" },
        { name: "Salmon & Grits", price: 35, desc: "8oz salmon, southern styled grits, creamy house sauce (contains dairy)" },
        { name: "Red Snapper & Grits", price: 60, desc: "1 lb whole or filet fried snapper, southern styled grits, creamy house sauce" },
        { name: "Lobster Tail & Grits", price: 65, desc: "Petite lobster tail, southern styled grits, creamy house sauce" },
        { name: "Cajun Pasta", price: 25.5, desc: "Creamy red spicy cajun alfredo linguine, onions, bell peppers, topped with chicken or shrimp" },
        { name: "Fried Shrimp Tacos", price: 14, desc: "Flour tortillas, fried gulf shrimp, veggie blend, house aioli, pico de gallo" },
        { name: "Avocado Toast", price: 15, desc: "Toasted brioche, avocado spread, any egg choice, topped with micro greens" },
        { name: "Pecan Banana Foster French Toast", price: 18.5, desc: "4 slices toasted brioche, bananas, strawberries, cream cheese, foster sauce, caramelized pecans" },
        { name: "Hive Omelet", price: 19.5, desc: "2 eggs, spinach, pico de gallo, bell peppers. Choice of grits, fries, sweet fries (+$4), or breakfast potatoes (+$6)" },
        { name: "10 Wings & Fries", price: 20, desc: "Deep fried split wings (5 flat/5 drum) with fries. Sauce: hive, lemon pepper, mild, hot, plain, or jerk" },
        { name: "Chicken & Waffles", price: 27.5, desc: "2 whole wings with waffle: Red Velvet · Banana Nut · Belgian" },
        { name: "Steak & Eggs", price: 33, desc: "16oz ribeye grilled and seasoned to perfection, 2 eggs. Choice of grits, fries, or sweet fries (+$4)" },
        { name: "Whole Fried Red Snapper", price: 50, desc: "1 lb whole snapper, lemon butter garlic sauce, kale, choice of grits or rice" },
        { name: "Chef's Whole Branzino or Branzino Filet", price: 55, desc: "Oven and grilled branzino in hive sauce with onions, capers, and seasonal vegetables", featured: true },
      ]
    },
    {
      name: "Appetizers & Salads",
      description: "Small plates and starters",
      sortOrder: 1,
      items: [
        { name: "Salmon Bites", price: 14, desc: "Fresh salmon cubed, seasoned with hive seasoning, fried and served with aioli" },
        { name: "Chips & Salsa", price: 15, desc: "Housemade hot chips with house seasoning, served with salsa" },
        { name: "Hummus & Pita", price: 16, desc: "Delicious hummus served with naan bread" },
        { name: "Calamari", price: 16.5, desc: "Calamari tubes and tentacles, jalapeño and banana peppers, marinara or aioli" },
        { name: "Wings", price: 20, desc: "Tossed in hive sauce and lemon pepper, served with fries" },
        { name: "Chicken Egg Rolls", price: 24, desc: "House-made, served with aioli" },
        { name: "Salmon Egg Rolls", price: 24, desc: "House-made, served with aioli" },
        { name: "Crab Cakes", price: 25, desc: "Hive lump crab cakes, fried, with house aioli" },
        { name: "Artichoke & Spinach Dip", price: 25, desc: "House made spinach dip served with hot fresh chips" },
        { name: "Beet Salad", price: 15, desc: "Arugula, fresh beets, onions, blue cheese, balsamic vinaigrette" },
        { name: "Cobb Salad", price: 15, desc: "Garden mix, grilled chicken, hard-boiled egg, bacon bits, blue cheese crumbles" },
        { name: "Caesar Salad", price: 15, desc: "Romaine, croutons, parmesan cheese" },
        { name: "House Salad", price: 15, desc: "Lettuce, onions, tomatoes, croutons, parmesan cheese" },
        { name: "Spinach Berry Salad", price: 15, desc: "Spinach, blueberries, strawberries, onions, croutons, parmesan, raspberry vinaigrette" },
      ]
    },
    {
      name: "Dinner & Entrées",
      description: "Mon–Thu from 5 PM · Fri–Sun from 6 PM",
      sortOrder: 2,
      items: [
        { name: "Chicken Burger", price: 18.5, desc: "Fried chicken breast, american cheese, lettuce, tomato, onions, hive house aioli — BBQ, Buffalo, or Plain" },
        { name: "Catfish Burger", price: 18.5, desc: "Fried catfish filet, lettuce, tomato, onions, hive house aioli, tartar sauce, coleslaw" },
        { name: "Smash Burger", price: 23.5, desc: "Mashed ground beef, american cheese, arugula, onions, pickles, house burger sauce" },
        { name: "Vegan Burger", price: 30, desc: "Veggie patty, lettuce, tomato, vegan house mayo, choice of vegan mozzarella or vegan cheddar" },
        { name: "Wagyu Burger", price: 45, desc: "Ground wagyu beef, american cheese, lettuce, tomato, caramelized onions, mushrooms, house mayo. Temp: medium or medium well only" },
        { name: "Catfish & Grits", price: 25, desc: "2 fried catfish filets, southern styled grits, creole sauce (contains dairy)" },
        { name: "Whiting & Grits", price: 25, desc: "2 fried whiting filets, southern styled grits, creole sauce (contains dairy)" },
        { name: "Shrimp & Grits", price: 25, desc: "Shrimp sautéed with garlic, lemon juice, and butter, southern styled grits (contains dairy)" },
        { name: "Salmon & Grits", price: 35, desc: "8oz salmon, southern styled grits, creamy house sauce" },
        { name: "Red Snapper & Grits", price: 60, desc: "1 lb whole or filet fried snapper, southern styled grits, creamy house sauce" },
        { name: "Lobster Tail & Grits", price: 65, desc: "Petite lobster tail, southern styled grits, creamy house sauce" },
        { name: "Jerk Pasta or Hive Pasta", price: 38, desc: "Creamy alfredo penne, onions, spinach, tomatoes, parmesan — topped with salmon or chicken" },
        { name: "Lobster & Shrimp Pasta", price: 50, desc: "Choice of hive or jerk creamy alfredo penne, topped with lobster and shrimp" },
        { name: "Chicken & Waffles", price: 27.5, desc: "2 whole wings with waffle: Red Velvet · Banana Nut · Belgian" },
        { name: "Hive South", price: 35, desc: "3 whole wings served with hive collard greens and sweet yams" },
        { name: "Hive Prawns", price: 35, desc: "Succulent prawns in cajun sauce, served with hive fried rice" },
        { name: "Salmon & Shrimp", price: 40, desc: "Fresh salmon fillet and grilled blackened shrimp, served with choice of side" },
        { name: "Chilean Seabass", price: 45, desc: "Pan seared and lightly grilled seabass, breadcrumb parmesan crusted, with seasonal vegetables", featured: true },
        { name: "Whole Fried Red Snapper", price: 50, desc: "1 lb whole snapper, lemon butter garlic sauce, served with choice of side" },
        { name: "Steak & Shrimp", price: 50, desc: "16oz ribeye grilled to perfection with succulent grilled shrimp, choice of side" },
        { name: "Short Ribs", price: 55, desc: "Succulent beef short ribs seasoned with a blend of spices, sweet sauce, seasonal vegetables", featured: true },
        { name: "Lamb Chops & Shrimp", price: 55, desc: "Tender lamb chops and succulent shrimp grilled, topped with hive Jack Daniel's sauce", featured: true },
        { name: "Chef's Whole Branzino or Branzino Filet", price: 55, desc: "Oven and grilled branzino in hive sauce with onions, capers, and seasonal vegetables" },
        { name: "Parmesan Mashed Potatoes", price: 8, desc: "Signature side" },
        { name: "Creole Rice", price: 8, desc: "Signature side" },
        { name: "Herb Rice", price: 8, desc: "Signature side" },
        { name: "Side Plantains", price: 8, desc: "Signature side" },
        { name: "Asparagus", price: 10, desc: "Signature side" },
        { name: "Parmesan Fries", price: 10, desc: "Signature side" },
        { name: "Broccoli", price: 12, desc: "Signature side" },
        { name: "Brussels Sprouts", price: 12, desc: "Signature side" },
        { name: "Sautéed Spinach & Mushrooms", price: 12, desc: "Signature side" },
        { name: "Mac & Cheese", price: 15, desc: "Signature side" },
        { name: "Crab Mac", price: 20, desc: "Signature side" },
        { name: "Lobster Mac", price: 26, desc: "Signature side" },
      ]
    },
    {
      name: "Happy Hour",
      description: "Mon–Fri 4 PM–9 PM · Sunday 6 PM–Midnight · No Saturday Happy Hour",
      sortOrder: 3,
      availableDays: "Mon,Tue,Wed,Thu,Fri,Sun",
      availableFrom: "16:00",
      availableTo: "21:00",
      items: [
        { name: "Tacos", price: 2, desc: "Happy hour special" },
        { name: "Tostones", price: 5, desc: "Happy hour special" },
        { name: "Shot Specials", price: 5, desc: "Happy hour special" },
        { name: "Churros", price: 7, desc: "Happy hour special" },
        { name: "Chips & Salsa", price: 7, desc: "Happy hour special" },
        { name: "Mozzarella Cheese Sticks", price: 7, desc: "Happy hour special" },
        { name: "Fried Mushrooms", price: 7, desc: "Happy hour special" },
        { name: "Mac Bites", price: 7, desc: "Happy hour special" },
        { name: "Veggie Spring Rolls", price: 7, desc: "Happy hour special" },
        { name: "Plantains", price: 8, desc: "Happy hour special" },
        { name: "Lamb Chops", price: 10, desc: "Happy hour special" },
        { name: "Steak Frites", price: 10, desc: "Happy hour special" },
        { name: "Pasta & Chicken", price: 10, desc: "Happy hour special" },
        { name: "Chicken & Waffle", price: 10, desc: "Happy hour special" },
        { name: "Roasted Chicken & Rice", price: 10, desc: "Happy hour special" },
        { name: "Burger & Fries", price: 10, desc: "Happy hour special" },
        { name: "Daiquiri Specials", price: null, desc: "Ask your server" },
        { name: "Bottle Specials", price: 75, desc: "Bottle service special" },
      ]
    },
    {
      name: "Cocktails & Drinks",
      description: "Full bar available · 21+ to consume alcohol",
      sortOrder: 4,
      items: [
        { name: "Georgia Peach", price: 15, desc: "Peach vodka, peach purée, orange juice", featured: true },
        { name: "Lemon Drop", price: 15, desc: "Vodka, simple syrup, fresh lemon" },
        { name: "Tango With Mango", price: 15, desc: "Vodka, mango purée, Grand Marnier, orange juice" },
        { name: "Sweet Temper", price: 17, desc: "Vodka, strawberry purée, Grand Marnier, cranberry juice" },
        { name: "Twilight Zone", price: 17, desc: "Vodka, Grand Marnier, cranberry juice, lime squeeze" },
        { name: "She's A Keeper", price: 18, desc: "Champagne, vodka, strawberry purée, triple sec — on rocks or frozen" },
        { name: "Love Slide", price: 18, desc: "Vodka, strawberry cream Bailey's" },
        { name: "Atlanta Weather", price: 18, desc: "Vodka, apple pucker, triple sec, melon liqueur, pineapple juice, sprite" },
        { name: "Beekeeper", price: 18, desc: "Whiskey, strawberry purée, lemonade, sprite" },
        { name: "Hive Hummer", price: 18, desc: "Tequila, blue curaçao, sour mix, triple sec — blue margarita style" },
        { name: "Peach Be Still", price: 18, desc: "Crown Royal Peach, sour mix, triple sec, lime juice, peach schnapps" },
        { name: "Merry Margarita", price: 18, desc: "Tequila, sour mix, triple sec, lime juice, pomegranate" },
        { name: "Lust Martini", price: 20, desc: "Vodka lemon drop with watermelon or blueberry liqueur" },
        { name: "Cupid Shuffle", price: 20, desc: "Tequila, rum, sour mix, cranberry juice, triple sec, splash of sprite" },
        { name: "Jaded", price: 20, desc: "Jack Daniel's, peach schnapps, sour mix, cranberry, lime squeezed" },
        { name: "Queen Bee", price: 20, desc: "Tequila, mango purée, orange juice, grenadine" },
        { name: "Peachtree Traffic", price: 20, desc: "Coconut rum, melon liqueur, peach schnapps, OJ, pineapple juice" },
        { name: "Buckhead Tea", price: 20, desc: "Peach vodka, rum, gin, triple sec, sour mix, splash of sprite" },
        { name: "The Festival", price: 20, desc: "Rum, OJ, pineapple juice, lime squeeze, strawberry purée" },
        { name: "Basic Cocktails", price: 15, desc: "Sex On The Beach · Long Island · Blue Motorcycle/BMF · Long Beach · Tokyo Tea · Bahama Mama · Mojito · Margarita · Hennessy Margarita · Tequila Sunrise · Old Fashion · Gimlet · Mai Tai · Cosmopolitan · Moscow Mule · Tom Collins" },
        { name: "Manhattan", price: 17, desc: "Classic cocktail" },
        { name: "Lemon Drop Flight", price: 60, desc: "4 lemon drops: strawberry, regular, blue curaçao, pomegranate. Top shelf: $70" },
        { name: "Margarita Flight", price: 60, desc: "House $60 · Top Shelf $70" },
        { name: "Frozen Daiquiris", price: 18, desc: "Bumble Rumble (blue hawaiian-rum) · Lemon Drop (lemon-vodka) · Abeemination (hurricane-rum) · Frosé (sparkling rosé-vodka) · The Drone (margarita-strawberry-tequila)" },
        { name: "The Hornet", price: 20, desc: "Frozen daiquiri — peach, Hennessy" },
        { name: "Draft Beer — Pint", price: 6.5, desc: "Sweetwater · Stella Artois · Scofflaw · Blue Moon · Angry Orchard · Yuengling" },
        { name: "Draft Beer — Pitcher", price: 26, desc: "Sweetwater · Stella Artois · Scofflaw · Blue Moon · Angry Orchard · Yuengling" },
        { name: "Bottle Beer", price: 8, desc: "Budweiser · Coors Light · Bud Light · Corona · Sweetwater IPA · Guinness · Mich Ultra · Peroni · Dos XX · Heineken · Modelo · Ginger Beer" },
      ]
    },
    {
      name: "Desserts",
      description: "Sweet endings",
      sortOrder: 5,
      items: [
        { name: "Tiramisu Cake", price: 20, desc: "House dessert" },
        { name: "Strawberry Cheesecake", price: 20, desc: "House dessert" },
        { name: "Chocolate Lava Brownie", price: 20, desc: "House dessert" },
        { name: "Chocolate Cake", price: 20, desc: "Gluten free", tags: "gf" },
        { name: "Crème Brûlée Cheesecake", price: 20, desc: "House dessert" },
        { name: "Tres Leches", price: 20, desc: "House dessert" },
        { name: "Classic Cheesecake", price: 20, desc: "House dessert" },
        { name: "Ice Cream", price: 6, desc: "Per scoop: Vanilla · Butter Pecan · Cookies & Cream" },
        { name: "Churros & Ice Cream", price: 20, desc: "House dessert" },
      ]
    },
  ]

  for (const section of menuData) {
    const { items, ...sectionData } = section
    const created = await prisma.menuSection.create({
      data: {
        ...sectionData,
        items: {
          create: items.map((item, idx) => ({
            name: item.name,
            description: item.desc,
            price: item.price ?? undefined,
            tags: (item as { tags?: string }).tags ?? undefined,
            featured: (item as { featured?: boolean }).featured ?? false,
            sortOrder: idx,
          }))
        }
      }
    })
    console.log(`  ✓ ${created.name} (${items.length} items)`)
  }

  console.log("✓ Menu seeded successfully")

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
