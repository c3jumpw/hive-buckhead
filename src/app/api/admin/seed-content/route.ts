/**
 * src/app/api/admin/seed-content/route.ts
 * =============================================================================
 * POST — one-time content seed for two things added 2026-07-16:
 *   1. Four new message templates (Table Ready, Running Late, Review
 *      Request, Special Occasion) alongside the existing Confirm/
 *      Reminder/Thank You set.
 *   2. The initial real Resource Hub guide set, replacing the three
 *      placeholder guides the static-file version shipped with.
 *
 * Idempotent — checks by name/title before creating, so running this
 * twice (or after some guides have already been hand-edited) won't
 * duplicate anything. MANAGER/OWNER only, same as Load Sample Data.
 * =============================================================================
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAdmin } from "@/lib/auth/session"

const NEW_TEMPLATES = [
  { name: "Table Ready", channel: "SMS" as const, subject: null,
    body: "Hi {{firstName}}, your table is ready! Please see the host stand when you arrive. — Hive Buckhead" },
  { name: "Running Late", channel: "SMS" as const, subject: null,
    body: "Thanks for letting us know, {{firstName}} — we'll hold your table for {{partySize}} for up to 15 minutes. See you soon!" },
  { name: "Review Request", channel: "EMAIL" as const, subject: "How was your visit, {{firstName}}?",
    body: "Hi {{firstName}},\n\nThank you for dining with us! We'd love to hear how your visit went — a quick review helps our team and lets other guests know what to expect.\n\n[Leave a Google Review] · [Leave a Yelp Review]\n\nWe hope to see you again soon.\n\nWarmly,\nHive Buckhead" },
  { name: "Review Request", channel: "SMS" as const, subject: null,
    body: "Hi {{firstName}}, thanks for dining with us! We'd love a quick review if you have a moment: [review link]" },
  { name: "Special Occasion", channel: "EMAIL" as const, subject: "Celebrating with you, {{firstName}}!",
    body: "Hi {{firstName}},\n\nWe saw you're celebrating with us and wanted to say we can't wait to help make it special. Let your server know if there's anything specific we can do for the occasion.\n\nSee you on {{date}} at {{time}}!\n\nHive Buckhead" },
  // 2026-07-16 addition, part of the no-show correction — distinct from
  // Review Request, deliberately not accusatory ("no-show" language stays
  // internal-only, in the activity log and this file's comments; the
  // guest-facing copy just says we missed them).
  { name: "We Missed You", channel: "EMAIL" as const, subject: "We missed you, {{firstName}}!",
    body: "Hi {{firstName}},\n\nWe had your reservation for {{date}} at {{time}} but didn't get to see you — we hope everything's alright.\n\nWe'd love to have you another time. Feel free to book whenever works: [Book Again]\n\nHive Buckhead" },
  { name: "We Missed You", channel: "SMS" as const, subject: null,
    body: "Hi {{firstName}}, we had your reservation for {{date}} but missed you — hope all's well. We'd love to have you another time!" },
]

const NEW_GUIDES = [
  {
    title: "Getting Started: Home & Your Access", category: "Basics", minAccessLevel: "STAFF", pinned: true, sortOrder: 0,
    body: `Home is the first thing you see after logging in, no matter your role.

Quick Links (top of Home) take you to the pages you're allowed to use — everyone gets Reservations, Floor View, and Staff Schedule; Managers and Owners also get Admin Dashboard and Analytics. If a link isn't there, your account doesn't have access to it — ask a manager if you think that's wrong.

Team Announcements (also on Home) shows what's new, with unread ones highlighted and badged. Announcements can also arrive by email with a link straight back here.

The other tabs: My Schedule (your own upcoming shifts), Resources (this guide hub), Send Feedback (a message straight to management, anonymous if you want), and My Profile (your contact info and PIN).

Regular staff have read-only access to Reservations, Floor View, and Staff Schedule — you can see everything, but changes (confirming a reservation, editing the floor plan, adjusting shifts) need a Manager or Owner.`,
  },
  {
    title: "Working the Reservations List & Kanban", category: "Front of House", minAccessLevel: "STAFF", pinned: false, sortOrder: 1,
    body: `The Reservations page has two views, switchable at the top: List and Kanban.

List is a sortable table — good for scanning a lot of reservations at once, searching by name/phone/RSVP code, and filtering by date, status, or server. Completed reservations are hidden here by default (they're done, not part of what you're actively working) — check "Show completed" in the toolbar if you need to see them.

Kanban shows reservations as cards grouped into columns by status — Requested, Confirmed, Seated, Completed, Cancelled. This is better for a quick visual sense of where everything stands right now. Completed always shows here as its own column.

Click any reservation (either view) to open its detail panel: guest info, party size, dietary/allergy notes, current status, seated/exit times once applicable, message history, and an Activity log of everything that's happened to that reservation — who confirmed it, when it was seated, any messages sent.

Status meanings: Requested (submitted, needs review) → Confirmed (locked in) → Seated (guest has arrived) → Completed (table closed out, order logged) — or Cancelled at any point before Completed. Change Requested / Cancellation Requested show up when a guest asks to modify or cancel via their confirmation email link, and need a Manager/Owner to approve or deny.`,
  },
  {
    title: "Using Floor View", category: "Front of House", minAccessLevel: "STAFF", pinned: false, sortOrder: 2,
    body: `Floor View shows the physical layout of the restaurant — every table, its section, and current state at a glance.

Table colors/states: Available (open), Reserved (assigned to an upcoming reservation), Seated (occupied right now), Dirty (needs bussing before it's available again), Maintenance (out of service).

Click a table to see which reservation (if any) is currently assigned to it. This is the fastest way to answer "which table is that guest at" or "what's free right now" without digging through the reservations list.

Regular staff have view-only access here — seeing table status doesn't require Manager access, but changing a table's state, moving a reservation to a different table, or editing the floor layout itself does.`,
  },
  {
    title: "Using the Floor Editor", category: "Administration", minAccessLevel: "MANAGER", pinned: false, sortOrder: 3,
    body: `The Floor Editor (Admin → Tables & Sections) is where the physical floor plan itself gets built and adjusted — separate from Floor View, which just shows live status.

Here you can add, move, resize, or remove tables; assign each one to a section (Fine Dining, Bar, Den, Patio); set capacity; and mark a table active/inactive if it's temporarily out of use (a broken chair, a private event holding it, etc.) without deleting it entirely.

Changes here affect what's available for staff to assign reservations to — a table marked inactive won't show as bookable. This is infrequent, setup-style work, not a daily task — most day-to-day table status changes (seating a walk-in, marking a table dirty) happen from Floor View or the reservation detail panel instead, not here.`,
  },
  {
    title: "Updating & Altering Team Member Schedules", category: "Staff Management", minAccessLevel: "MANAGER", pinned: false, sortOrder: 4,
    body: `There are two layers to scheduling: each staff member's default recurring weekly schedule, and the actual day-by-day Staff Schedule page.

Recurring schedule: set from Staff List — click Schedule next to a staff member to set their standard weekly pattern (which days they typically work, and their usual shift times). This is the template; it doesn't create actual shifts by itself.

Staff Schedule page: shows real, specific shifts — prefilled from each person's recurring pattern, but fully editable from here for one-off changes (someone's covering an extra shift, swapping a day, a holiday schedule). Click any entry to edit times, mark a call-out, or remove it entirely. Times display in standard (not military) time.

To log a callout: open the shift on the Staff Schedule page and mark it — this feeds into that staff member's record and the HR data export (Team Management → Export Onboarding/Offboarding/Callouts), so patterns are visible over time, not just in the moment.`,
  },
  {
    title: "Guest Communication: Templates, Automated Messages & Quo", category: "Guest Communication", minAccessLevel: "MANAGER", pinned: false, sortOrder: 5,
    body: `There are two ways guests get messaged: automatically, by the system, at specific points in a reservation's life — and manually, by staff, from a reservation's detail panel.

Automatic emails currently fire on: RSVP submitted (a "received" email if it needs review, or a "confirmed" email if auto-confirm is on), a Manager/Owner manually confirming a reservation, and cancellation (either guest- or staff-initiated). Each of these also updates that guest's tags in Systeme.io — confirmed reservations get tagged "past-customer," cancelled ones get tagged "inquirer" — which is what feeds Systeme.io campaigns later (see the Marketing card on the Messages tab for the direct link).

Manual messages: open any reservation → Message Guest → pick Email or SMS → choose a template → you'll see a preview before it actually sends. Templates are editable without touching code — Admin → Messages — using tags like {{firstName}}, {{date}}, {{time}}, {{partySize}}, and {{rsvpCode}}, which get swapped for the real values at send time.

Every message — automatic or manual — shows up in Settings → Recent Sends (admin-wide) and on that specific reservation's own Activity log, including the real failure reason if a send didn't go through.

Quo handles SMS specifically — the Quo card on the Messages tab links directly to the Quo inbox for viewing full text conversation threads (replies, ongoing back-and-forth) beyond what a single outbound send from here shows.`,
  },
  {
    title: "Conducting & Completing Staff Onboarding", category: "Staff Management", minAccessLevel: "MANAGER", pinned: false, sortOrder: 6,
    body: `New hires go through an invite-based flow rather than being created active on the spot.

1. Staff List → Invite New Staff. Enter their name, email, role, and access level — no PIN needed yet, they'll choose their own.
2. They get an email with a link to the onboarding portal and the current portal access code included, so the whole thing is self-contained — nothing needs to be communicated separately.
3. Until they complete that form, they show up in Staff List with an "Invited — awaiting onboarding" badge and a Resend Invite option if needed.
4. Once they submit it, they move to Team Management → Pending Approvals for review — same review step as anyone who found the portal on their own.
5. Approve or reject from there. Approving flips their account active and sends them an approval email; rejecting keeps the record (for audit) but they stay inactive.

Rehires: if someone who was previously offboarded (or previously rejected) is invited or submits again with the same email, the system recognizes that and lets them start fresh rather than blocking it as a duplicate account.`,
  },
  {
    title: "Exporting Data & Reports", category: "Administration", minAccessLevel: "MANAGER", pinned: false, sortOrder: 7,
    body: `Exports live next to the data they cover, not in one central menu.

Reservations: Reservations page sidebar → Export CSV — exports whatever's currently filtered/visible in list view.
Staff Intelligence: Analytics → Staff Intelligence → Export Report — per-staff performance (revenue, covers, tips, show rate, shifts, callouts).
Analytics: Analytics page → Export CSV — revenue and booking-pattern summary, respecting whatever date range is applied on screen.
Full Staff Roster: Staff List → Export CSV — everyone, including invited and terminated, with a status column and dates the on-screen list doesn't show.
Onboarding/Offboarding/Callouts: Team Management → Export Onboarding/Offboarding/Callouts — one combined file covering all three.
Admin Activity Log: Settings → Admin Activity → Export CSV — every staff/settings change and who made it.`,
  },
  {
    title: "Admin Settings: Integrations & System Health", category: "Administration", minAccessLevel: "OWNER", pinned: false, sortOrder: 8,
    body: `Settings is where system-level configuration lives, separate from day-to-day operational settings (Hours, Tables, etc.).

Integration Settings lets you view (masked) and edit the SendGrid, Quo, and Systeme.io API keys directly — no redeploy needed. Saving requires your PIN. Google Sheets and the database connection stay managed through Vercel's environment variables, since those are multi-line credentials rather than a single token.

Integration Status shows whether each service has a credential configured at all — "configured" only means a key is present, not that it's confirmed working; an invalid key or unverified sender can still fail sends even when this shows green.

Recent Sends shows the last several message attempts system-wide with real success/failure reasons — this is the fastest way to diagnose "why didn't that email go out."

Admin Activity Log is the master edit trail — every staff change, onboarding decision, and settings edit, with who did it and when, exportable.

Reset Reservations (Owner only) permanently clears all reservation data — for a one-time clean start before launch, not routine use.`,
  },
]

export async function POST() {
  const session = await requireAdmin()

  let templatesCreated = 0
  for (const t of NEW_TEMPLATES) {
    const existing = await prisma.messageTemplate.findFirst({ where: { name: t.name, channel: t.channel } })
    if (!existing) {
      await prisma.messageTemplate.create({ data: t })
      templatesCreated++
    }
  }

  let guidesCreated = 0
  for (const g of NEW_GUIDES) {
    const existing = await prisma.guide.findFirst({ where: { title: g.title } })
    if (!existing) {
      await prisma.guide.create({ data: { ...g, minAccessLevel: g.minAccessLevel as any, authorId: session.id, authorName: session.name } })
      guidesCreated++
    }
  }

  return NextResponse.json({ templatesCreated, guidesCreated })
}
