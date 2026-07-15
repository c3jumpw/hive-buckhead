// src/lib/utils/index.ts
// Shared utility functions. Keep these pure — no side effects, no imports from app code.

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";

// ── Tailwind class merging (required by shadcn) ────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── CSV export ──────────────────────────────────────────────────────────────
// Shared by the Analytics and Staff Intelligence export buttons (2026-07-16).
// Reservations' own export (reservations-client.tsx) predates this and
// builds its CSV inline the same way — left as-is rather than refactored,
// to avoid touching a working feature for a pure DRY cleanup.
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [headers, ...rows]
    .map(row => row.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  a.download = filename;
  a.click();
}

// ── RSVP code generation ───────────────────────────────────────────────────
// 8-character alphanumeric, no ambiguous chars (0/O, 1/I/L)

const RSVP_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRsvpCode(): string {
  return Array.from(
    { length: 8 },
    () => RSVP_CHARS[Math.floor(Math.random() * RSVP_CHARS.length)]
  ).join("");
}

// ── Date & time formatting ─────────────────────────────────────────────────

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "M/d/yyyy");
}

export function formatDateLong(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "EEEE, MMMM d, yyyy");
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE, MMM d");
}

export function formatTime(time: string): string {
  // Input: "19:30" → Output: "7:30 PM"
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

export function formatTimeCompact(time: string): string {
  // Input: "19:30" → Output: "7:30p"
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "p" : "a";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")}${period}`;
}

// 2026-07-16 addition — for real DateTime fields like Reservation.seatedAt /
// completedAt, which (unlike arrivalTime) are actual timestamps, not a
// "HH:MM" string. formatTime() above would silently produce garbage if
// handed one of these instead of an arrivalTime-style string.
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "M/d, h:mm a");
}

// Same use case as formatDateTime, but time-only — for table/kanban cells
// that sit next to a column that already shows the reservation's date, so
// repeating the date on every Seated/Exit cell would just be noise.
export function formatTimeOnly(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "h:mm a");
}

export function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

export function shiftHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

// ── Name helpers ───────────────────────────────────────────────────────────

export function fullName(first: string, last: string): string {
  return `${first} ${last}`.trim();
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

// ── Status display helpers ─────────────────────────────────────────────────

import type { ReservationStatus, Section, TableState } from "@/types";

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  REQUESTED: "RSVP Requested",
  CONFIRMED: "RSVP Confirmed",
  SEATED: "Seated",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  CHANGE_REQUESTED: "Change Requested",
  CANCELLATION_REQUESTED: "Cancellation Requested",
};

export const STATUS_COLORS: Record<
  ReservationStatus,
  { bg: string; text: string; dot: string }
> = {
  REQUESTED: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    dot: "bg-amber-400",
  },
  CONFIRMED: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    dot: "bg-blue-400",
  },
  SEATED: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    dot: "bg-purple-400",
  },
  COMPLETED: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    dot: "bg-green-400",
  },
  CANCELLED: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    dot: "bg-red-400",
  },
  CHANGE_REQUESTED: {
    bg: "bg-teal-500/10",
    text: "text-teal-400",
    dot: "bg-teal-400",
  },
  CANCELLATION_REQUESTED: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    dot: "bg-amber-400",
  },
};

export const SECTION_LABELS: Record<Section, string> = {
  FINE_DINING: "Fine Dining",
  BAR: "Bar",
  DEN: "Den / Lounge",
  PATIO: "Patio",
};

export const SECTION_ICONS: Record<Section, string> = {
  FINE_DINING: "🍽",
  BAR: "🍸",
  DEN: "🪑",
  PATIO: "☀️",
};

export const TABLE_STATE_COLORS: Record<
  TableState,
  { fill: string; stroke: string; text: string; label: string }
> = {
  AVAILABLE: {
    fill: "rgba(76,175,130,.18)",
    stroke: "rgba(76,175,130,.72)",
    text: "#5FC090",
    label: "OPEN",
  },
  SEATED: {
    fill: "rgba(155,126,200,.28)",
    stroke: "rgba(155,126,200,.88)",
    text: "#C4B0E8",
    label: "SEATED",
  },
  RESERVED: {
    fill: "rgba(212,160,32,.25)",
    stroke: "rgba(212,160,32,.8)",
    text: "#E8C040",
    label: "RSVD",
  },
  DIRTY: {
    fill: "rgba(196,82,74,.25)",
    stroke: "rgba(196,82,74,.8)",
    text: "#D87070",
    label: "BUS",
  },
  MAINTENANCE: {
    fill: "rgba(107,94,74,.25)",
    stroke: "rgba(107,94,74,.5)",
    text: "#A89B84",
    label: "MAINT",
  },
};

// ── Currency ───────────────────────────────────────────────────────────────

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Misc ───────────────────────────────────────────────────────────────────

export function pluralize(count: number, word: string): string {
  return `${count} ${count === 1 ? word : word + "s"}`;
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + "…" : str;
}

// ── Access level helper (safe for client + server) ────────────────────────

const ACCESS_LEVEL_ORDER: Record<string, number> = {
  STAFF: 1,
  MANAGER: 2,
  OWNER: 3,
  // Legacy aliases — kept so old data/links still resolve to a sane rank
  FLOOR: 1,
  ADMIN: 3,
};

export function hasAccess(
  userLevel: string,
  required: string
): boolean {
  return (ACCESS_LEVEL_ORDER[userLevel] ?? 0) >= (ACCESS_LEVEL_ORDER[required] ?? 0);
}

// ── Message template rendering ──────────────────────────────────────────────

/**
 * Substitutes {{placeholder}} tokens in a message template with real values.
 * Used by both the admin template editor's preview and the actual send path
 * (reservation-detail-panel.tsx), so what an admin sees while editing matches
 * exactly what a guest receives — no separate rendering logic to drift apart.
 *
 * @param template - raw template body/subject containing zero or more
 *   {{key}} tokens (e.g. "Hi {{firstName}}, see you at {{time}}!")
 * @param vars - key/value map of substitutions. Unmatched tokens in the
 *   template (a key present in the text but not in `vars`) are left as-is
 *   rather than silently deleted — this makes a missing variable visible
 *   and debuggable instead of producing a confusing blank in the message.
 * @returns the template with all matching tokens replaced
 */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match
  )
}

// ── Local (not UTC) date string ─────────────────────────────────────────────

/**
 * Returns today's date as "YYYY-MM-DD" in the BROWSER'S LOCAL timezone.
 *
 * BUG HISTORY (2026-07-15): the codebase had 11 separate occurrences of
 * `new Date().toISOString().split("T")[0]` across 8 files, all computing
 * "today" this way. .toISOString() ALWAYS converts to UTC regardless of
 * the caller's local timezone. Atlanta is UTC-4 in July (EDT) — between
 * roughly 8 PM and midnight Eastern, UTC has already rolled over to
 * tomorrow's calendar date. This meant the "Today" filter on the
 * Reservations page (and every other "today" computation in the app)
 * silently excluded evening reservations — exactly the hours a restaurant
 * is busiest — pushing them into "Past" instead, hours before the actual
 * local midnight.
 *
 * Fixed by reading local date components (getFullYear/getMonth/getDate)
 * instead of forcing a UTC conversion. All 11 call sites now use this
 * single shared function instead of each reimplementing the same
 * (buggy) inline logic.
 *
 * @param d - optional Date to convert; defaults to right now
 * @returns "YYYY-MM-DD" in local time
 */
export function todayLocal(d: Date = new Date()): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
