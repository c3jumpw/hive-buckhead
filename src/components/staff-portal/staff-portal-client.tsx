"use client"

/**
 * src/components/staff-portal/staff-portal-client.tsx
 * Client component for Home — the universal post-login landing page for
 * every access level (see login-form.tsx). Same five tabs for everyone:
 *   Home       — quick links (filtered by access level) + announcements
 *   My Schedule — this person's own shifts
 *   Resources  — guide hub, filtered by access level, DB-backed via
 *                /api/guides (see that route for the access-filter logic)
 *   Feedback   — message to management
 *   My Profile — contact info / PIN
 *
 * REVISION (2026-07-16): previously STAFF-only, with a separate
 * Announcements tab and a MANAGER/OWNER-only "Admin" link in the header.
 * Now every access level lands here after login; what differs by role is
 * which Quick Links render on Home, not the page/tab structure itself.
 */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar, MessageSquare, User, LayoutList, MapPin,
  CalendarDays, LayoutDashboard, BarChart3, BookOpen, ChevronDown, ChevronRight, Home as HomeIcon,
} from "lucide-react"
import { cn, formatTime, hasAccess } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import type { SessionStaff } from "@/lib/auth/session"

// Day names for recurring schedule display
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

// Home tab quick links — filtered by hasAccess(session.accessLevel, minAccess)
// at render time. Same operations pages reachable from the sidebar once
// inside /reservations etc.; this is the jump-off point to get there.
const QUICK_LINKS = [
  { href: "/reservations", label: "Reservations", icon: LayoutList, minAccess: "STAFF" as const },
  { href: "/floor", label: "Floor View", icon: MapPin, minAccess: "STAFF" as const },
  { href: "/schedule", label: "Staff Schedule", icon: CalendarDays, minAccess: "STAFF" as const },
  { href: "/admin", label: "Admin Dashboard", icon: LayoutDashboard, minAccess: "MANAGER" as const },
  { href: "/analytics", label: "Analytics", icon: BarChart3, minAccess: "MANAGER" as const },
]

interface Props {
  session: SessionStaff
  announcements: any[]
  shifts: any[]
  recurringShifts: any[]
  // 2026-07-16: "announcements" tab folded into "home" (announcements are
  // now front-and-center on Home instead of needing their own click), and
  // "resources" added for the new Resource Hub. Old ?tab=announcements
  // links still resolve — see page.tsx — just land on Home now.
  initialTab?: "home" | "schedule" | "resources" | "feedback" | "profile"
}

