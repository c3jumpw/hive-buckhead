// src/lib/utils/index.ts
// Shared utility functions. Keep these pure — no side effects, no imports from app code.

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";

// ── Tailwind class merging (required by shadcn) ────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
