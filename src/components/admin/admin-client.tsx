"use client"

import { useState, useEffect } from "react"
import { FloorPlanEditor } from "@/components/admin/floor-plan-editor"
import { OnboardingManager, MessageBlastTool, FeedbackInbox, QuoLinkCard, PendingApprovalsPanel, IntegrationDiagnosticsPanel } from "@/components/admin/onboarding-manager"
import { PositionManager, RecurringScheduleEditor, OffboardingForm } from "@/components/admin/staff-tools"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Users, Table2, CalendarDays, Edit3, Eye, EyeOff, Save, X, Plus,
  Settings, Clock, MessageSquare, Database, BarChart3, CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/reservations/status-badge"
import { formatDate, formatTime, cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import type { SessionStaff } from "@/types"

type AnyRecord = Record<string, unknown>

interface Props {
  session: SessionStaff
  stats: { staffCount: number; tableCount: number; barSeatCount: number; rsvpCount: number }
  recentReservations: AnyRecord[]
  staff: AnyRecord[]
  tables: AnyRecord[]
  hours: AnyRecord[]
  messageTemplates: { id: string; name: string; channel: string; subject: string; body: string }[]
  initialTab: string
}

const TABS = [
  { id: "overview",   label: "Overview",          icon: BarChart3 },
  { id: "staff",      label: "Staff",             icon: Users },
  { id: "tables",     label: "Tables",            icon: Table2 },
  { id: "hours",      label: "Hours",             icon: Clock },
  { id: "messages",   label: "Messages",          icon: MessageSquare },
  { id: "settings",   label: "Settings",          icon: Settings },
  { id: "team",       label: "Team Tools",        icon: MessageSquare },
]

const ACCESS_LEVELS = ["OWNER", "MANAGER", "STAFF"]
const ACCESS_COLORS: Record<string, string> = {
  OWNER: "text-gold-500", MANAGER: "text-blue-400", STAFF: "text-muted-foreground",
}
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]