export function StaffPortalClient({ session, announcements, shifts, recurringShifts, initialTab }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<"home" | "schedule" | "resources" | "feedback" | "profile">(initialTab ?? "home")
  const [feedbackMsg, setFeedbackMsg] = useState("")
  const [feedbackCategory, setFeedbackCategory] = useState("general")
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [expandedGuideId, setExpandedGuideId] = useState<string | null>(null)
  const [guides, setGuides] = useState<any[]>([])
  const [guidesLoading, setGuidesLoading] = useState(true)
  const [managingGuides, setManagingGuides] = useState(false)
  const [addingGuide, setAddingGuide] = useState(false)
  const [editingGuideId, setEditingGuideId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/guides")
      .then(res => res.ok ? res.json() : null)
      .then(json => { if (json?.data) setGuides(json.data) })
      .finally(() => setGuidesLoading(false))
  }, [])

  /**
   * BUG HISTORY (2026-07-15): the sign-out control here was a plain
   * <a href="/api/auth/logout"> link. Clicking a link performs a browser
   * GET navigation, but the logout route only exports a POST handler —
   * so every click hit a 405 Method Not Allowed error page, AND the
   * session cookie was never actually cleared (the GET request never
   * reached the code that deletes it), requiring a second logout attempt
   * afterward. Fixed to match the same POST-based pattern already used
   * correctly in dashboard-nav.tsx.
   */
  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }
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
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/icon.png" alt="" width={32} height={32} className="shrink-0" />
          <div>
            <h1 className="font-serif text-xl text-gold-500">HIVE BUCKHEAD</h1>
            {/* REVISION (2026-07-16): was "Staff Portal" — this page is now
                the landing page for every access level, not just regular
                staff (see login-form.tsx), so a label implying staff-only
                no longer fits. Renamed to Home; URL is unchanged so
                existing links (announcement/onboarding emails, bookmarks)
                keep working. */}
            <p className="text-xs text-muted-foreground">Home</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium">{session.name}</p>
            <p className="text-xs text-muted-foreground">{session.role}</p>
          </div>
          <button onClick={handleSignOut} className="text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg">
            Sign Out
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-border bg-hive-surface">
        <div className="flex max-w-3xl mx-auto overflow-x-auto">
          {[
            { id: "home", label: `Home${unreadCount > 0 ? ` (${unreadCount})` : ""}`, icon: HomeIcon },
            { id: "schedule", label: "My Schedule", icon: Calendar },
            { id: "resources", label: "Resources", icon: BookOpen },
            { id: "feedback", label: "Send Feedback", icon: MessageSquare },
            { id: "profile", label: "My Profile", icon: User },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={cn("flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                tab === t.id ? "border-gold-500 text-gold-400" : "border-transparent text-muted-foreground hover:text-foreground")}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6">

        {/* ── HOME TAB ──────────────────────────────────────────────────
             REVISION (2026-07-16): new default tab. Quick Links +
             Announcements merged here so both are visible the moment
             anyone logs in, instead of announcements needing their own
             click. Quick Links are filtered by access level — Admin
             Dashboard and Analytics only render for MANAGER/OWNER, same
             hasAccess() check used everywhere else in the app. ── */}
        {tab === "home" && (
          <div className="space-y-8">
            <div>
              <h2 className="font-medium mb-3">Quick Links</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {QUICK_LINKS.filter(l => hasAccess(session.accessLevel, l.minAccess)).map(l => (
                  <a key={l.href} href={l.href}
                    className="flex flex-col items-center gap-2 bg-hive-surface border border-border hover:border-gold-500/40 rounded-xl p-4 text-center transition-colors">
                    <l.icon size={20} className="text-gold-400" />
                    <span className="text-xs font-medium">{l.label}</span>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-medium">Team Announcements</h2>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full font-medium">{unreadCount} new</span>
                )}
              </div>
              <div className="space-y-3">
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
            </div>
          </div>
        )}

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
                    <p className="text-xs text-muted-foreground">{formatTime(shift.startTime)} – {formatTime(shift.endTime)} · {shift.type}</p>
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
                      ? <span className="text-xs text-green-400">{formatTime(rs.startTime)} – {formatTime(rs.endTime)}</span>
                      : <span className="text-xs text-muted-foreground">Day Off</span>}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── RESOURCES TAB ────────────────────────────────────────────
             REVISION (2026-07-16): now database-backed via /api/guides
             instead of the static src/lib/resources/guides.ts file —
             adding, editing, or removing a guide no longer needs a code
             change/redeploy. MANAGER+ gets inline Add/Edit/Delete;
             everyone else just sees the filtered read-only list. ── */}
        {tab === "resources" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-medium">Resources</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Guides on how to use the system.</p>
              </div>
              {hasAccess(session.accessLevel, "MANAGER") && (
                <button onClick={() => { setManagingGuides(m => !m); setAddingGuide(false); setEditingGuideId(null) }}
                  className="text-xs text-gold-400 hover:text-gold-300">
                  {managingGuides ? "Done" : "Manage"}
                </button>
              )}
            </div>

            {managingGuides && !addingGuide && (
              <button onClick={() => setAddingGuide(true)}
                className="w-full border border-dashed border-border rounded-xl p-3 text-xs text-muted-foreground hover:text-foreground hover:border-gold-500/40 transition-colors">
                + Add Guide
              </button>
            )}
            {addingGuide && (
              <GuideForm
                onCancel={() => setAddingGuide(false)}
                onSave={async (data) => {
                  const res = await fetch("/api/guides", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
                  const json = await res.json()
                  if (!res.ok) { toast({ title: json.error || "Failed to add guide", variant: "destructive" }); return }
                  setGuides(g => [...g, json.data])
                  setAddingGuide(false)
                  toast({ title: "Guide added" })
                }}
              />
            )}

            {guidesLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : guides.length === 0 ? (
              <p className="text-xs text-muted-foreground">No guides yet.</p>
            ) : (
              guides.map(g => {
                const isOpen = expandedGuideId === g.id
                const isEditing = editingGuideId === g.id
                if (isEditing) {
                  return (
                    <GuideForm
                      key={g.id}
                      initial={g}
                      onCancel={() => setEditingGuideId(null)}
                      onSave={async (data) => {
                        const res = await fetch(`/api/guides/${g.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
                        const json = await res.json()
                        if (!res.ok) { toast({ title: json.error || "Failed to save", variant: "destructive" }); return }
                        setGuides(gs => gs.map(x => x.id === g.id ? json.data : x))
                        setEditingGuideId(null)
                        toast({ title: "Guide updated" })
                      }}
                    />
                  )
                }
                return (
                  <div key={g.id} className="bg-hive-surface border border-border rounded-xl overflow-hidden">
                    <div className="w-full flex items-center justify-between gap-3 p-4">
                      <button onClick={() => setExpandedGuideId(isOpen ? null : g.id)} className="flex-1 min-w-0 text-left flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {g.pinned && <span className="text-[10px] text-gold-400">📌</span>}
                            <span className="text-[10px] uppercase tracking-wider text-gold-400 font-semibold">{g.category}</span>
                            <span className="text-[10px] text-muted-foreground">{g.minAccessLevel !== "STAFF" ? `${g.minAccessLevel}+` : ""}</span>
                          </div>
                          <h3 className="font-medium text-sm mt-0.5">{g.title}</h3>
                        </div>
                        {isOpen ? <ChevronDown size={16} className="shrink-0 text-muted-foreground" /> : <ChevronRight size={16} className="shrink-0 text-muted-foreground" />}
                      </button>
                      {managingGuides && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => setEditingGuideId(g.id)} className="text-[11px] text-muted-foreground hover:text-foreground">Edit</button>
                          <button onClick={async () => {
                            if (!confirm(`Delete "${g.title}"?`)) return
                            const res = await fetch(`/api/guides/${g.id}`, { method: "DELETE" })
                            if (res.ok) { setGuides(gs => gs.filter(x => x.id !== g.id)); toast({ title: "Guide deleted" }) }
                          }} className="text-[11px] text-muted-foreground hover:text-red-300">Delete</button>
                        </div>
                      )}
                    </div>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 border-t border-border">
                        <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{g.body}</p>
                      </div>
                    )}
                  </div>
                )
              })
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
                  <option value="other">Other</option>
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

/**
 * GuideForm — 2026-07-16 addition. Shared by both "Add Guide" and "Edit
 * Guide" in the Resources tab above (same fields either way, just a
 * different save handler passed in by the caller).
 */
function GuideForm({ initial, onSave, onCancel }: {
  initial?: { title: string; body: string; category: string; minAccessLevel: string; pinned: boolean }
  onSave: (data: { title: string; body: string; category: string; minAccessLevel: string; pinned: boolean }) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? "")
  const [body, setBody] = useState(initial?.body ?? "")
  const [category, setCategory] = useState(initial?.category ?? "General")
  const [minAccessLevel, setMinAccessLevel] = useState(initial?.minAccessLevel ?? "STAFF")
  const [pinned, setPinned] = useState(initial?.pinned ?? false)
  const [saving, setSaving] = useState(false)

  return (
    <div className="bg-hive-surface border border-gold-500/30 rounded-xl p-4 space-y-2.5">
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Guide title"
        className="w-full bg-hive-surface2 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold-400" />
      <div className="grid grid-cols-2 gap-2.5">
        <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Category (e.g. Front of House)"
          className="bg-hive-surface2 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-gold-400" />
        <select value={minAccessLevel} onChange={e => setMinAccessLevel(e.target.value)}
          className="bg-hive-surface2 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-gold-400">
          <option value="STAFF">Visible to: Everyone</option>
          <option value="MANAGER">Visible to: Manager+</option>
          <option value="OWNER">Visible to: Owner only</option>
        </select>
      </div>
      <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Guide content — plain text, blank lines become paragraph breaks"
        rows={8} className="w-full bg-hive-surface2 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold-400 resize-y" />
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
        <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} className="rounded" />
        Pin to top of list
      </label>
      <div className="flex gap-2">
        <button
          onClick={async () => {
            if (!title || !body) { toast({ title: "Title and content are required", variant: "destructive" }); return }
            setSaving(true)
            await onSave({ title, body, category, minAccessLevel, pinned })
            setSaving(false)
          }}
          disabled={saving}
          className="flex-1 py-1.5 rounded-md text-xs font-medium bg-gold-500 hover:bg-gold-600 text-black transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Guide"}
        </button>
        <button onClick={onCancel} disabled={saving}
          className="flex-1 py-1.5 rounded-md text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}
