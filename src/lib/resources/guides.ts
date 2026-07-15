/**
 * src/lib/resources/guides.ts
 * =============================================================================
 * Resource Hub content — guides shown on the Home page's Resources tab.
 *
 * This is a plain array on purpose, not a database table: guides are edited
 * by whoever maintains the app, not by staff through a UI, so a source file
 * is the simplest place for them to live and the easiest to hand a batch of
 * real content to later ("we can develop the guides last").
 *
 * ACCESS RESTRICTION: minAccessLevel controls who sees a guide at all. The
 * Resource Hub component filters this array with the same hasAccess() check
 * already used to hide Admin/Analytics nav links and gate read-only
 * reservations — a guide marked "MANAGER" simply never renders for a STAFF
 * account, same pattern as everywhere else in the app. There is no
 * "locked/grayed out" state — restricted guides are just absent, not shown
 *-but-disabled, matching how the rest of the app already handles this.
 *
 * TO ADD A REAL GUIDE: append an entry below. `body` supports plain text
 * with blank-line paragraph breaks (rendered via whitespace-pre-line, same
 * as announcements) — no markdown processor wired up, so keep formatting
 * simple, or ask to have richer formatting added if a guide needs it.
 *
 * The three entries below are placeholders that demonstrate the pattern
 * (one STAFF-visible, one MANAGER+-only) — replace or add to them with the
 * real guide list.
 * =============================================================================
 */
import type { AccessLevel } from "@/types"

export interface Guide {
  id: string
  title: string
  category: string
  minAccessLevel: AccessLevel
  summary: string
  body: string
}

export const GUIDES: Guide[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    category: "Basics",
    minAccessLevel: "STAFF",
    summary: "A quick tour of Home, your schedule, and where everything lives.",
    body: `This is a placeholder guide — replace with real content.

Covers: what's on the Home tab, checking your schedule, reading announcements, sending feedback, and updating your profile.`,
  },
  {
    id: "reservations-basics",
    title: "Working a Reservation",
    category: "Front of House",
    minAccessLevel: "STAFF",
    summary: "Viewing the reservations list and floor plan day-to-day.",
    body: `This is a placeholder guide — replace with real content.

Covers: reading the reservations list and kanban view, checking the floor plan, and what each status means.`,
  },
  {
    id: "exporting-data",
    title: "Exporting Data & Reports",
    category: "Administration",
    minAccessLevel: "MANAGER",
    summary: "Where each export lives and what it includes.",
    body: `This is a placeholder guide — replace with real content.

Covers: exporting the reservations list, the Staff Intelligence report, and the Analytics summary — what's in each one and when to use which.`,
  },
]
