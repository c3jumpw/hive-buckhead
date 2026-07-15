"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Search, Plus, Download, RefreshCw,
  Calendar, LayoutList, Columns3,
  Users, Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "./status-badge"
import { ReservationDetailPanel } from "./reservation-detail-panel"
import { NewRsvpModal, CloseTableModal, CancelModal } from "./reservation-modals"
import { SeatGuestModal } from "./reservation-modals"
import { formatDate, formatTime, formatTimeOnly, formatCurrency, cn, todayLocal } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import type { SessionStaff, ReservationStatus } from "@/types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Reservation = any
type ViewMode = "list" | "kanban" | "calendar"

interface Props {
  initialReservations: Reservation[]
  staff: { id: string; name: string; color: string; role: string }[]
  tables: { id: string; displayId: string; capacity: number; section: string; state: string }[]
  session: SessionStaff
}

const TODAY = todayLocal()

const KANBAN_COLS: { status: ReservationStatus; label: string; color: string }[] = [
  { status: "REQUESTED",              label: "Requested",   color: "text-amber-400" },
  { status: "CONFIRMED",              label: "Confirmed",   color: "text-blue-400" },
  { status: "SEATED",                 label: "Seated",      color: "text-purple-400" },
  { status: "COMPLETED",              label: "Completed",   color: "text-green-400" },
  { status: "CANCELLED",              label: "Cancelled",   color: "text-red-400" },
  { status: "CHANGE_REQUESTED",       label: "Change Req.", color: "text-teal-400" },
  { status: "CANCELLATION_REQUESTED", label: "Cancel Req.", color: "text-amber-400" },
]

