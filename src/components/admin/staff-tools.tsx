"use client"

/**
 * src/components/admin/staff-tools.tsx
 * =============================================================================
 * Three admin tools that were previously backend-only (API existed, no UI):
 *   1. PositionManager    — add/list job positions (Server, Bartender, etc.)
 *   2. RecurringScheduleEditor — set a staff member's default weekly schedule
 *   3. OffboardingForm    — multistep termination flow for a staff member
 *
 * Each is a self-contained modal/panel invoked from the Staff tab in
 * admin-client.tsx. They call the existing /api/positions, /api/recurring-shifts,
 * and /api/offboarding routes, which were already correct — only the UI was missing.
 * =============================================================================
 */

import { useState, useEffect } from "react"
import { X, Plus, Save, AlertTriangle, ChevronRight, ChevronLeft } from "lucide-react"
import { toast } from "@/hooks/use-toast"

// ── Positions Manager ─────────────────────────────────────────────────────────

interface Position { id: string; name: string; description: string | null; department: string | null }

export function PositionManager({ onClose }: { onClose: () => void }) {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState("")
  const [newDept, setNewDept] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/positions")
      if (res.ok) { const { data } = await res.json(); setPositions(data) }
    } finally { setLoading(false) }
  }

  async function addPosition() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/positions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), department: newDept.trim() || null }),
      })
      if (res.ok) {
        toast({ title: `Position "${newName}" added` })
        setNewName(""); setNewDept("")
        load()
      } else {
        const err = await res.json()
        toast({ title: err.error || "Failed to add position", variant: "destructive" })
      }
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-hive-surface border border-border rounded-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Manage Positions</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <p className="text-xs text-muted-foreground">Job positions available when adding or editing staff members.</p>

        <div className="flex gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Position name"
            className="flex-1 bg-hive-surface2 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold-400" />
          <input value={newDept} onChange={e => setNewDept(e.target.value)} placeholder="Dept (optional)"
            className="w-28 bg-hive-surface2 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold-400" />
          <button onClick={addPosition} disabled={saving || !newName.trim()}
            className="px-3 py-2 rounded-lg bg-gold-500 hover:bg-gold-600 text-black disabled:opacity-50">
            <Plus size={16} />
          </button>
        </div>

        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : positions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No positions yet — add one above.</p>
          ) : (
            positions.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-hive-surface2 border border-border rounded-lg px-3 py-2">
                <span className="text-sm">{p.name}</span>
                {p.department && <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{p.department}</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Recurring Schedule Editor ──────────────────────────────────────────────────

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const SHIFT_TYPES = ["OPEN", "MID", "CLOSE", "DOUBLE"]

interface RecurringShiftRow {
  dayOfWeek: number
  isWorkDay: boolean
  startTime: string
  endTime: string
  type: string
}

export function RecurringScheduleEditor({ staffId, staffName, onClose }: { staffId: string; staffName: string; onClose: () => void }) {
  const [rows, setRows] = useState<RecurringShiftRow[]>(
    DAY_NAMES.map((_, i) => ({ dayOfWeek: i, isWorkDay: false, startTime: "17:00", endTime: "23:00", type: "CLOSE" }))
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/recurring-shifts?staffId=${staffId}`)
      if (res.ok) {
        const { data } = await res.json()
        setRows(prev => prev.map(r => {
          const existing = data.find((d: any) => d.dayOfWeek === r.dayOfWeek)
          return existing ? { dayOfWeek: r.dayOfWeek, isWorkDay: existing.isWorkDay, startTime: existing.startTime, endTime: existing.endTime, type: existing.type } : r
        }))
      }
    } finally { setLoading(false) }
  }

  function updateRow(day: number, patch: Partial<RecurringShiftRow>) {
    setRows(prev => prev.map(r => r.dayOfWeek === day ? { ...r, ...patch } : r))
  }

  async function saveAll() {
    setSaving(true)
    let failed = 0
    for (const row of rows) {
      try {
        const res = await fetch("/api/recurring-shifts", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ staffId, ...row }),
        })
        if (!res.ok) failed++
      } catch { failed++ }
    }
    setSaving(false)
    if (failed === 0) toast({ title: `Weekly schedule saved for ${staffName}` })
    else toast({ title: `Saved with ${failed} errors`, variant: "destructive" })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-hive-surface border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium">Default Weekly Schedule</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{staffName} — applies every week unless overridden</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Loading schedule…</p>
        ) : (
          <div className="space-y-2">
            {rows.map(row => (
              <div key={row.dayOfWeek} className="bg-hive-surface2 border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{DAY_NAMES[row.dayOfWeek]}</span>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={row.isWorkDay} onChange={e => updateRow(row.dayOfWeek, { isWorkDay: e.target.checked })} className="rounded" />
                    Working
                  </label>
                </div>
                {row.isWorkDay && (
                  <div className="grid grid-cols-3 gap-2">
                    <input type="time" value={row.startTime} onChange={e => updateRow(row.dayOfWeek, { startTime: e.target.value })}
                      className="bg-hive-surface border border-border rounded px-2 py-1 text-xs" />
                    <input type="time" value={row.endTime} onChange={e => updateRow(row.dayOfWeek, { endTime: e.target.value })}
                      className="bg-hive-surface border border-border rounded px-2 py-1 text-xs" />
                    <select value={row.type} onChange={e => updateRow(row.dayOfWeek, { type: e.target.value })}
                      className="bg-hive-surface border border-border rounded px-2 py-1 text-xs">
                      {SHIFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 border border-border rounded-lg py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={saveAll} disabled={saving}
            className="flex-1 bg-gold-500 hover:bg-gold-600 text-black font-semibold rounded-lg py-2 text-sm disabled:opacity-50 flex items-center justify-center gap-1.5">
            <Save size={14} />{saving ? "Saving…" : "Save Schedule"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Offboarding Multistep Form ─────────────────────────────────────────────────

type OffStep = "reason" | "checklist" | "confirm"

export function OffboardingForm({ staffId, staffName, onClose, onComplete }: {
  staffId: string; staffName: string; onClose: () => void; onComplete: () => void
}) {
  const [step, setStep] = useState<OffStep>("reason")
  const [terminationType, setTerminationType] = useState("voluntary")
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")
  const [terminationDate, setTerminationDate] = useState(new Date().toISOString().split("T")[0])
  const [checklist, setChecklist] = useState({ accessRevoked: false, equipmentReturned: false, finalPayProcessed: false, exitInterviewDone: false })
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setSubmitting(true)
    try {
      const res = await fetch("/api/offboarding", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, terminationType, reason, notes, terminationDate, ...checklist }),
      })
      if (res.ok) {
        toast({ title: `${staffName} has been offboarded`, description: "Access deactivated and record saved." })
        onComplete()
      } else {
        const err = await res.json()
        toast({ title: err.error || "Offboarding failed", variant: "destructive" })
      }
    } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-hive-surface border border-red-500/30 rounded-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-400" />
            <h2 className="font-medium text-red-400">Offboard {staffName}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1">
          {["reason", "checklist", "confirm"].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full ${["reason","checklist","confirm"].indexOf(step) >= ["reason","checklist","confirm"].indexOf(s) ? "bg-red-400" : "bg-hive-surface2"}`} />
          ))}
        </div>

        {step === "reason" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Termination Type</label>
              <select value={terminationType} onChange={e => setTerminationType(e.target.value)}
                className="mt-1 w-full bg-hive-surface2 border border-border rounded-lg px-3 py-2 text-sm">
                <option value="voluntary">Voluntary (resignation)</option>
                <option value="involuntary">Involuntary (termination)</option>
                <option value="layoff">Layoff</option>
                <option value="contract_end">Contract End</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Last Day</label>
              <input type="date" value={terminationDate} onChange={e => setTerminationDate(e.target.value)}
                className="mt-1 w-full bg-hive-surface2 border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Reason (brief)</label>
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Relocated, performance, etc."
                className="mt-1 w-full bg-hive-surface2 border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Internal Notes (admin only)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                className="mt-1 w-full bg-hive-surface2 border border-border rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
            <button onClick={() => setStep("checklist")} className="w-full bg-hive-surface2 border border-border rounded-lg py-2 text-sm flex items-center justify-center gap-1">
              Next: Checklist <ChevronRight size={14} />
            </button>
          </div>
        )}

        {step === "checklist" && (
          <div className="space-y-3">
            {[
              { key: "accessRevoked", label: "System access revoked" },
              { key: "equipmentReturned", label: "Equipment / uniform returned" },
              { key: "finalPayProcessed", label: "Final pay processed" },
              { key: "exitInterviewDone", label: "Exit interview completed" },
            ].map(item => (
              <label key={item.key} className="flex items-center gap-2 bg-hive-surface2 border border-border rounded-lg p-3 cursor-pointer">
                <input type="checkbox" checked={(checklist as any)[item.key]}
                  onChange={e => setChecklist(prev => ({ ...prev, [item.key]: e.target.checked }))} className="rounded" />
                <span className="text-sm">{item.label}</span>
              </label>
            ))}
            <div className="flex gap-2">
              <button onClick={() => setStep("reason")} className="flex-1 border border-border rounded-lg py-2 text-sm flex items-center justify-center gap-1">
                <ChevronLeft size={14} /> Back
              </button>
              <button onClick={() => setStep("confirm")} className="flex-1 bg-hive-surface2 border border-border rounded-lg py-2 text-sm flex items-center justify-center gap-1">
                Next: Confirm <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-3">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-300">
              <p className="font-medium mb-2">This will:</p>
              <ul className="text-xs space-y-1 list-disc pl-4">
                <li>Deactivate {staffName}&apos;s login access immediately</li>
                <li>Mark their employment status as Terminated</li>
                <li>Create a permanent offboarding record</li>
                <li>Log this action to Google Sheets</li>
              </ul>
              <p className="text-xs mt-2 opacity-80">This does not delete their historical data.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep("checklist")} className="flex-1 border border-border rounded-lg py-2 text-sm flex items-center justify-center gap-1">
                <ChevronLeft size={14} /> Back
              </button>
              <button onClick={submit} disabled={submitting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg py-2 text-sm disabled:opacity-50">
                {submitting ? "Processing…" : "Confirm Offboarding"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