export function AdminClient({ session: _s, stats, recentReservations, staff: initStaff, tables, hours: initHours, messageTemplates: initTemplates, initialTab }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tablesSubTab, setTablesSubTab] = useState("list")
  const [showPositionManager, setShowPositionManager] = useState(false)
  const [scheduleEditorStaff, setScheduleEditorStaff] = useState<{ id: string; name: string } | null>(null)
  const [offboardingStaff, setOffboardingStaff] = useState<{ id: string; name: string } | null>(null)
  // Sync tab with URL so sidebar links work (useState doesn't re-init on prop change)
  const tab = searchParams.get("tab") || initialTab || "overview"
  const setTab = (t: string) => router.push(`/admin?tab=${t}`, { scroll: false })
  const [staff, setStaff] = useState<AnyRecord[]>(initStaff)
  const [hours, setHours] = useState<AnyRecord[]>(initHours)
  const [templates, setTemplates] = useState(initTemplates)

  // BUG HISTORY (2026-07-15): templates previously came ONLY from the
  // initTemplates prop, which several admin sub-routes (settings, staff,
  // hours pages) hardcode to an empty array — meaning this tab showed no
  // templates at all unless mounted from the one route that happened to
  // query real data. Now fetches independently on mount, matching the
  // pattern already used by OnboardingManager/PendingApprovalsPanel below,
  // so the Messages tab works correctly regardless of which admin route
  // rendered it.
  useEffect(() => {
    fetch("/api/message-templates")
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.data) setTemplates(json.data) })
      .catch(() => {})
  }, [])
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null)
  const [addingNewStaff, setAddingNewStaff] = useState(false)
  const [newStaffForm, setNewStaffForm] = useState({ name: '', email: '', role: '', accessLevel: 'STAFF', pin: '', color: '#5B96C8' })
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [showPin, setShowPin] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  const [templateForm, setTemplateForm] = useState({ name: "", channel: "EMAIL", subject: "", body: "" })
  const [seedLoading, setSeedLoading] = useState(false)

  /**
   * BUG HISTORY (2026-07-15): the "Reservation Settings" card in the
   * Settings tab displayed hardcoded values ("20", "60", "No") as
   * plain read-only text — not connected to anything, not editable —
   * despite a fully-working, correctly-authorized AppSettings model and
   * GET/PATCH /api/settings route already existing in the codebase.
   * Wired up for real: fetches on mount, each field is now editable,
   * saves persist via PATCH.
   */
  const [appSettings, setAppSettings] = useState<{ maxPartySize: number; bookingWindowDays: number; autoConfirm: boolean } | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        setAppSettings({
          maxPartySize: json?.data?.maxPartySize ?? 20,
          bookingWindowDays: json?.data?.bookingWindowDays ?? 60,
          autoConfirm: json?.data?.autoConfirm ?? false,
        })
      })
      .catch(() => setAppSettings({ maxPartySize: 20, bookingWindowDays: 60, autoConfirm: false }))
  }, [])

  async function saveAppSettings(patch: Partial<{ maxPartySize: number; bookingWindowDays: number; autoConfirm: boolean }>) {
    if (!appSettings) return
    const next = { ...appSettings, ...patch }
    setAppSettings(next)  // optimistic
    setSavingSettings(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (res.ok) toast({ title: "Settings saved" })
      else toast({ title: "Failed to save settings", variant: "destructive" })
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" })
    } finally {
      setSavingSettings(false)
    }
  }

  // ── Staff edit ──────────────────────────────────────────────────────────

  function startEditStaff(m: AnyRecord) {
    setEditingStaffId(m.id as string)
    setEditForm({ name: m.name as string, role: m.role as string, accessLevel: m.accessLevel as string, color: m.color as string, email: m.email as string, pin: "" })
    setShowPin(false)
  }

  async function saveNewStaff() {
    if (!newStaffForm.name || !newStaffForm.email || !newStaffForm.role || !newStaffForm.pin) {
      toast({ title: "All fields required", variant: "destructive" }); return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/staff", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newStaffForm),
      })
      if (!res.ok) throw new Error("Failed")
      const { data } = await res.json()
      setStaff(prev => [...prev, data])
      setAddingNewStaff(false)
      setNewStaffForm({ name: '', email: '', role: '', accessLevel: 'STAFF', pin: '', color: '#5B96C8' })
      toast({ title: `${data.name} added to staff` })
    } catch { toast({ title: "Failed to add staff member", variant: "destructive" }) }
    finally { setSaving(false) }
  }

  async function saveStaff(id: string) {
    setSaving(true)
    try {
      const body: Record<string, string> = { ...editForm }
      if (!body.pin) delete body.pin
      const res = await fetch(`/api/staff/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      const updated = (await res.json()).data
      setStaff(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s))
      setEditingStaffId(null)
      toast({ title: "Staff member updated" })
    } catch { toast({ title: "Failed to save", variant: "destructive" }) }
    finally { setSaving(false) }
  }

  // ── Hours edit ──────────────────────────────────────────────────────────

  async function saveHours(dayOfWeek: number, field: string, value: string | boolean) {
    setHours(prev => prev.map(h => (h.dayOfWeek as number) === dayOfWeek ? { ...h, [field]: value } : h))
    try {
      await fetch(`/api/hours/${dayOfWeek}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      toast({ title: "Hours updated" })
    } catch { toast({ title: "Failed", variant: "destructive" }) }
  }

  // ── Templates ───────────────────────────────────────────────────────────

  function startEditTemplate(t: typeof initTemplates[0]) {
    setEditingTemplate(t.id)
    setTemplateForm({ name: t.name, channel: t.channel, subject: t.subject, body: t.body })
  }

  /**
   * BUG HISTORY (2026-07-15): this previously only updated local React
   * state via setTemplates — no API call at all. Every edit was lost the
   * moment the page refreshed, and had zero effect on what the actual
   * quick-send buttons in the reservation detail panel sent to guests
   * (that component used its own hardcoded, disconnected template text).
   * Now PATCHes /api/message-templates/:id for real, and the reservation
   * panel fetches from the same endpoint — one source of truth.
   */
  async function saveTemplate() {
    if (!editingTemplate) return
    try {
      const res = await fetch(`/api/message-templates/${editingTemplate}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateForm),
      })
      if (res.ok) {
        const { data } = await res.json()
        setTemplates(prev => prev.map(t => t.id === editingTemplate ? data : t))
        toast({ title: "Template saved" })
      } else {
        toast({ title: "Failed to save template", variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed to save template", variant: "destructive" })
    }
    setEditingTemplate(null)
  }

  /** Creates a new blank template and immediately opens it for editing. */
  async function createTemplate() {
    try {
      const res = await fetch("/api/message-templates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Template", channel: "EMAIL", subject: "", body: "Hi {{firstName}}," }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setTemplates(prev => [...prev, data])
        startEditTemplate(data)
      } else {
        toast({ title: "Failed to create template", variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed to create template", variant: "destructive" })
    }
  }

  /** Soft-deletes a template (active: false) — kept for audit, hidden from send buttons. */
  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template? It will no longer appear in the quick-send list.")) return
    try {
      const res = await fetch(`/api/message-templates/${id}`, { method: "DELETE" })
      if (res.ok) {
        setTemplates(prev => prev.filter(t => t.id !== id))
        toast({ title: "Template deleted" })
      } else {
        toast({ title: "Failed to delete template", variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed to delete template", variant: "destructive" })
    }
  }

  // ── Load sample data ────────────────────────────────────────────────────

  async function loadSampleData() {
    setSeedLoading(true)
    try {
      const staff = initStaff[0] as AnyRecord
      const today = new Date().toISOString().split("T")[0]
      const sampleData = [
        { firstName: "James", lastName: "Morrison", phone: "4045551001", date: today, arrivalTime: "18:00", partySize: 2, occasion: "Anniversary", notes: "Window seat preferred", source: "staff" },
        { firstName: "Sarah", lastName: "Williams", phone: "4045551002", date: today, arrivalTime: "19:00", partySize: 4, notes: "One guest has shellfish allergy", source: "staff" },
        { firstName: "Michael", lastName: "Chen", phone: "4045551003", date: today, arrivalTime: "19:30", partySize: 6, occasion: "Birthday", notes: "Birthday cake arranged", source: "staff" },
        { firstName: "Emily", lastName: "Davis", phone: "4045551004", date: today, arrivalTime: "20:00", partySize: 2, source: "staff" },
        { firstName: "Robert", lastName: "Taylor", phone: "4045551005", date: today, arrivalTime: "20:30", partySize: 8, section: "PATIO", source: "staff" },
      ]
      let created = 0
      for (const rsvp of sampleData) {
        const res = await fetch("/api/reservations", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...rsvp, serverId: staff?.id }),
        })
        if (res.ok) created++
      }
      toast({ title: `${created} sample reservations created`, description: "Navigate to Reservations to see them" })
      router.refresh()
    } catch { toast({ title: "Failed to load sample data", variant: "destructive" }) }
    finally { setSeedLoading(false) }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header + Tab bar */}
      <div className="px-6 pt-4 pb-0 border-b border-border bg-hive-surface shrink-0">
        <h1 className="font-serif text-2xl text-gold-500 mb-3">Administration</h1>
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                tab === t.id
                  ? "border-gold-500 text-gold-500"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Overview ────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="space-y-6 max-w-4xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Active Staff",     value: stats.staffCount, icon: Users,       color: "text-blue-400" },
                { label: "Tables",           value: stats.tableCount, icon: Table2,      color: "text-green-400" },
                { label: "Bar Seats",        value: stats.barSeatCount, icon: Table2,    color: "text-amber-400" },
                { label: "Total Reservations", value: stats.rsvpCount, icon: CalendarDays, color: "text-gold-500" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-hive-surface border border-border rounded-xl p-5">
                  <Icon className={cn("h-5 w-5 mb-2", color)} />
                  <div className={cn("font-serif text-4xl font-medium mb-1", color)}>{value}</div>
                  <div className="text-sm text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
            <div className="bg-hive-surface border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <h2 className="font-medium text-sm">Recent Reservations</h2>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => router.push("/reservations")}>View All</Button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-hive-surface2">
                    {["Guest","Date","Party","Status","Server","Created"].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentReservations.map(r => (
                    <tr key={r.id as string} className="border-b border-border last:border-0 hover:bg-hive-surface2/40">
                      <td className="px-4 py-2.5 text-sm font-medium">{r.firstName as string} {r.lastName as string}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(r.date as string)} {formatTime(r.arrivalTime as string)}</td>
                      <td className="px-4 py-2.5 text-sm text-center">{r.partySize as number}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={r.status as "REQUESTED"} /></td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{(r.server as AnyRecord)?.name as string ?? "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(r.createdAt as string).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Staff ───────────────────────────────────────────────────── */}
        {tab === "staff" && (
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-medium">{staff.length} active staff members</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Click Edit to update name, role, PIN, or access level</p>
              </div>
              <p className="text-xs text-amber-400">⚠ Change all PINs before go-live</p>
            </div>
            <Button size="sm" variant="outline" className="w-full h-9 mb-1" onClick={() => setShowPositionManager(true)}>
              Manage Positions
            </Button>
            {/* Add new staff member */}
            {!addingNewStaff ? (
              <Button size="sm" variant="outline" className="w-full h-10 border-dashed" onClick={() => setAddingNewStaff(true)}>
                <Users className="h-3.5 w-3.5 mr-2" />Add New Staff Member
              </Button>
            ) : (
              <div className="bg-hive-surface border border-gold-500/30 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-gold-500">New Staff Member</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name *"><Input value={newStaffForm.name} onChange={e => setNewStaffForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" /></Field>
                  <Field label="Role *"><Input value={newStaffForm.role} onChange={e => setNewStaffForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Server" /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Email *"><Input value={newStaffForm.email} onChange={e => setNewStaffForm(f => ({ ...f, email: e.target.value }))} type="email" placeholder="email@hive.com" /></Field>
                  <Field label="PIN *">
                    <Input value={newStaffForm.pin} onChange={e => setNewStaffForm(f => ({ ...f, pin: e.target.value.replace(/\D/g,'').slice(0,4) }))} placeholder="4 digits" maxLength={4} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Access Level">
                    <Select value={newStaffForm.accessLevel} onValueChange={v => setNewStaffForm(f => ({ ...f, accessLevel: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ACCESS_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Color">
                    <div className="flex gap-2">
                      <input type="color" value={newStaffForm.color} onChange={e => setNewStaffForm(f => ({ ...f, color: e.target.value }))} className="h-9 w-14 rounded border border-input bg-transparent cursor-pointer" />
                      <Input value={newStaffForm.color} onChange={e => setNewStaffForm(f => ({ ...f, color: e.target.value }))} className="font-mono text-xs" />
                    </div>
                  </Field>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveNewStaff} disabled={saving}><Save className="h-3.5 w-3.5 mr-1.5" />{saving ? "Adding…" : "Add Staff Member"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingNewStaff(false)}><X className="h-3.5 w-3.5 mr-1.5" />Cancel</Button>
                </div>
              </div>
            )}
            {staff.map(member => (
              <div key={member.id as string} className="bg-hive-surface border border-border rounded-xl overflow-hidden">
                {editingStaffId === member.id ? (
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Name"><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></Field>
                      <Field label="Role"><Input value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} /></Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Access Level">
                        <Select value={editForm.accessLevel} onValueChange={v => setEditForm(f => ({ ...f, accessLevel: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{ACCESS_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                        </Select>
                      </Field>
                      <Field label="New PIN (leave blank to keep)">
                        <div className="relative">
                          <Input type={showPin ? "text" : "password"} maxLength={4} placeholder="••••"
                            value={editForm.pin} onChange={e => setEditForm(f => ({ ...f, pin: e.target.value.replace(/\D/g,"").slice(0,4) }))} />
                          <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Email"><Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} type="email" /></Field>
                      <Field label="Color">
                        <div className="flex gap-2">
                          <input type="color" value={editForm.color} onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))} className="h-9 w-14 rounded border border-input bg-transparent cursor-pointer" />
                          <Input value={editForm.color} onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))} className="font-mono text-xs" />
                        </div>
                      </Field>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={() => saveStaff(member.id as string)} disabled={saving}>
                        <Save className="h-3.5 w-3.5 mr-1.5" />{saving ? "Saving…" : "Save Changes"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingStaffId(null)}><X className="h-3.5 w-3.5 mr-1.5" />Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center px-4 py-3 gap-3">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: member.color as string }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{member.name as string}</span>
                        <span className={cn("text-[10px] font-semibold uppercase tracking-wider", ACCESS_COLORS[member.accessLevel as string])}>{member.accessLevel as string}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{member.role as string} · {member.email as string}</div>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mr-2">PIN: ••••</div>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setScheduleEditorStaff({ id: member.id as string, name: member.name as string })}>
                      Schedule
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => startEditStaff(member)}>
                      <Edit3 className="h-3 w-3 mr-1" />Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-300" onClick={() => setOffboardingStaff({ id: member.id as string, name: member.name as string })}>
                      Offboard
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Tables ──────────────────────────────────────────────────── */}
        {tab === "tables" && (
          <div className="w-full">
            {/* Sub-tabs */}
            <div className="flex items-center gap-1 mb-5 border-b border-border pb-0">
              {[
                { id: "list",   label: "Table List" },
                { id: "editor", label: "🗺 Floor Plan Editor" },
              ].map(st => (
                <button key={st.id}
                  onClick={() => setTablesSubTab(st.id)}
                  className={cn(
                    "px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
                    tablesSubTab === st.id
                      ? "border-gold-500 text-gold-400"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}>
                  {st.label}
                </button>
              ))}
            </div>

            {/* Table List */}
            {tablesSubTab === "list" && (
              <div className="max-w-4xl">
                <div className="mb-4">
                  {/* BUG HISTORY (2026-07-15): this counted every active
                      Table row including individual bar stools (20 of them,
                      each its own row so the floor editor can position/
                      track them separately) as if each were a "table" — a
                      20-seat bar showed as "20 tables". Now splits the
                      count: real tables vs. bar seats, matching the same
                      distinction made on the Overview stat cards. */}
                  <h2 className="font-medium">
                    {tables.filter(t => t.svgShape !== "stool").length} active tables
                    <span className="text-muted-foreground font-normal"> · {tables.filter(t => t.svgShape === "stool").length} bar seats</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Table layout and capacity overview</p>
                </div>
                {(["FINE_DINING","BAR","DEN","PATIO"] as const).map(section => {
                  const sectionTables = tables.filter(t => t.section === section)
                  const labels: Record<string, string> = { FINE_DINING: "Fine Dining", BAR: "Bar", DEN: "Den / Lounge", PATIO: "Patio" }
                  const totalSeats = sectionTables.reduce((a, t) => a + (t.capacity as number), 0)
                  // BUG HISTORY (2026-07-15): this always said "{count} tables ·
                  // {seats} seats" — for the Bar section, where every item is
                  // an individual bar stool (svgShape:"stool"), that rendered
                  // as the confusing "20 tables · 20 seats" for what is
                  // actually a single 20-seat bar, not 20 separate tables.
                  // Now counts real tables and bar seats separately and
                  // adjusts the label so a stool-only section reads
                  // correctly as seats, not tables.
                  const realTableCount = sectionTables.filter(t => t.svgShape !== "stool").length
                  const stoolCount = sectionTables.filter(t => t.svgShape === "stool").length
                  const sectionLabel = realTableCount > 0 && stoolCount > 0
                    ? `${realTableCount} tables · ${stoolCount} bar seats · ${totalSeats} total seats`
                    : stoolCount > 0
                    ? `${stoolCount} bar seats`
                    : `${realTableCount} tables · ${totalSeats} seats`
                  return (
                    <div key={section} className="mb-6">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-sm font-semibold text-gold-500">{labels[section]}</h3>
                        <span className="text-xs text-muted-foreground">{sectionLabel}</span>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                        {sectionTables.map(t => (
                          <div key={t.id as string} className="bg-hive-surface border border-border rounded-lg p-2.5 text-center">
                            <div className="font-bold text-xs text-gold-500 mb-0.5">{t.label as string ?? t.displayId as string}</div>
                            <div className="text-[10px] text-muted-foreground">{t.capacity as number} {(t.capacity as number) === 1 ? "seat" : "seats"}</div>
                            <div className={cn("text-[9px] mt-1 font-semibold",
                              t.state === "AVAILABLE" ? "text-green-400" : t.state === "SEATED" ? "text-purple-400" :
                              t.state === "DIRTY" ? "text-red-400" : "text-muted-foreground")}>
                              {t.state as string}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Floor Plan Editor */}
            {tablesSubTab === "editor" && (
              <FloorPlanEditor />
            )}
          </div>
        )}

        {/* ── Hours ───────────────────────────────────────────────────── */}
        {tab === "hours" && (
          <div className="max-w-lg">
            <div className="mb-4">
              <h2 className="font-medium">Operating Hours</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Adjust open/close times for each day</p>
            </div>
            <div className="bg-hive-surface border border-border rounded-xl overflow-hidden">
              {DAYS.map((day, i) => {
                const h = hours.find(x => (x.dayOfWeek as number) === i) as AnyRecord | undefined
                const isClosed = h?.closed as boolean ?? i === 0
                return (
                  <div key={day} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                    <span className="text-sm font-medium w-24 shrink-0">{day}</span>
                    <label className="flex items-center gap-2 cursor-pointer shrink-0">
                      <div className="relative">
                        <input type="checkbox" className="sr-only" checked={!isClosed}
                          onChange={e => saveHours(i, "closed", !e.target.checked)} />
                        <div className={cn("w-8 h-4 rounded-full transition-colors", !isClosed ? "bg-green-500" : "bg-muted")} />
                        <div className={cn("absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform", !isClosed && "translate-x-4")} />
                      </div>
                      <span className="text-xs text-muted-foreground">{isClosed ? "Closed" : "Open"}</span>
                    </label>
                    {!isClosed && (
                      <>
                        <Input type="time" className="h-7 text-xs w-28" value={(h?.openTime as string) ?? "17:00"}
                          onChange={e => saveHours(i, "openTime", e.target.value)} />
                        <span className="text-muted-foreground text-xs">to</span>
                        <Input type="time" className="h-7 text-xs w-28" value={(h?.closeTime as string) ?? "22:00"}
                          onChange={e => saveHours(i, "closeTime", e.target.value)} />
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Message Templates ────────────────────────────────────────── */}
        {tab === "messages" && (
          <div className="max-w-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-medium">Message Templates</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Variables: {"{{firstName}}"} {"{{date}}"} {"{{time}}"} {"{{partySize}}"} {"{{rsvpCode}}"} {"{{changeUrl}}"}
                </p>
              </div>
              <Button size="sm" onClick={createTemplate}><Plus className="h-3.5 w-3.5 mr-1.5" />New Template</Button>
            </div>
            {templates.map(t => (
              <div key={t.id} className="bg-hive-surface border border-border rounded-xl overflow-hidden">
                {editingTemplate === t.id ? (
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Template Name"><Input value={templateForm.name} onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))} /></Field>
                      <Field label="Channel">
                        <Select value={templateForm.channel} onValueChange={v => setTemplateForm(f => ({ ...f, channel: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EMAIL">Email</SelectItem>
                            <SelectItem value="SMS">SMS</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                    {templateForm.channel === "EMAIL" && (
                      <Field label="Subject"><Input value={templateForm.subject} onChange={e => setTemplateForm(f => ({ ...f, subject: e.target.value }))} /></Field>
                    )}
                    <Field label="Message Body">
                      <Textarea value={templateForm.body} onChange={e => setTemplateForm(f => ({ ...f, body: e.target.value }))} className="h-40 font-mono text-xs" />
                    </Field>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveTemplate}><Save className="h-3.5 w-3.5 mr-1.5" />Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingTemplate(null)}><X className="h-3.5 w-3.5 mr-1.5" />Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-sm">{t.name}</div>
                        <span className={cn("text-[10px] font-semibold uppercase tracking-wider", t.channel === "EMAIL" ? "text-blue-400" : "text-green-400")}>
                          {t.channel === "EMAIL" ? "✉ Email" : "📱 SMS"}
                        </span>
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => startEditTemplate(t)}>
                        <Edit3 className="h-3 w-3 mr-1" />Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-300" onClick={() => deleteTemplate(t.id)}>
                        <X className="h-3 w-3 mr-1" />Delete
                      </Button>
                    </div>
                    {t.subject && <p className="text-xs text-muted-foreground mb-1">Subject: <span className="text-foreground">{t.subject}</span></p>}
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans bg-hive-surface2 rounded-lg p-3 max-h-32 overflow-y-auto">{t.body}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Team Tools (Onboarding, Announcements, Feedback, Quo) ────── */}
        {tab === "team" && (
          <div className="max-w-3xl space-y-6">
            <div>
              <h2 className="font-medium">Team Tools</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Onboarding access, staff announcements, feedback inbox, and customer messaging</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <PendingApprovalsPanel />
              <IntegrationDiagnosticsPanel />
              <OnboardingManager />
              <QuoLinkCard />
              <MessageBlastTool />
              <FeedbackInbox />
            </div>
          </div>
        )}

        {/* ── Settings ────────────────────────────────────────────────── */}
        {tab === "settings" && (
          <div className="max-w-xl space-y-6">
            <div>
              <h2 className="font-medium">System Settings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Configuration and data management</p>
            </div>

            {/* Sample data */}
            <div className="bg-hive-surface border border-border rounded-xl p-5">
              <div className="flex items-start gap-3">
                <Database className="h-5 w-5 text-gold-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-sm mb-1">Load Sample Data</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Creates 5 sample reservations for today so you can test the app. Safe to run multiple times.
                  </p>
                  <Button size="sm" onClick={loadSampleData} disabled={seedLoading}>
                    {seedLoading ? "Loading…" : "Load Sample Reservations"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Public RSVP form */}
            <div className="bg-hive-surface border border-border rounded-xl p-5">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-sm mb-1">Public RSVP Form</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Share this link with guests to let them book online. Reservations appear as "Requested" and need staff confirmation.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/rsvp`} className="text-xs font-mono h-8" />
                    <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/rsvp`)
                      toast({ title: "Link copied!" })
                    }}>Copy</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Reservation settings */}
            <div className="bg-hive-surface border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-medium text-sm">Reservation Settings</h3>
              {!appSettings ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-sm">Max party size for online booking</span>
                    <Input type="number" min={1} max={100} value={appSettings.maxPartySize}
                      onChange={e => setAppSettings(s => s ? { ...s, maxPartySize: Number(e.target.value) } : s)}
                      onBlur={() => saveAppSettings({ maxPartySize: appSettings.maxPartySize })}
                      className="w-20 h-8 text-xs text-right" disabled={savingSettings} />
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-sm">Booking window (days in advance)</span>
                    <Input type="number" min={1} max={365} value={appSettings.bookingWindowDays}
                      onChange={e => setAppSettings(s => s ? { ...s, bookingWindowDays: Number(e.target.value) } : s)}
                      onBlur={() => saveAppSettings({ bookingWindowDays: appSettings.bookingWindowDays })}
                      className="w-20 h-8 text-xs text-right" disabled={savingSettings} />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm">Auto-confirm reservations</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => saveAppSettings({ autoConfirm: !appSettings.autoConfirm })} disabled={savingSettings}>
                      {appSettings.autoConfirm ? "Yes — click to disable" : "No — click to enable"}
                    </Button>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Changes save automatically.</p>
            </div>
          </div>
        )}

      </div>

      {/* ── Modals for Positions, Recurring Schedule, Offboarding ── */}
      {showPositionManager && <PositionManager onClose={() => setShowPositionManager(false)} />}
      {scheduleEditorStaff && (
        <RecurringScheduleEditor
          staffId={scheduleEditorStaff.id}
          staffName={scheduleEditorStaff.name}
          onClose={() => setScheduleEditorStaff(null)}
        />
      )}
      {offboardingStaff && (
        <OffboardingForm
          staffId={offboardingStaff.id}
          staffName={offboardingStaff.name}
          onClose={() => setOffboardingStaff(null)}
          onComplete={() => {
            setStaff(prev => prev.filter(s => s.id !== offboardingStaff.id))
            setOffboardingStaff(null)
          }}
        />
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

