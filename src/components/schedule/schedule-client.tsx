"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { SessionStaff } from "@/types"
import { format, addDays, parseISO } from "date-fns"
import { toast } from "@/hooks/use-toast"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Shift = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Callout = any

interface Props {
  shifts: Shift[]
  callouts: Callout[]
  staff: { id: string; name: string; color: string; role: string }[]
  session: SessionStaff
  weekStart: string
  prevWeek: string
  nextWeek: string
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const SHIFT_COLORS: Record<string, string> = {
  OPEN:   "bg-amber-500/15 border-amber-500/40 text-amber-300",
  MID:    "bg-blue-500/15 border-blue-500/40 text-blue-300",
  CLOSE:  "bg-purple-500/15 border-purple-500/40 text-purple-300",
  DOUBLE: "bg-green-500/15 border-green-500/40 text-green-300",
}

export function ScheduleClient({ shifts, callouts, staff, session, weekStart, prevWeek, nextWeek }: Props) {
  const router = useRouter()
  const [newShiftOpen, setNewShiftOpen] = useState(false)
  const [calloutOpen, setCalloutOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ staffId: "", date: weekStart, startTime: "17:00", endTime: "23:00", type: "CLOSE", role: "" })
  const isAdmin = session.accessLevel === "OWNER" || session.accessLevel === "MANAGER"
  // Non-admins can only log a callout for themselves — see the callout
  // route's authorization check. Defaulting this here (rather than only in
  // the JSX) means the "Log Callout" button isn't stuck disabled for them
  // waiting on a staffId value they're never shown a picker to set.
  const [coForm, setCoForm] = useState({ staffId: isAdmin ? "" : session.id, date: weekStart, reason: "SICK", coveredById: "", notes: "" })
  const weekDates = DAYS.map((_, i) => format(addDays(parseISO(weekStart), i), "yyyy-MM-dd"))

  async function submitShift() {
    setSubmitting(true)
    try {
      const res = await fetch("/api/shifts", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error("Failed")
      toast({ title: "Shift added" })
      setNewShiftOpen(false)
      router.refresh()
    } catch { toast({ title: "Failed to add shift", variant: "destructive" }) }
    finally { setSubmitting(false) }
  }

  async function submitCallout() {
    setSubmitting(true)
    try {
      const res = await fetch("/api/callouts", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(coForm),
      })
      if (!res.ok) throw new Error("Failed")
      toast({ title: "Callout logged" })
      setCalloutOpen(false)
      router.refresh()
    } catch { toast({ title: "Failed to log callout", variant: "destructive" }) }
    finally { setSubmitting(false) }
  }

  const calloutDates = new Set(callouts.map((c: Callout) => c.date?.split("T")[0]))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-hive-surface shrink-0">
        <h1 className="font-serif text-xl text-gold-500">Staff Schedule</h1>
        <div className="flex items-center gap-1 ml-4 bg-hive-surface2 rounded-lg p-1">
          <button className="p-1.5 hover:bg-hive-surface rounded text-muted-foreground hover:text-foreground" onClick={() => router.push(`/schedule?week=${prevWeek}`)}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm px-2 text-foreground">
            {format(parseISO(weekStart), "MMM d")} – {format(addDays(parseISO(weekStart), 6), "MMM d, yyyy")}
          </span>
          <button className="p-1.5 hover:bg-hive-surface rounded text-muted-foreground hover:text-foreground" onClick={() => router.push(`/schedule?week=${nextWeek}`)}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {isAdmin && (
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCalloutOpen(true)}>
              <AlertTriangle className="h-3.5 w-3.5 mr-1 text-amber-400" /> Log Callout
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={() => setNewShiftOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Shift
            </Button>
          </div>
        )}
      </div>

