"use client"

import { useState, useEffect } from "react"
import { X, Phone, Mail, Users, Clock, Table2, CheckCircle, UserCheck, XCircle, Edit3, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "./status-badge"
import { formatDate, formatTime, formatDateTime, formatCurrency, renderTemplate, cn } from "@/lib/utils"
import type { ReservationStatus } from "@/types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Reservation = any

interface DetailPanelProps {
  reservation: Reservation | null
  onClose: () => void
  onAction: (action: string, reservation: Reservation) => void
  staffList: { id: string; name: string; color: string }[]
  // 2026-07-15 addition: STAFF-level users can view reservation details
  // but not confirm/seat/edit/cancel/close/message — those actions are
  // reserved for OWNER/MANAGER. Derived from session.accessLevel by the
  // caller (reservations-client.tsx) and passed through here.
  readOnly?: boolean
}

export function ReservationDetailPanel({ reservation: r, onClose, onAction, readOnly = false }: DetailPanelProps) {
  const [msgTab, setMsgTab] = useState<"email" | "sms">("email")
  // 2026-07-16 addition: clicking a template used to send immediately with
  // no way to back out. This holds the template that was clicked but not
  // yet confirmed — rendering a "send this?" step instead of firing
  // onAction("message", ...) right away. Cleared whenever the selected
  // reservation changes so a stale confirm can't linger across guests.
  const [pendingMessage, setPendingMessage] = useState<{ name: string; channel: "email" | "sms"; body: string } | null>(null)

  // BUG HISTORY (2026-07-15): this component previously rendered three
  // templates hardcoded directly in this file, completely disconnected
  // from the admin "Messages" tab's template editor — editing a template
  // there had zero effect on what these buttons actually sent. Now fetches
  // the same /api/message-templates endpoint the admin editor reads/writes,
  // so both surfaces share one real source of truth.
  const [templates, setTemplates] = useState<{ id: string; name: string; channel: string; subject: string | null; body: string }[]>([])

  useEffect(() => {
    fetch("/api/message-templates")
      .then(res => res.ok ? res.json() : null)
      .then(json => { if (json?.data) setTemplates(json.data) })
      .catch(() => {})
  }, [])

  useEffect(() => { setPendingMessage(null) }, [r?.id])

  if (!r) return null

  const status: ReservationStatus = r.status
  const tableIds: string[] = (r.tables ?? []).map((rt: { table: { displayId: string } }) => rt.table?.displayId).filter(Boolean)

  return (
    <div className="w-[340px] shrink-0 border-l border-border bg-hive-surface flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border shrink-0">
        <div>
          <div className="font-serif text-xl font-medium text-gold-500">
            {r.firstName} {r.lastName}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 tracking-wide uppercase">
            RSVP # {r.rsvpCode}
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 mt-0.5">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Details */}
        <div className="p-4 border-b border-border space-y-2.5">
          <div className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">Details</div>
          <DetailRow icon={<Clock className="h-3.5 w-3.5" />} label="Date & Time">
            {formatDate(r.date)} · {formatTime(r.arrivalTime)}
          </DetailRow>
          <DetailRow icon={<Users className="h-3.5 w-3.5" />} label="Party Size">
            {r.partySize} guest{r.partySize !== 1 ? "s" : ""}
          </DetailRow>
          <DetailRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone">
            {r.phone}
          </DetailRow>
          {r.email && (
            <DetailRow icon={<Mail className="h-3.5 w-3.5" />} label="Email">
              <span className="text-[11px]">{r.email}</span>
            </DetailRow>
          )}
          {tableIds.length > 0 && (
            <DetailRow icon={<Table2 className="h-3.5 w-3.5" />} label="Tables">
              {tableIds.join(", ")}
            </DetailRow>
          )}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">Status</span>
            <StatusBadge status={status} />
          </div>
          {/* 2026-07-16 addition: seatedAt already existed on the model but
              was never shown anywhere. completedAt (set when a table is
              closed out — see "Close Table & Log Order" below) doubles as
              the exit time, since closing the check out is the moment a
              party leaves — no separate field needed for that. */}
          {r.seatedAt && (
            <DetailRow icon={<UserCheck className="h-3.5 w-3.5" />} label="Seated">
              {formatDateTime(r.seatedAt)}
            </DetailRow>
          )}
          {r.completedAt && (
            <DetailRow icon={<ChevronRight className="h-3.5 w-3.5" />} label="Exit">
              {formatDateTime(r.completedAt)}
            </DetailRow>
          )}
          {r.orderTotal && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Order Total</span>
              <span className="text-sm font-medium text-green-400">{formatCurrency(r.orderTotal)}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {r.notes && (
          <div className="p-4 border-b border-border">
            <div className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-2">Notes</div>
            <p className="text-xs text-muted-foreground italic leading-relaxed">{r.notes}</p>
          </div>
        )}

        {/* Change request alert */}
        {(status === "CHANGE_REQUESTED" || status === "CANCELLATION_REQUESTED") && r.changeRequest && (
          <div className="m-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-xs text-amber-400 font-medium mb-1">
              {status === "CANCELLATION_REQUESTED" ? "⚠ Cancellation Requested" : "⚠ Change Requested"}
            </p>
            <p className="text-xs text-amber-400/80">{r.changeRequest.message}</p>
          </div>
        )}

        {/* Actions */}
        <div className="p-4 border-b border-border">
          <div className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">Actions</div>
          {readOnly ? (
            <p className="text-xs text-muted-foreground bg-hive-surface2 rounded-lg px-3 py-2.5 text-center">
              View only — ask a manager to confirm, seat, edit, or cancel this reservation.
            </p>
          ) : (
          <div className="space-y-2">
            {status === "REQUESTED" && (
              <>
                <ActionButton color="blue" icon={<CheckCircle className="h-4 w-4" />} onClick={() => onAction("confirm", r)}>
                  Confirm & Notify Guest
                </ActionButton>
                <ActionButton color="teal" icon={<Edit3 className="h-4 w-4" />} onClick={() => onAction("edit", r)}>
                  Edit Reservation
                </ActionButton>
                <ActionButton color="red" icon={<XCircle className="h-4 w-4" />} onClick={() => onAction("cancel", r)}>
                  Cancel Reservation
                </ActionButton>
              </>
            )}
            {status === "CONFIRMED" && (
              <>
                <ActionButton color="purple" icon={<UserCheck className="h-4 w-4" />} onClick={() => onAction("seat", r)}>
                  Seat Guest
                </ActionButton>
                <ActionButton color="teal" icon={<Edit3 className="h-4 w-4" />} onClick={() => onAction("edit", r)}>
                  Edit Reservation
                </ActionButton>
                <ActionButton color="amber" icon={<XCircle className="h-4 w-4" />} onClick={() => {
                  if (confirm(`Mark ${r.firstName} ${r.lastName} as a no-show? This closes the reservation and sends a "we missed you" follow-up instead of a review request.`)) {
                    onAction("no_show", r)
                  }
                }}>
                  Mark No-Show
                </ActionButton>
                <ActionButton color="red" icon={<XCircle className="h-4 w-4" />} onClick={() => onAction("cancel", r)}>
                  Cancel
                </ActionButton>
              </>
            )}
            {status === "SEATED" && (
              <>
                <ActionButton color="amber" icon={<ChevronRight className="h-4 w-4" />} onClick={() => onAction("close", r)}>
                  Close Table & Log Order
                </ActionButton>
                <ActionButton color="teal" icon={<Edit3 className="h-4 w-4" />} onClick={() => onAction("edit", r)}>
                  Update Details
                </ActionButton>
              </>
            )}
            {status === "CHANGE_REQUESTED" && (
              <>
                <ActionButton color="green" icon={<CheckCircle className="h-4 w-4" />} onClick={() => onAction("approve_change", r)}>
                  Approve Change
                </ActionButton>
                <ActionButton color="red" icon={<XCircle className="h-4 w-4" />} onClick={() => onAction("deny_change", r)}>
                  Deny — Keep Active
                </ActionButton>
              </>
            )}
            {status === "CANCELLATION_REQUESTED" && (
              <>
                <ActionButton color="red" icon={<XCircle className="h-4 w-4" />} onClick={() => onAction("cancel", r)}>
                  Confirm Cancellation
                </ActionButton>
                <ActionButton color="green" icon={<CheckCircle className="h-4 w-4" />} onClick={() => onAction("deny_change", r)}>
                  Deny — Keep Active
                </ActionButton>
              </>
            )}
            {(status === "COMPLETED" || status === "CANCELLED") && (
              <p className="text-xs text-muted-foreground text-center py-2">
                This reservation is {status.toLowerCase()}.
              </p>
            )}
          </div>
          )}
        </div>

        {/* Quick message — hidden entirely for read-only (STAFF) users */}
        {!readOnly && (
        <div className="p-4 border-b border-border">
          <div className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">Message Guest</div>
          <div className="flex gap-1 bg-hive-surface2 rounded-md p-1 mb-3">
            {(["email", "sms"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMsgTab(tab)}
                className={cn(
                  "flex-1 py-1.5 rounded text-xs font-medium transition-colors",
                  msgTab === tab ? "bg-hive-surface text-gold-500" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === "email" ? "✉ Email" : "📱 SMS"}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            {templates.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No templates configured — add some in Admin → Messages.</p>
            ) : pendingMessage ? (
              // Confirm step — 2026-07-16 addition. Nothing sends until
              // "Send" below is clicked; "Back" returns to the template
              // list with no request made.
              <div className="border border-gold-500/30 bg-gold-500/5 rounded-md p-3 space-y-2.5">
                <p className="text-xs">
                  Send <span className="font-medium">{pendingMessage.name}</span> to{" "}
                  <span className="font-medium">{r.firstName} {r.lastName}</span> via {pendingMessage.channel === "email" ? "email" : "SMS"}?
                </p>
                <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-sans bg-hive-surface2 rounded-md p-2.5 max-h-28 overflow-y-auto">
                  {pendingMessage.body}
                </pre>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onAction("message", { ...r, _msgBody: pendingMessage.body, _msgChannel: pendingMessage.channel })
                      setPendingMessage(null)
                    }}
                    className="flex-1 py-1.5 rounded-md text-xs font-medium bg-gold-500 hover:bg-gold-600 text-black transition-colors"
                  >
                    Send
                  </button>
                  <button
                    onClick={() => setPendingMessage(null)}
                    className="flex-1 py-1.5 rounded-md text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : (
              templates
                .filter(t => t.channel === (msgTab === "email" ? "EMAIL" : "SMS"))
                .map(t => {
                  // Substitute {{firstName}}, {{date}}, etc. with this reservation's
                  // real values — same rendering logic the admin editor's preview
                  // would use, so what's previewed matches what's actually sent.
                  const vars = {
                    firstName: r.firstName, lastName: r.lastName,
                    date: formatDate(r.date), time: formatTime(r.arrivalTime),
                    partySize: String(r.partySize), rsvpCode: r.rsvpCode,
                  }
                  const renderedBody = renderTemplate(t.body, vars)
                  return (
                    <button
                      key={t.id}
                      onClick={() => setPendingMessage({ name: t.name, channel: msgTab, body: renderedBody })}
                      className="w-full text-left px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-hive-surface2 hover:text-foreground border border-border transition-colors"
                    >
                      {t.name}
                    </button>
                  )
                })
            )}
          </div>
        </div>
        )}

        {/* Activity */}
        {r.activity && r.activity.length > 0 && (
          <div className="p-4">
            <div className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">Activity</div>
            <div className="space-y-2">
              {[...r.activity].reverse().slice(0, 6).map((a: { id: string; type: string; description: string; createdAt: string }) => (
                <div key={a.id} className="flex gap-2.5 text-xs">
                  <span className="text-base leading-none mt-0.5">
                    {a.type === "created" ? "🆕" : a.type === "status_change" ? "🔄" : a.type === "order_closed" ? "✅" : a.type === "cancelled" ? "❌" : a.type === "message_sent" ? "✉️" : a.type === "message_failed" ? "⚠️" : "📝"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-muted-foreground leading-relaxed">{a.description}</p>
                    <p className="text-muted-foreground/50 text-[10px] mt-0.5">
                      {new Date(a.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
        <span className="text-xs text-muted-foreground shrink-0">{label}</span>
        <span className="text-xs font-medium text-right">{children}</span>
      </div>
    </div>
  )
}

function ActionButton({ color, icon, children, onClick }: {
  color: "blue" | "purple" | "green" | "amber" | "red" | "teal"
  icon: React.ReactNode
  children: React.ReactNode
  onClick: () => void
}) {
  const colors = {
    blue:   "text-blue-400 border-blue-400/30 hover:bg-blue-400/10",
    purple: "text-purple-400 border-purple-400/30 hover:bg-purple-400/10",
    green:  "text-green-400 border-green-400/30 hover:bg-green-400/10",
    amber:  "text-amber-400 border-amber-400/30 hover:bg-amber-400/10",
    red:    "text-red-400 border-red-400/30 hover:bg-red-400/10",
    teal:   "text-teal-400 border-teal-400/30 hover:bg-teal-400/10",
  }
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors",
        colors[color]
      )}
    >
      {icon}
      {children}
    </button>
  )
}
