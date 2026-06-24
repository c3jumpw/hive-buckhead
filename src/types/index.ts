// src/types/index.ts
// Single source of truth for all app-wide types.
// These are derived from Prisma types + extended for UI needs.

export type AccessLevel = "ADMIN" | "STAFF" | "FLOOR";

export type ReservationStatus =
  | "REQUESTED"
  | "CONFIRMED"
  | "SEATED"
  | "COMPLETED"
  | "CANCELLED"
  | "CHANGE_REQUESTED"
  | "CANCELLATION_REQUESTED";

export type Section = "FINE_DINING" | "BAR" | "DEN" | "PATIO";

export type TableState =
  | "AVAILABLE"
  | "RESERVED"
  | "SEATED"
  | "DIRTY"
  | "MAINTENANCE";

export type ShiftType = "OPEN" | "MID" | "CLOSE" | "DOUBLE";

export type MessageChannel = "EMAIL" | "SMS";

// ── Staff ──────────────────────────────────────────────────────────────────

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  accessLevel: AccessLevel;
  color: string;
  section?: Section | null;
  active: boolean;
  avatarUrl?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Safe version for client — never includes pin
export type StaffPublic = Omit<StaffMember, never>;

// ── Reservations ───────────────────────────────────────────────────────────

export interface Reservation {
  id: string;
  rsvpCode: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  date: Date;
  arrivalTime: string;
  partySize: number;
  section?: Section | null;
  occasion?: string | null;
  notes?: string | null;
  source: string;
  status: ReservationStatus;
  orderTotal?: number | null;
  tipAmount?: number | null;
  closingRemarks?: string | null;
  receiptUrl?: string | null;
  changeRequest?: ChangeRequest | null;
  server?: StaffPublic | null;
  serverId?: string | null;
  tables: ReservationTable[];
  activity: ActivityLogEntry[];
  messages: MessageLogEntry[];
  confirmedAt?: Date | null;
  seatedAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Computed derived values used in the UI
export interface ReservationSummary
  extends Pick<
    Reservation,
    | "id"
    | "rsvpCode"
    | "firstName"
    | "lastName"
    | "phone"
    | "email"
    | "date"
    | "arrivalTime"
    | "partySize"
    | "status"
    | "section"
    | "occasion"
    | "notes"
    | "source"
    | "orderTotal"
    | "serverId"
    | "createdAt"
    | "updatedAt"
  > {
  serverName?: string;
  tableIds: string[];
  guestName: string; // firstName + lastName
}

export interface ChangeRequest {
  type: "change" | "cancellation";
  changeType?: string;
  reason?: string;
  message?: string;
  newDate?: string;
  newTime?: string;
  newPartySize?: number;
  newSection?: Section;
  submittedAt: string;
}

// ── Tables ─────────────────────────────────────────────────────────────────

export interface FloorTable {
  id: string;
  displayId: string;
  label?: string | null;
  capacity: number;
  section: Section;
  state: TableState;
  svgX: number;
  svgY: number;
  active: boolean;
  // Derived at runtime
  currentReservation?: ReservationSummary | null;
}

export interface ReservationTable {
  tableId: string;
  table: Pick<FloorTable, "id" | "displayId" | "capacity" | "section">;
  assignedAt: Date;
}

// ── Activity & Messages ────────────────────────────────────────────────────

export type ActivityType =
  | "created"
  | "status_change"
  | "assigned_server"
  | "assigned_table"
  | "message_sent"
  | "order_closed"
  | "cancelled"
  | "change_requested"
  | "change_approved"
  | "change_denied"
  | "note";

export interface ActivityLogEntry {
  id: string;
  type: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
  staffId?: string | null;
  staffName?: string;
  createdAt: Date;
}

export interface MessageLogEntry {
  id: string;
  channel: MessageChannel;
  recipient: string;
  subject?: string | null;
  body: string;
  sentAt: Date;
  status: string;
}

// ── Schedule ───────────────────────────────────────────────────────────────

export interface Shift {
  id: string;
  staffId: string;
  staffName: string;
  staffColor: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: ShiftType;
  role?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  // Computed
  hoursWorked?: number;
}

export interface Callout {
  id: string;
  staffId: string;
  staffName: string;
  date: Date;
  reason: string;
  coveredById?: string | null;
  coveredByName?: string | null;
  notes?: string | null;
  loggedBy?: string | null;
  createdAt: Date;
}

// ── Analytics ──────────────────────────────────────────────────────────────

export interface StaffPerformance {
  staffId: string;
  staffName: string;
  staffColor: string;
  role: string;
  // Reservation metrics
  totalReservations: number;
  totalCovers: number;
  completedReservations: number;
  totalRevenue: number;
  avgOrderSize: number;
  avgPartySize: number;
  // Reliability metrics
  totalShifts: number;
  totalHours: number;
  totalCallouts: number;
  calloutRate: number;
  reliability: number; // 0-100
  showRate: number;    // 0-100
  // Composite score
  score: number;       // 0-100
}

// ── API response shapes ────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── UI helpers ─────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

export type ViewMode = "list" | "kanban" | "calendar";

export interface DateRange {
  from: Date;
  to: Date;
}

// ── Auth session ───────────────────────────────────────────────────────────

export interface SessionStaff {
  id: string;
  name: string;
  email: string;
  role: string;
  accessLevel: AccessLevel;
  color: string;
}
