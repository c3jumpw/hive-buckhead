/**
 * src/lib/config.ts
 * =============================================================================
 * Centralized application configuration for Hive Buckhead.
 *
 * Purpose:
 *   Single source of truth for all app-wide constants, API endpoints, and
 *   integration settings. Public/non-secret values are hardcoded here to
 *   eliminate manual env var mistakes. Secrets always come from process.env.
 *
 * Data flow:
 *   This file is imported by API routes, server components, and lib modules.
 *   Never import this in client components — use NEXT_PUBLIC_ env vars there.
 *
 * Security note:
 *   Values marked SECRET must never be logged or exposed to the client.
 *   Values marked PUBLIC are safe to include in client-side code.
 * =============================================================================
 */

// =============================================================================
// APP IDENTITY (hardcoded — these never change)
// =============================================================================

export const APP_CONFIG = {
  name: "Hive Buckhead",
  legalName: "Hive Restaurant Buckhead, LLC",
  // Primary domain for the restaurant
  domain: "thehivebuckhead.com",
  // Staff portal subdomain
  staffPortalUrl: "https://staffportal.thehivebuckhead.com",
  // Onboarding portal subdomain
  onboardingUrl: "https://onboarding.thehivebuckhead.com",
  // Public RSVP subdomain
  rsvpUrl: "https://reservations.thehivebuckhead.com",
} as const

// =============================================================================
// SENDGRID (email)
// SECRET: API key comes from env. FROM address hardcoded (safe to embed).
// =============================================================================

export const SENDGRID_CONFIG = {
  // From address — verified sender in SendGrid (em8148.thehivebuckhead.com)
  fromEmail: "reservations@thehivebuckhead.com",
  fromName: "Hive Buckhead",
  // SECRET — loaded from environment variable
  get apiKey() {
    const key = process.env.SENDGRID_API_KEY
    if (!key) throw new Error("SENDGRID_API_KEY environment variable is not set")
    return key
  },
} as const

// =============================================================================
// SYSTEME.IO (CRM)
// Contacts added on RSVP submission with appropriate tags.
// Tag names hardcoded — must match exactly what's in your Systeme.io account.
// =============================================================================

export const SYSTEME_CONFIG = {
  apiUrl: "https://api.systeme.io/api",
  // Tags exactly as they appear in Systeme.io (case-sensitive)
  tags: {
    // Guest completed a full RSVP — confirmed or attended
    pastCustomer: "past-customer",
    // Guest is a repeat or VIP member
    hiveMember: "hive-club-member",
    // Guest started but did not complete an RSVP (future use)
    inquirer: "inquirer",
  },
  // SECRET — loaded from environment variable
  get apiKey() {
    const key = process.env.SYSTEME_IO_API_KEY
    if (!key) throw new Error("SYSTEME_IO_API_KEY environment variable is not set")
    return key
  },
} as const

// =============================================================================
// QUO (customer messaging)
// Inbox URL hardcoded — opens in new tab from dashboard.
// API key for sending messages via Quo (if supported).
// =============================================================================

export const QUO_CONFIG = {
  // Direct link to Hive Buckhead's Quo inbox — opens in new tab
  inboxUrl: "https://my.quo.com/inbox/PNiXqWFx95",
  // SECRET — loaded from environment variable (used if Quo supports API sends)
  get apiKey() {
    return process.env.QUO_API_KEY ?? null  // null = link-only mode, no API sends
  },
} as const

// =============================================================================
// GOOGLE SHEETS (staff records export)
// Spreadsheet ID hardcoded (not a secret — it's in the URL).
// Private key and service account email come from env vars (they are secrets).
// =============================================================================

export const GOOGLE_SHEETS_CONFIG = {
  // The spreadsheet ID from the URL: /spreadsheets/d/{ID}/edit
  spreadsheetId: "1mmLYmcSNZIiyQHFtXVWiF1z3P5DKfQGrhQQM8yndNVE",
  // Sheet tab names within the spreadsheet
  sheets: {
    staff: "Staff Records",
    onboarding: "Onboarding Log",
    offboarding: "Offboarding Log",
  },
  // Service account email (not a secret — it's in the share dialog)
  serviceAccountEmail: "hive-sheets@gen-lang-client-0286055899.iam.gserviceaccount.com",
  // SECRET — private key from service account JSON
  get privateKey() {
    const key = process.env.GOOGLE_PRIVATE_KEY
    if (!key) throw new Error("GOOGLE_PRIVATE_KEY environment variable is not set")
    return key.replace(/\\n/g, "\n")  // Vercel escapes newlines in env vars
  },
} as const

// =============================================================================
// ONBOARDING PORTAL SETTINGS
// Password rotation: weekly (cron triggers this) + manual admin button.
// =============================================================================

export const ONBOARDING_CONFIG = {
  // How many days before the access code auto-rotates
  rotationDays: 7,
  // Code length (characters) for the onboarding portal password
  codeLength: 8,
  // Characters used in random code generation (no ambiguous chars: 0,O,I,l)
  codeCharset: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
} as const

// =============================================================================
// TEAM ID SETTINGS
// Format: AA-001 (2 letters + 3 digits, auto-incremented)
// =============================================================================

export const TEAM_ID_CONFIG = {
  prefix: "HB",   // Hive Buckhead
  digits: 3,      // zero-padded to 3 digits: HB-001, HB-002, etc.
} as const

// =============================================================================
// ACCESS LEVEL FEATURE MATRIX
// Defines which features each access level can use.
// Used by middleware and UI components to show/hide features.
// =============================================================================

export const ACCESS_MATRIX = {
  // Features OWNER can access
  OWNER: [
    "dashboard", "reservations", "floor_view", "floor_editor",
    "analytics", "staff_management", "staff_portal", "schedule_edit",
    "schedule_view", "announcements_send", "feedback_view",
    "onboarding_admin", "offboarding_admin", "settings_system",
    "settings_hours", "positions_manage", "message_blast",
    "quo_link", "reports",
  ],
  // Features MANAGER can access (all except floor_editor and system settings)
  MANAGER: [
    "dashboard", "reservations", "floor_view",
    "analytics", "staff_management", "staff_portal", "schedule_edit",
    "schedule_view", "announcements_send", "feedback_view",
    "onboarding_admin", "offboarding_admin", "settings_hours",
    "message_blast", "quo_link", "reports",
  ],
  // Features STAFF can access (portal only)
  STAFF: [
    "staff_portal", "schedule_view", "announcements_read",
    "feedback_send", "profile_edit",
  ],
} as const

export type FeatureKey = (typeof ACCESS_MATRIX)["OWNER"][number]

/**
 * Check whether an access level includes a specific feature.
 * @param level - The staff member's access level ("OWNER" | "MANAGER" | "STAFF")
 * @param feature - The feature key to check
 * @returns true if the level has access to the feature
 */
export function hasAccess(level: keyof typeof ACCESS_MATRIX, feature: string): boolean {
  return (ACCESS_MATRIX[level] as readonly string[]).includes(feature)
}
