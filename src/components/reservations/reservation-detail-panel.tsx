"use client"

import { useState } from "react"
import { X, Phone, Mail, Users, Clock, Table2, CheckCircle, UserCheck, XCircle, Edit3, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "./status-badge"
import { formatDate, formatTime, formatCurrency, cn } from "@/lib/utils"
import type { ReservationStatus } from "@/types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Reservation = any

interface DetailPanelProps {
  reservation: Reservation | null
  onClose: () => void
  onAction: (action: string, reservation: Reservation) => void
  staffList: { id: string; name: string; color: string }[]
}

export function ReservationDetailPanel({ reservation: r, onClose, onAction }: DetailPanelProps) {
  const [msgTab, setMsgTab] = useState<"email" | "sms">("email")

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
        </div>

        {/* Quick message */}
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
            {[
              { label: "Confirm", body: msgTab === "email"
                ? `Hi ${r.firstName},\n\nYour reservation at Hive Buckhead is confirmed for ${formatDate(r.date)} at ${formatTime(r.arrivalTime)}, party of ${r.partySize}.\n\nRSVP # ${r.rsvpCode}\n\nHive Buckhead`
                : `Hi ${r.firstName}! Confirmed: Hive Buckhead ${formatDate(r.date)} at ${formatTime(r.arrivalTime)}, party of ${r.partySize}. RSVP #${r.rsvpCode}` },
              { label: "Reminder", body: msgTab === "email"
                ? `Hi ${r.firstName},\n\nReminder: your Hive Buckhead reservation is today at ${formatTime(r.arrivalTime)} for ${r.partySize}.\n\nHive Buckhead`
                : `Hi ${r.firstName}, reminder: your Hive Buckhead table is today at ${formatTime(r.arrivalTime)} 🍸` },
              { label: "Thank You", body: msgTab === "email"
                ? `Hi ${r.firstName},\n\nThank you for dining with us at Hive Buckhead!\n\nHive Buckhead`
                : `Hi ${r.firstName}! Thank you for dining at Hive Buckhead — hope to see you again! 🥂` },
            ].map(({ label, body }) => (
              <button
                key={label}
                onClick={() => onAction("message", { ...r, _msgBody: body, _msgChannel: msgTab })}
                className="w-full text-left px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-hive-surface2 hover:text-foreground border border-border transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Activity */}
        {r.activity && r.activity.length > 0 && (
          <div className="p-4">
            <div className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">Activity</div>
            <div className="space-y-2">
              {[...r.activity].reverse().slice(0, 6).map((a: { id: string; type: string; description: string; createdAt: string }) => (
                <div key={a.id} className="flex gap-2.5 text-xs">
                  <span className="text-base leading-none mt-0.5">
                    {a.type === "created" ? "🆕" : a.type === "status_change" ? "🔄" : a.type === "order_closed" ? "✅" : a.type === "cancelled" ? "❌" : "📝"}
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