export function ReservationsClient({ initialReservations, staff, tables, session }: Props) {
  // 2026-07-15: session was previously received as `_session` — accepted
  // but completely unused, meaning EVERY logged-in user (including plain
  // STAFF) had full confirm/seat/edit/cancel/close/message access on this
  // page regardless of role. isReadOnly gates the detail panel's action
  // buttons for STAFF-level users — they can still view and search
  // reservations, just not mutate them.
  const isReadOnly = session.accessLevel === "STAFF"
  const router = useRouter()
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations)
  const [view, setView] = useState<ViewMode>("list")
  const [search, setSearch] = useState("")
  const [dateFilter, setDateFilter] = useState("today")
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "">("")
  const [serverFilter, setServerFilter] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [editRsv, setEditRsv] = useState<Reservation | null>(null)
  const [seatRsv, setSeatRsv] = useState<Reservation | null>(null)
  const [closeRsv, setCloseRsv] = useState<Reservation | null>(null)
  const [cancelRsv, setCancelRsv] = useState<Reservation | null>(null)

  /**
   * BUG HISTORY (2026-07-15): this component previously called
   * useRealtimeReservations(), which subscribes to Supabase Realtime and
   * invalidates a React Query cache key (reservationKeys.lists()) on any
   * change. That would be correct IF this component read its data via
   * useReservations() from src/hooks/use-reservations.ts — but it doesn't;
   * `reservations` above is plain useState seeded once from server props.
   * Invalidating a cache nothing reads is a no-op, so newly created
   * reservations (e.g. public RSVP submissions) never appeared without a
   * manual full page reload — and even then, only if the page's own
   * server-side query happened to include that date (see the date-range
   * fix in reservations/page.tsx).
   *
   * Fixed by matching the pattern already proven elsewhere in this exact
   * codebase (see floor-client.tsx): periodic router.refresh(), which
   * re-runs the server component's data fetch and passes fresh props back
   * down. Simpler than wiring this component onto React Query, and
   * consistent with how the rest of the app already handles this same
   * problem.
   */
  useEffect(() => { const i = setInterval(() => router.refresh(), 30000); return () => clearInterval(i) }, [router])

  const selected = useMemo(() => reservations.find(r => r.id === selectedId) ?? null, [reservations, selectedId])

  const filtered = useMemo(() => {
    return reservations.filter(r => {
      const q = search.toLowerCase()
      if (q && !`${r.firstName} ${r.lastName} ${r.phone} ${r.rsvpCode}`.toLowerCase().includes(q)) return false
      if (statusFilter && r.status !== statusFilter) return false
      if (serverFilter && r.serverId !== serverFilter) return false
      const d = r.date?.split("T")[0] ?? r.date
      if (dateFilter === "today" && d !== TODAY) return false
      if (dateFilter === "upcoming" && d <= TODAY) return false
      if (dateFilter === "past" && d >= TODAY) return false
      return true
    }).sort((a, b) => {
      const da = a.date?.split("T")[0] ?? ""
      const db = b.date?.split("T")[0] ?? ""
      if (da !== db) return da.localeCompare(db)
      return (a.arrivalTime ?? "").localeCompare(b.arrivalTime ?? "")
    })
  }, [reservations, search, statusFilter, serverFilter, dateFilter])

  const todayRsvs = reservations.filter(r => (r.date?.split("T")[0] ?? r.date) === TODAY)
  const stats = {
    today:   todayRsvs.length,
    pending: reservations.filter(r => r.status === "REQUESTED").length,
    seated:  reservations.filter(r => r.status === "SEATED").length,
    covers:  todayRsvs.filter(r => r.status !== "CANCELLED").reduce((a: number, r: Reservation) => a + (r.partySize ?? 0), 0),
  }

  async function apiPatch(id: string, body: object) {
    const res = await fetch(`/api/reservations/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await res.text())
    return (await res.json()).data as Reservation
  }

  function updateLocal(updated: Reservation) {
    setReservations(prev => prev.map(r => r.id === updated.id ? updated : r))
  }

  const handleAction = useCallback(async (action: string, r: Reservation) => {
    try {
      if (action === "confirm") {
        updateLocal(await apiPatch(r.id, { status: "CONFIRMED" }))
        toast({ title: `${r.firstName} confirmed — notification sent` })
      } else if (action === "seat") {
        setSeatRsv(r)
        return // opens modal — no immediate API call
      } else if (action === "approve_change") {
        updateLocal(await apiPatch(r.id, { action: "approve_change", changeRequest: r.changeRequest }))
        toast({ title: "Change approved" })
      } else if (action === "deny_change") {
        updateLocal(await apiPatch(r.id, { action: "deny_change" }))
        toast({ title: "Request denied — reservation kept active" })
      } else if (action === "edit") {
        setEditRsv(r); setNewOpen(true)
      } else if (action === "close") {
        setCloseRsv(r)
      } else if (action === "cancel") {
        setCancelRsv(r)
      } else if (action === "message") {
        // BUG HISTORY (2026-07-15): this previously just showed a success
        // toast with zero backend call — "Message queued... SMS via
        // Twilio" was shown regardless of whether any message was sent,
        // because none ever was. Now calls the real send route
        // (/api/reservations/:id/message), which uses the same
        // SendGrid/Twilio modules as the automatic confirm/cancel
        // notifications, and only shows success after a real send.
        const channel = (r as Reservation & { _msgChannel?: string })._msgChannel ?? "email"
        const msgBody = (r as Reservation & { _msgBody?: string })._msgBody ?? ""
        const res = await fetch(`/api/reservations/${r.id}/message`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel, body: msgBody }),
        })
        if (res.ok) {
          toast({ title: `Message sent to ${r.firstName}`, description: channel === "sms" ? "via SMS" : "via Email" })
        } else {
          const err = await res.json().catch(() => ({}))
          toast({ title: err.error || "Failed to send message", variant: "destructive" })
        }
      }
    } catch (e) {
      toast({ title: "Action failed", description: String(e), variant: "destructive" })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleNew(data: object) {
    if (editRsv) {
      updateLocal(await apiPatch(editRsv.id, data))
      toast({ title: "Reservation updated" })
    } else {
      const res = await fetch("/api/reservations", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to create")
      const created = (await res.json()).data as Reservation
      setReservations(prev => [created, ...prev])
      setSelectedId(created.id)
      toast({ title: `Created — RSVP # ${created.rsvpCode}` })
    }
    setEditRsv(null)
  }

  async function handleClose(data: object) {
    if (!closeRsv) return
    updateLocal(await apiPatch(closeRsv.id, { action: "close_table", reservationId: closeRsv.id, ...data }))
    toast({ title: "Order logged", description: "Table flagged for bussing" })
    setCloseRsv(null)
  }

  async function handleCancel(data: object) {
    if (!cancelRsv) return
    updateLocal(await apiPatch(cancelRsv.id, { action: "cancel", reservationId: cancelRsv.id, ...data }))
    toast({ title: "Reservation cancelled" })
    setCancelRsv(null)
  }

  function exportCSV() {
    const rows = [
      ["RSVP #","First","Last","Phone","Email","Date","Time","Party","Status","Server","Order Total"],
      ...filtered.map((r: Reservation) => [
        r.rsvpCode, r.firstName, r.lastName, r.phone, r.email ?? "",
        r.date?.split("T")[0] ?? r.date, r.arrivalTime, r.partySize, r.status,
        r.server?.name ?? "", r.orderTotal ?? "",
      ]),
    ]
    const csv = rows.map(row => row.map(c => `"${c}"`).join(",")).join("\n")
    const a = document.createElement("a")
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
    a.download = `hive-reservations-${TODAY}.csv`
    a.click()
  }

  const counts = (s: ReservationStatus) => reservations.filter(r => r.status === s).length

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[188px] shrink-0 border-r border-border bg-hive-surface overflow-y-auto">
        <div className="p-3 space-y-5">
          <div>
            <p className="sb-label">Views</p>
            {(["list","kanban","calendar"] as const).map(v => (
              <SidebarItem key={v} active={view === v && !statusFilter} onClick={() => { setView(v); setStatusFilter("") }}
                icon={v === "list" ? <LayoutList className="h-3.5 w-3.5" /> : v === "kanban" ? <Columns3 className="h-3.5 w-3.5" /> : <Calendar className="h-3.5 w-3.5" />}>
                {v === "list" ? "List View" : v === "kanban" ? "Board View" : "Calendar"}
              </SidebarItem>
            ))}
            <div className="h-px bg-border mx-2 my-2" />
            <SidebarItem active={dateFilter === "today" && !statusFilter} onClick={() => { setDateFilter("today"); setStatusFilter(""); setView("list") }} icon={<Clock className="h-3.5 w-3.5" />} badge={stats.today} badgeLive={stats.today > 0}>Today</SidebarItem>
            <SidebarItem active={dateFilter === "upcoming" && !statusFilter} onClick={() => { setDateFilter("upcoming"); setStatusFilter(""); setView("list") }} icon={<Calendar className="h-3.5 w-3.5" />}>Upcoming</SidebarItem>
          </div>
          <div>
            <p className="sb-label">By Status</p>
            <SidebarItem active={!statusFilter} onClick={() => setStatusFilter("")} dot="bg-muted-foreground" badge={reservations.length}>All</SidebarItem>
            {([
              { s: "REQUESTED" as const,              dot: "bg-amber-400",  label: "Requested" },
              { s: "CONFIRMED" as const,              dot: "bg-blue-400",   label: "Confirmed" },
              { s: "SEATED" as const,                 dot: "bg-purple-400", label: "Seated",    live: true },
              { s: "COMPLETED" as const,              dot: "bg-green-400",  label: "Completed" },
              { s: "CANCELLED" as const,              dot: "bg-red-400",    label: "Cancelled" },
              { s: "CHANGE_REQUESTED" as const,       dot: "bg-teal-400",   label: "Change Req.", live: true },
              { s: "CANCELLATION_REQUESTED" as const, dot: "bg-amber-400",  label: "Cancel Req.", live: true },
            ]).map(({ s, dot, label, live }) => (
              <SidebarItem key={s} active={statusFilter === s} onClick={() => { setStatusFilter(s); setView("list") }} dot={dot} badge={counts(s)} badgeLive={live && counts(s) > 0}>{label}</SidebarItem>
            ))}
          </div>
          <div>
            <p className="sb-label">Reports</p>
            <SidebarItem onClick={exportCSV} icon={<Download className="h-3.5 w-3.5" />}>Export CSV</SidebarItem>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Stats */}
        <div className="flex border-b border-border shrink-0">
          {[
            { label: "Today's Reservations", value: stats.today,   color: "text-gold-500" },
            { label: "Awaiting Confirm",      value: stats.pending, color: "text-amber-400" },
            { label: "Seated Now",            value: stats.seated,  color: "text-purple-400" },
            { label: "Covers Today",          value: stats.covers,  color: "text-green-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex-1 px-4 py-3 border-r border-border last:border-r-0">
              <div className="text-[10px] text-muted-foreground tracking-wide mb-1">{label}</div>
              <div className={cn("font-serif text-[22px] font-medium leading-none", color)}>{value}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-hive-surface shrink-0">
          <div className="relative flex-1 max-w-[280px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input placeholder="Search name, phone, RSVP #…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
          </div>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="past">Past</SelectItem>
            </SelectContent>
          </Select>
          <Select value={serverFilter} onValueChange={setServerFilter}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All Servers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Servers</SelectItem>
              {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.refresh()}><RefreshCw className="h-3.5 w-3.5" /></Button>
          {!isReadOnly && (
            <Button size="sm" className="h-8 text-xs" onClick={() => { setEditRsv(null); setNewOpen(true) }}><Plus className="h-3.5 w-3.5 mr-1" /> New</Button>
          )}
        </div>

        {/* Content + panel */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto">
            {view === "list"     && <ListViewTable reservations={filtered} selectedId={selectedId} onSelect={setSelectedId} />}
            {view === "kanban"   && <KanbanView reservations={filtered} selectedId={selectedId} onSelect={setSelectedId} />}
            {view === "calendar" && <CalendarView reservations={filtered} onSelect={setSelectedId} />}
          </div>
          {selected && (
            <ReservationDetailPanel reservation={selected} onClose={() => setSelectedId(null)} onAction={handleAction} staffList={staff} readOnly={isReadOnly} />
          )}
        </div>
      </div>

      {/* Modals */}
      <NewRsvpModal open={newOpen} onClose={() => { setNewOpen(false); setEditRsv(null) }} onSubmit={handleNew} initial={editRsv} staff={staff} tables={tables} />
      <SeatGuestModal
        open={!!seatRsv}
        reservation={seatRsv}
        tables={tables}
        onClose={() => setSeatRsv(null)}
        onSubmit={async (tableIds) => {
          if (!seatRsv) return
          updateLocal(await apiPatch(seatRsv.id, { status: "SEATED", tableIds }))
          toast({ title: `${seatRsv.firstName} ${seatRsv.lastName} seated` })
          setSeatRsv(null)
        }}
      />
      <CloseTableModal open={!!closeRsv} reservation={closeRsv} onClose={() => setCloseRsv(null)} onSubmit={handleClose} />
      <CancelModal open={!!cancelRsv} reservation={cancelRsv} onClose={() => setCancelRsv(null)} onSubmit={handleCancel} />
    </div>
  )
}

function ListViewTable({ reservations, selectedId, onSelect }: { reservations: Reservation[]; selectedId: string | null; onSelect: (id: string) => void }) {
  if (!reservations.length) return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
      <Users className="h-8 w-8 opacity-30" />
      <p className="text-sm">No reservations match your filters</p>
    </div>
  )
  return (
    <table className="w-full border-collapse">
      <thead className="sticky top-0 z-10">
        <tr className="bg-hive-surface border-b border-border">
          {["Guest","Date & Time","Party","Status","Seated","Exit","Server","Tables","RSVP #","Order"].map(h => (
            <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {reservations.map(r => {
          const date = r.date?.split("T")[0] ?? r.date
          const tableIds = (r.tables ?? []).map((rt: { table: { displayId: string } }) => rt.table?.displayId).filter(Boolean)
          return (
            <tr key={r.id} onClick={() => onSelect(r.id)} className={cn("border-b border-border cursor-pointer transition-colors", selectedId === r.id ? "bg-hive-surface2" : "hover:bg-hive-surface2/60")}>
              <td className="px-3 py-2.5"><div className="font-medium text-sm">{r.firstName} {r.lastName}</div><div className="text-[11px] text-muted-foreground">{r.phone}</div></td>
              <td className="px-3 py-2.5"><div className="text-sm">{formatDate(date)}</div><div className="text-[11px] text-muted-foreground">{formatTime(r.arrivalTime)}</div></td>
              <td className="px-3 py-2.5 text-center font-serif text-lg">{r.partySize}</td>
              <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.seatedAt ? formatTimeOnly(r.seatedAt) : "—"}</td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.completedAt ? formatTimeOnly(r.completedAt) : "—"}</td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.server?.name ?? "—"}</td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground">{tableIds.join(", ") || "—"}</td>
              <td className="px-3 py-2.5 text-[11px] font-medium text-gold-500 tracking-wider">{r.rsvpCode}</td>
              <td className="px-3 py-2.5 text-xs text-green-400">{r.orderTotal ? formatCurrency(r.orderTotal) : "—"}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function KanbanView({ reservations, selectedId, onSelect }: { reservations: Reservation[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="flex gap-3 p-4 overflow-x-auto h-full">
      {KANBAN_COLS.map(col => {
        const cards = reservations.filter(r => r.status === col.status)
        return (
          <div key={col.status} className="w-56 shrink-0 flex flex-col gap-2">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-hive-surface rounded-lg border border-border">
              <span className={cn("h-2 w-2 rounded-full bg-current shrink-0", col.color)} />
              <span className="text-xs font-medium flex-1">{col.label}</span>
              <span className="text-[10px] text-muted-foreground bg-hive-surface2 px-1.5 rounded-full">{cards.length}</span>
            </div>
            <div className="space-y-2 overflow-y-auto flex-1 pb-4">
              {cards.map(r => (
                <div key={r.id} onClick={() => onSelect(r.id)} className={cn("bg-hive-surface border rounded-lg p-3 cursor-pointer transition-all hover:-translate-y-0.5", selectedId === r.id ? "border-gold-500/50" : "border-border")}>
                  <div className="font-medium text-sm mb-1">{r.firstName} {r.lastName}</div>
                  <div className="text-[11px] text-muted-foreground">{formatDate(r.date?.split("T")[0] ?? r.date)} · {formatTime(r.arrivalTime)}</div>
                  {r.server?.name && <div className="text-[11px] text-muted-foreground mt-0.5">{r.server.name}</div>}
                  {(r.seatedAt || r.completedAt) && (
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex gap-2">
                      {r.seatedAt && <span>Seated {formatTimeOnly(r.seatedAt)}</span>}
                      {r.completedAt && <span>Exit {formatTimeOnly(r.completedAt)}</span>}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                    <span className="text-[11px] text-muted-foreground">👥 {r.partySize}</span>
                    <span className="text-[10px] text-gold-500 font-medium">{r.rsvpCode}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CalendarView({ reservations, onSelect }: { reservations: Reservation[]; onSelect: (id: string) => void }) {
  const [calDate, setCalDate] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const year = calDate.getFullYear(); const month = calDate.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let i = 1; i <= daysInMonth; i++) cells.push(i)
  const statusColors: Record<string, string> = {
    REQUESTED: "bg-amber-500/20 text-amber-300", CONFIRMED: "bg-blue-500/20 text-blue-300",
    SEATED: "bg-purple-500/20 text-purple-300",  COMPLETED: "bg-green-500/20 text-green-300", CANCELLED: "bg-red-500/20 text-red-300",
  }
  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <button className="p-1 hover:bg-hive-surface2 rounded text-muted-foreground" onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>‹</button>
        <h2 className="font-serif text-xl font-medium text-gold-500">{calDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2>
        <button className="p-1 hover:bg-hive-surface2 rounded text-muted-foreground" onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>›</button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="bg-hive-surface px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} className="bg-hive-surface/40 min-h-[90px]" />
          const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`
          const dayRsvs = reservations.filter(r => (r.date?.split("T")[0] ?? r.date) === ds)
          const isT = ds === TODAY
          return (
            <div key={ds} className={cn("bg-hive-surface min-h-[90px] p-1.5", isT && "bg-gold-500/5 ring-1 ring-gold-500/30 ring-inset")}>
              <span className={cn("text-xs font-medium block mb-1", isT ? "text-gold-500" : "text-muted-foreground")}>{day}</span>
              {dayRsvs.slice(0,3).map(r => (
                <div key={r.id} onClick={() => onSelect(r.id)} className={cn("text-[10px] px-1.5 py-0.5 rounded mb-0.5 cursor-pointer truncate hover:brightness-110", statusColors[r.status] ?? "bg-muted text-muted-foreground")}>
                  {r.firstName} {r.lastName?.charAt(0)}. {formatTime(r.arrivalTime)}
                </div>
              ))}
              {dayRsvs.length > 3 && <div className="text-[10px] text-muted-foreground px-1">+{dayRsvs.length-3} more</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SidebarItem({ children, active, onClick, icon, dot, badge, badgeLive }: {
  children: React.ReactNode; active?: boolean; onClick?: () => void
  icon?: React.ReactNode; dot?: string; badge?: number; badgeLive?: boolean
}) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-2 w-full px-2 py-[7px] rounded-md text-[12.5px] transition-colors text-left", active ? "bg-hive-surface3 text-gold-500" : "text-muted-foreground hover:bg-hive-surface2 hover:text-foreground")}>
      {icon && <span className="shrink-0">{icon}</span>}
      {dot && <span className={cn("h-2 w-2 rounded-full shrink-0", dot)} />}
      <span className="flex-1">{children}</span>
      {badge !== undefined && badge > 0 && (
        <span className={cn("text-[10px] px-1.5 rounded-full min-w-[18px] text-center", badgeLive ? "bg-gold-500 text-hive-bg font-semibold" : "bg-hive-surface3 text-muted-foreground")}>{badge}</span>
      )}
    </button>
  )
}
