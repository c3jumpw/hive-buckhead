"use client"

/**
 * src/components/staff-portal/staff-portal-client.tsx
 * Client component for the staff portal — schedule, announcements, feedback.
 * Renders different tabs based on access level:
 *   STAFF   — My Schedule, Announcements, Feedback
 *   MANAGER/OWNER — same as STAFF + link to full admin dashboard
 */

import { useState } from "react"
import { Calendar, Megaphone, MessageSquare, User, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import type { SessionStaff } from "@/lib/auth/session"

// Day names for recurring schedule display
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

interface Props {
  session: SessionStaff
  announcements: any[]
  shifts: any[]
  recurringShifts: any[]
}

export function StaffPortalClient({ session, announcements, shifts, recurringShifts }: Props) {
  const [tab, setTab] = useState<"schedule" | "announcements" | "feedback" | "profile">("schedule")
  const [feedbackMsg, setFeedbackMsg] = useState("")
  const [feedbackCategory, setFeedbackCategory] = useState("general")
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

  const unreadCount = announcements.filter(a => !a.reads?.length).length

  /** Submit staff feedback to admin inbox */
  async function submitFeedback() {
    if (!feedbackMsg.trim()) return
    setSubmittingFeedback(true)
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedbackMsg, category: feedbackCategory, isAnonymous }),
      })
      if (res.ok) {
        toast({ title: "Feedback sent", description: "Your message has been received by management." })
        setFeedbackMsg("")
      } else {
        toast({ title: "Failed to send", variant: "destructive" })
      }
    } finally {
      setSubmittingFeedback(false)
    }
  }

  return (
    <div className="min-h-screen bg-hive-bg text-foreground">
      {/* Header */}
      <div className="bg-hive-surface border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl text-gold-500">HIVE BUCKHEAD</h1>
          <p className="text-xs text-muted-foreground">Staff Portal</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium">{session.name}</p>
            <p className="text-xs text-muted-foreground">{session.role}</p>
          </div>
          {/* Link to full admin dashboard for managers/owners */}
          {(session.accessLevel === "MANAGER" || session.accessLevel === "OWNER") && (
            <a href="/dashboard" className="flex items-center gap-1 text-xs text-gold-400 hover:text-gold-300 border border-gold-500/30 px-3 py-1.5 rounded-lg">
              Admin <ExternalLink size={10} />
            </a>
          )}
          <a href="/api/auth/logout" className="text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg">
            Sign Out
          </a>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-border bg-hive-surface">
        <div className="flex max-w-2xl mx-auto">
          {[
            { id: "schedule", label: "My Schedule", icon: Calendar },
            { id: "announcements", label: `Announcements${unreadCount > 0 ? ` (${unreadCount})` : ""}`, icon: Megaphone },
            { id: "feedback", label: "Send Feedback", icon: MessageSquare },
            { id: "profile", label: "My Profile", icon: User },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={cn("flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                tab === t.id ? "border-gold-500 text-gold-400" : "border-transparent text-muted-foreground hover:text-foreground")}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6">

        {/* ── SCHEDULE TAB ── */}
        {tab === "schedule" && (
          <div className="space-y-4">
            <h2 className="font-medium">Upcoming Shifts</h2>
            {shifts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming shifts scheduled in the next 14 days.</p>
            ) : (
              shifts.map((shift: any) => (
                <div key={shift.id} className="bg-hive-surface border border-border rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{new Date(shift.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p>
                    <p className="text-xs text-muted-foreground">{shift.startTime} – {shift.endTime} · {shift.type}</p>
                    {shift.role && <p className="text-xs text-gold-400 mt-1">{shift.role}</p>}
                  </div>
                  <span className="text-xs bg-hive-surface2 border border-border px-2 py-1 rounded-full">{shift.notes || "Confirmed"}</span>
                </div>
              ))
            )}

            {/* Recurring schedule */}
            {recurringShifts.length > 0 && (
              <>
                <h3 className="font-medium text-sm text-muted-foreground mt-6">Default Weekly Schedule</h3>
                {recurringShifts.map((rs: any) => (
                  <div key={rs.id} className="bg-hive-surface border border-border rounded-lg p-3 flex justify-between">
                    <span className="text-sm font-medium">{DAY_NAMES[rs.dayOfWeek]}</span>
                    {rs.isWorkDay
                      ? <span className="text-xs text-green-400">{rs.startTime} – {rs.endTime}</span>
                      : <span className="text-xs text-muted-foreground">Day Off</span>}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── ANNOUNCEMENTS TAB ── */}
        {tab === "announcements" && (
          <div className="space-y-3">
            <h2 className="font-medium">Team Announcements</h2>
            {announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No announcements yet.</p>
            ) : (
              announcements.map((a: any) => (
                <div key={a.id} className={cn("bg-hive-surface border rounded-xl p-4",
                  !a.reads?.length ? "border-gold-500/40 bg-gold-500/5" : "border-border")}>
                  {a.pinned && <span className="text-[10px] text-gold-400 font-semibold uppercase tracking-wider">📌 Pinned</span>}
                  <div className="flex justify-between items-start mt-1">
                    <h3 className="font-medium text-sm">{a.title}</h3>
                    {!a.reads?.length && <span className="text-[10px] bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full">New</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{a.body}</p>
                  <p className="text-xs text-muted-foreground mt-3">{a.authorName} · {new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── FEEDBACK TAB ── */}
        {tab === "feedback" && (
          <div className="space-y-4">
            <h2 className="font-medium">Send Feedback to Management</h2>
            <p className="text-sm text-muted-foreground">Your message goes directly to the management team. You can send anonymously if you prefer.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Category</label>
                <select value={feedbackCategory} onChange={e => setFeedbackCategory(e.target.value)}
                  className="mt-1 w-full bg-hive-surface2 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold-400">
                  <option value="general">General</option>
                  <option value="schedule">Schedule</option>
                  <option value="safety">Safety Concern</option>
                  <option value="suggestion">Suggestion</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Message</label>
                <textarea value={feedbackMsg} onChange={e => setFeedbackMsg(e.target.value)} rows={5} placeholder="Share your thoughts..."
                  className="mt-1 w-full bg-hive-surface2 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold-400 resize-none" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="rounded" />
                <span className="text-sm text-muted-foreground">Send anonymously</span>
              </label>
              <button onClick={submitFeedback} disabled={submittingFeedback || !feedbackMsg.trim()}
                className="w-full bg-gold-500 hover:bg-gold-600 text-black font-semibold py-2 rounded-lg text-sm disabled:opacity-50 transition-colors">
                {submittingFeedback ? "Sending…" : "Send Feedback"}
              </button>
            </div>
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {tab === "profile" && (
          <div className="space-y-4">
            <h2 className="font-medium">My Profile</h2>
            <ProfileEditor session={session} />
          </div>
        )}
      </div>
    </div>
  )
}

/** Profile editor — staff can update email, phone, and PIN */
function ProfileEditor({ session }: { session: SessionStaff }) {
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [currentPin, setCurrentPin] = useState("") // required for changes
  const [saving, setSaving] = useState(false)

  async function saveProfile() {
    if (!currentPin) { toast({ title: "Enter your current PIN to save changes", variant: "destructive" }); return }
    if (newPin && newPin !== confirmPin) { toast({ title: "New PINs don\'t match", variant: "destructive" }); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/staff-portal/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined, phone: phone || undefined, newPin: newPin || undefined, currentPin }),
      })
      if (res.ok) {
        toast({ title: "Profile updated" })
        setCurrentPin(""); setNewPin(""); setConfirmPin("")
      } else {
        const err = await res.json()
        toast({ title: err.error || "Update failed", variant: "destructive" })
      }
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="bg-hive-surface border border-border rounded-xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: session.color + "40", border: `2px solid ${session.color}` }}>
          {session.name.charAt(0)}
        </div>
        <div>
          <p className="font-medium">{session.name}</p>
          <p className="text-xs text-muted-foreground">{session.role} · {session.accessLevel}</p>
        </div>
      </div>
      <div className="bg-hive-surface border border-border rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-medium">Update Contact Info</h3>
        {[
          { label: "New Email", value: email, set: setEmail, type: "email", placeholder: "Leave blank to keep current" },
          { label: "New Phone", value: phone, set: setPhone, type: "tel", placeholder: "Leave blank to keep current" },
          { label: "New PIN (4 digits)", value: newPin, set: setNewPin, type: "password", placeholder: "Leave blank to keep current" },
          { label: "Confirm New PIN", value: confirmPin, set: setConfirmPin, type: "password", placeholder: "Repeat new PIN" },
          { label: "Current PIN (required to save)", value: currentPin, set: setCurrentPin, type: "password", placeholder: "Enter your current PIN" },
        ].map(f => (
          <div key={f.label}>
            <label className="text-xs text-muted-foreground">{f.label}</label>
            <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} maxLength={f.label.includes("PIN") ? 4 : undefined}
              className="mt-1 w-full bg-hive-surface2 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold-400" />
          </div>
        ))}
        <button onClick={saveProfile} disabled={saving}
          className="w-full bg-gold-500 hover:bg-gold-600 text-black font-semibold py-2 rounded-lg text-sm disabled:opacity-50 transition-colors">
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  )
}
