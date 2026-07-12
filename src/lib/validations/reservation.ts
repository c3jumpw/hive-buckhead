// src/lib/validations/reservation.ts
// Zod schemas validate data at the API boundary AND in forms (react-hook-form).
// Single source of truth — change the schema, forms and API update together.

import { z } from "zod";

// ── Create reservation (public RSVP form) ──────────────────────────────────

export const createReservationSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name too long"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name too long"),
  phone: z
    .string()
    .transform(v => v.replace(/\D/g, ""))  // strip formatting
    .pipe(z.string().regex(/^\d{10}$/, "Enter a 10-digit phone number")),
  email: z
    .string()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  arrivalTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  partySize: z
    .number()
    .int()
    .min(1, "Party must be at least 1")
    .max(50, "Contact us for parties over 50"),
  section: z
    .enum(["FINE_DINING", "BAR", "DEN", "PATIO"])
    .optional()
    .nullable(),
  occasion: z.string().max(100).optional().nullable(),
  notes: z.string().max(500, "Notes too long").optional().nullable(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

// ── Update reservation (staff internal) ───────────────────────────────────

export const updateReservationSchema = createReservationSchema.partial().extend({
  status: z
    .enum([
      "REQUESTED",
      "CONFIRMED",
      "SEATED",
      "COMPLETED",
      "CANCELLED",
      "CHANGE_REQUESTED",
      "CANCELLATION_REQUESTED",
    ])
    .optional(),
  serverId: z.string().optional().nullable(),
  tableIds: z.array(z.string()).optional(),
});

export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;

// ── Close table / log order ────────────────────────────────────────────────

export const closeTableSchema = z.object({
  reservationId: z.string().min(1),
  orderTotal: z
    .number()
    .positive("Order total must be a positive number"),
  tipAmount: z.number().min(0).optional(),
  closingRemarks: z
    .string()
    .min(1, "Closing remarks are required")
    .max(1000),
  receiptUrl: z.string().url().optional().nullable(),
});

export type CloseTableInput = z.infer<typeof closeTableSchema>;

// ── Cancel reservation ─────────────────────────────────────────────────────

export const cancelReservationSchema = z.object({
  reservationId: z.string().min(1),
  reason: z.enum([
    "Guest requested cancellation",
    "No show",
    "Duplicate reservation",
    "Capacity issue",
    "Staff initiated",
    "Other",
  ]),
  remarks: z.string().max(500).optional(),
});

export type CancelReservationInput = z.infer<typeof cancelReservationSchema>;

// ── Guest change/cancel request (public form) ──────────────────────────────

export const guestChangeRequestSchema = z.object({
  rsvpCode: z.string().min(1),
  type: z.enum(["change", "cancellation"]),
  changeType: z
    .enum(["date_time", "party_size", "section", "other"])
    .optional(),
  message: z.string().min(1, "Please describe the change").max(500),
  newDate: z.string().optional(),
  newTime: z.string().optional(),
  newPartySize: z.number().int().min(1).max(50).optional(),
  newSection: z
    .enum(["FINE_DINING", "BAR", "DEN", "PATIO"])
    .optional()
    .nullable(),
  reason: z.string().optional(),
});

export type GuestChangeRequestInput = z.infer<typeof guestChangeRequestSchema>;

// ── Staff login ────────────────────────────────────────────────────────────

export const staffLoginSchema = z.object({
  staffId: z.string().min(1, "Please select a staff member"),
  pin: z
    .string()
    .length(4, "PIN must be exactly 4 digits")
    .regex(/^\d{4}$/, "PIN must be 4 digits"),
});

export type StaffLoginInput = z.infer<typeof staffLoginSchema>;

// ── Add / edit staff ───────────────────────────────────────────────────────

export const staffSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Valid email required"),
  phone: z
    .string()
    .regex(/^\d{10}$/, "10-digit phone number")
    .optional()
    .or(z.literal(""))
    .nullable(),
  role: z.string().min(1, "Role is required").max(100),
  accessLevel: z.enum(["OWNER", "MANAGER", "STAFF"]),
  pin: z
    .string()
    .length(4, "PIN must be 4 digits")
    .regex(/^\d{4}$/, "PIN must be 4 digits"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Valid hex color required"),
  section: z
    .enum(["FINE_DINING", "BAR", "DEN", "PATIO"])
    .optional()
    .nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type StaffInput = z.infer<typeof staffSchema>;

// ── Add shift ──────────────────────────────────────────────────────────────

export const shiftSchema = z.object({
  staffId: z.string().min(1, "Staff member required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid start time"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid end time"),
  type: z.enum(["OPEN", "MID", "CLOSE", "DOUBLE"]),
  role: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
}).refine((data) => data.startTime < data.endTime, {
  message: "End time must be after start time",
  path: ["endTime"],
});

export type ShiftInput = z.infer<typeof shiftSchema>;

// ── Log callout ────────────────────────────────────────────────────────────

export const calloutSchema = z.object({
  staffId: z.string().min(1, "Staff member required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  reason: z.enum([
    "SICK",
    "PERSONAL",
    "FAMILY_EMERGENCY",
    "NO_CALL_NO_SHOW",
    "APPROVED_PTO",
    "OTHER",
  ]),
  coveredById: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type CalloutInput = z.infer<typeof calloutSchema>;