      {/* Callout alerts */}
      {callouts.length > 0 && (
        <div className="flex gap-2 px-6 py-2 border-b border-border bg-amber-500/5 shrink-0 overflow-x-auto">
          {callouts.map((c: Callout) => (
            <div key={c.id} className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 text-xs whitespace-nowrap">
              <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
              <span className="text-amber-300 font-medium">{c.staff?.name}</span>
              <span className="text-amber-400/70">— {c.reason?.replace("_", " ")} · {format(parseISO(c.date?.split("T")[0]), "EEE M/d")}</span>
              {c.coveredBy && <span className="text-green-400">→ {c.coveredBy.name}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Schedule grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-[140px_repeat(7,1fr)] min-w-[800px]">
          {/* Header row */}
          <div className="bg-hive-surface border-b border-r border-border px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Staff Member
          </div>
          {DAYS.map((day, i) => {
            const date = weekDates[i]
            const today = new Date().toISOString().split("T")[0]
            const hasCallout = calloutDates.has(date)
            return (
              <div key={day} className={cn(
                "bg-hive-surface border-b border-r border-border px-2 py-2.5 text-center",
                date === today && "bg-gold-500/5"
              )}>
                <div className={cn("text-xs font-semibold", date === today ? "text-gold-500" : "text-foreground")}>{day}</div>
                <div className={cn("text-[10px]", date === today ? "text-gold-400" : "text-muted-foreground")}>
                  {format(parseISO(date), "M/d")}
                </div>
                {hasCallout && <div className="mt-0.5 text-[9px] text-amber-400">⚠ callout</div>}
              </div>
            )
          })}

          {/* Staff rows */}
          {staff.map(member => {
            const memberShifts = shifts.filter((s: Shift) => s.staffId === member.id)
            return [
              <div key={`name-${member.id}`} className="border-b border-r border-border px-3 py-3 bg-hive-surface/50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: member.color }} />
                  <div>
                    <div className="text-xs font-medium">{member.name}</div>
                    <div className="text-[10px] text-muted-foreground">{member.role}</div>
                  </div>
                </div>
              </div>,
              ...weekDates.map(date => {
                const dayShift = memberShifts.find((s: Shift) => s.date?.split("T")[0] === date)
                const today = new Date().toISOString().split("T")[0]
                return (
                  <div key={`${member.id}-${date}`} className={cn(
                    "border-b border-r border-border p-1.5 min-h-[70px]",
                    date === today && "bg-gold-500/[.03]"
                  )}>
                    {dayShift ? (
                      <div className={cn("rounded-md border px-2 py-1.5 text-[10px] font-medium h-full", SHIFT_COLORS[dayShift.type] ?? SHIFT_COLORS.CLOSE)}>
                        <div className="font-semibold mb-0.5">{dayShift.type}</div>
                        <div className="opacity-80">{dayShift.startTime}–{dayShift.endTime}</div>
                        {dayShift.role && <div className="opacity-60 truncate mt-0.5">{dayShift.role}</div>}
                      </div>
                    ) : (
                      isAdmin && (
                        <button
                          onClick={() => { setForm(f => ({ ...f, staffId: member.id, date })); setNewShiftOpen(true) }}
                          className="w-full h-full min-h-[52px] rounded-md border border-dashed border-border/50 text-[10px] text-muted-foreground/40 hover:border-border hover:text-muted-foreground transition-colors flex items-center justify-center"
                        >
                          +
                        </button>
                      )
                    )}
                  </div>
                )
              })
            ]
          })}
        </div>
      </div>

      {/* Add Shift Modal */}
      <Dialog open={newShiftOpen} onOpenChange={setNewShiftOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Shift</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Staff Member</Label>
              <Select value={form.staffId} onValueChange={v => setForm(f => ({ ...f, staffId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select staff…" /></SelectTrigger>
                <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Start</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">End</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Shift Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["OPEN","MID","CLOSE","DOUBLE"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewShiftOpen(false)}>Cancel</Button>
            <Button onClick={submitShift} disabled={submitting || !form.staffId}>{submitting ? "Saving…" : "Add Shift"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Callout Modal */}
      <Dialog open={calloutOpen} onOpenChange={setCalloutOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Log Callout</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Who Called Out</Label>
              {/*
                BUG HISTORY (2026-07-15): this dropdown let ANY user pick
                ANY staff member, but the API now correctly rejects a
                non-admin submitting someone else's staffId (see
                src/app/api/callouts/route.ts) — without this fix, a
                regular staff member selecting a coworker here would hit a
                confusing 403 error with no clear explanation. For
                non-admins, the field is locked to their own name; admins
                keep the full picker since they legitimately log callouts
                on behalf of others (e.g. someone calls the restaurant
                directly instead of using the portal).
              */}
              {isAdmin ? (
                <Select value={coForm.staffId} onValueChange={v => setCoForm(f => ({ ...f, staffId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select staff…" /></SelectTrigger>
                  <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input value={session.name} disabled className="opacity-70" />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input type="date" value={coForm.date} onChange={e => setCoForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Reason</Label>
              <Select value={coForm.reason} onValueChange={v => setCoForm(f => ({ ...f, reason: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["SICK","PERSONAL","FAMILY_EMERGENCY","NO_CALL_NO_SHOW","APPROVED_PTO","OTHER"].map(r => (
                    <SelectItem key={r} value={r}>{r.replace(/_/g," ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Covered By</Label>
              <Select value={coForm.coveredById} onValueChange={v => setCoForm(f => ({ ...f, coveredById: v }))}>
                <SelectTrigger><SelectValue placeholder="Uncovered" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Uncovered</SelectItem>
                  {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCalloutOpen(false)}>Cancel</Button>
            <Button onClick={submitCallout} disabled={submitting || !coForm.staffId}>{submitting ? "Saving…" : "Log Callout"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
