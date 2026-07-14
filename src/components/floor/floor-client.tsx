"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw, X, UserCheck, Plus, Flag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn, formatTime } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import type { SessionStaff } from "@/types"

type TableState = "AVAILABLE" | "RESERVED" | "SEATED" | "DIRTY" | "MAINTENANCE"
type Section = "FINE_DINING" | "BAR" | "DEN" | "PATIO"

interface ActiveRsv { id: string; firstName: string; lastName: string; partySize: number; arrivalTime: string; status: string; date: string }
interface FloorTable { id: string; displayId: string; label?: string | null; capacity: number; section: Section; state: TableState; svgX: number; svgY: number; svgW?: number | null; svgH?: number | null; svgShape?: string | null; reservationTables: { reservation: ActiveRsv }[] }
interface UpcomingRsv { id: string; firstName: string; lastName: string; partySize: number; arrivalTime: string; date: string; rsvpCode: string; tables: { tableId: string }[] }
interface Props { tables: FloorTable[]; session: SessionStaff; upcomingReservations?: UpcomingRsv[] }

const STATE: Record<TableState, { fill: string; stroke: string; seatFill: string; text: string; label: string }> = {
  AVAILABLE:   { fill: "rgba(76,175,130,.14)",  stroke: "#4CAF82", seatFill: "rgba(76,175,130,.38)",  text: "#4CAF82",  label: "OPEN" },
  SEATED:      { fill: "rgba(155,126,200,.22)", stroke: "#9B7EC8", seatFill: "rgba(155,126,200,.48)", text: "#C4B0E8",  label: "SEATED" },
  RESERVED:    { fill: "rgba(212,160,32,.20)",  stroke: "#D4A020", seatFill: "rgba(212,160,32,.42)",  text: "#E8C040",  label: "RSVD" },
  DIRTY:       { fill: "rgba(196,82,74,.20)",   stroke: "#C4524A", seatFill: "rgba(196,82,74,.42)",   text: "#D87070",  label: "BUSSING" },
  MAINTENANCE: { fill: "rgba(107,94,74,.14)",   stroke: "#6B5E4A", seatFill: "rgba(107,94,74,.30)",   text: "#A89B84",  label: "MAINT" },
}

function TableShape({ table: t, selected, onClick }: { table: FloorTable; selected: boolean; onClick: (id: string, e: React.MouseEvent) => void }) {
  const s = STATE[t.state] ?? STATE.AVAILABLE
  const rsv = t.reservationTables[0]?.reservation
  const handleClick = (e: React.MouseEvent) => onClick(t.id, e)

  const shape = t.svgShape ?? (t.section === "BAR" ? "stool" : t.section === "FINE_DINING" ? "round" : "booth")

  // Bar stool
  if (shape === "stool") {
    return (
      <g onClick={handleClick} style={{ cursor: "pointer" }}>
        {selected && <circle cx={t.svgX + 8} cy={t.svgY + 8} r={13} fill="rgba(201,169,110,.2)" stroke="#C9A96E" strokeWidth={1.5} strokeDasharray="3,2" />}
        <circle cx={t.svgX + 8} cy={t.svgY + 8} r={8} fill="rgba(180,140,60,.4)" stroke={selected ? "#C9A96E" : "#C9A96E"} strokeWidth={selected ? 2 : 1.2} />
        <text x={t.svgX + (t.svgW??17)/2} y={t.svgY + (t.svgH??17)/2 + 3} textAnchor="middle" fontSize={6} fill="#C9A96E" fontWeight={700}>{t.displayId.replace("B","")}</text>
      </g>
    )
  }

  // Booth
  if (shape === "booth" && t.capacity < 10) {
    const isBig = t.capacity >= 6
    const bw = t.svgW ?? (isBig ? (t.capacity >= 10 ? 102 : 86) : (t.capacity <= 2 ? 25 : 56))
    const bh = t.svgH ?? (isBig ? (t.capacity >= 10 ? 54 : 44) : (t.capacity <= 2 ? 35 : 36))
    const bk = 7
    const topS = Math.ceil(t.capacity / 2), botS = Math.floor(t.capacity / 2)
    return (
      <g onClick={handleClick} style={{ cursor: "pointer" }}>
        {selected && <rect x={t.svgX - 4} y={t.svgY - 4} width={bw + 8} height={bh + 8} rx={6} fill="rgba(201,169,110,.12)" stroke="#C9A96E" strokeWidth={1.5} strokeDasharray="4,3" />}
        <rect x={t.svgX} y={t.svgY} width={bw} height={bk} rx={2} fill="rgba(160,130,80,.22)" stroke={selected ? "#C9A96E" : s.stroke} strokeWidth={1} />
        <rect x={t.svgX + 2} y={t.svgY + bk + 1} width={bw - 4} height={bh - bk * 2 - 2} rx={2} fill={s.fill} stroke={selected ? "#C9A96E" : s.stroke} strokeWidth={selected ? 2 : 1.5} />
        <rect x={t.svgX} y={t.svgY + bh - bk} width={bw} height={bk} rx={2} fill="rgba(160,130,80,.22)" stroke={selected ? "#C9A96E" : s.stroke} strokeWidth={1} />
        {Array.from({ length: topS }, (_, i) => <circle cx={t.svgX + 6 + i * ((bw - 12) / Math.max(topS - 1, 1))} cy={t.svgY + bk / 2} r={2.5} fill={s.seatFill} key={`ts${i}`} />)}
        {Array.from({ length: botS }, (_, i) => <circle cx={t.svgX + 6 + i * ((bw - 12) / Math.max(botS - 1, 1))} cy={t.svgY + bh - bk / 2} r={2.5} fill={s.seatFill} key={`bs${i}`} />)}
        <text x={t.svgX + bw / 2} y={t.svgY + bh / 2 - 2} textAnchor="middle" fontSize={isBig ? 8 : 7} fill={s.text} fontWeight={700}>{t.label ?? t.displayId}</text>
        <text x={t.svgX + bw / 2} y={t.svgY + bh / 2 + 7} textAnchor="middle" fontSize={6} fill={s.text} opacity={0.75}>{rsv ? `${rsv.firstName} ${rsv.lastName[0]}.` : s.label}</text>
      </g>
    )
  }

  // Big Booth (10-seat)
  if (shape === "booth" && t.capacity >= 10) {
    const bw = 102, bh = 54, bk = 8
    return (
      <g onClick={handleClick} style={{ cursor: "pointer" }}>
        {selected && <rect x={t.svgX - 4} y={t.svgY - 4} width={bw + 8} height={bh + 8} rx={7} fill="rgba(201,169,110,.12)" stroke="#C9A96E" strokeWidth={1.5} strokeDasharray="4,3" />}
        <rect x={t.svgX} y={t.svgY} width={bw} height={bk} rx={3} fill="rgba(160,130,80,.25)" stroke={selected ? "#C9A96E" : s.stroke} strokeWidth={1} />
        <rect x={t.svgX + 2} y={t.svgY + bk + 1} width={bw - 4} height={bh - bk * 2 - 2} rx={3} fill={s.fill} stroke={selected ? "#C9A96E" : s.stroke} strokeWidth={selected ? 2 : 1.5} />
        <rect x={t.svgX} y={t.svgY + bh - bk} width={bw} height={bk} rx={3} fill="rgba(160,130,80,.25)" stroke={selected ? "#C9A96E" : s.stroke} strokeWidth={1} />
        {Array.from({ length: 5 }, (_, i) => <circle cx={t.svgX + 8 + i * 18} cy={t.svgY + bk / 2} r={3} fill={s.seatFill} />)}
        {Array.from({ length: 5 }, (_, i) => <circle cx={t.svgX + 8 + i * 18} cy={t.svgY + bh - bk / 2} r={3} fill={s.seatFill} />)}
        <text x={t.svgX + bw / 2} y={t.svgY + bh / 2 - 2} textAnchor="middle" fontSize={8} fill={s.text} fontWeight={700}>{t.label ?? t.displayId}</text>
        <text x={t.svgX + bw / 2} y={t.svgY + bh / 2 + 8} textAnchor="middle" fontSize={6.5} fill={s.text} opacity={0.75}>{rsv ? `${rsv.firstName} ${rsv.lastName[0]}.` : `${s.label} · 10s`}</text>
      </g>
    )
  }

  // Round table
  const w = t.svgW ?? (t.capacity <= 2 ? 42 : t.capacity === 3 ? 50 : 58)
  const h = t.svgH ?? w
  const cx = t.svgX + w / 2, cy = t.svgY + h / 2
  const r = w / 2 - 2
  const seatAngles: number[] = t.capacity === 2 ? [210, 330] : t.capacity === 3 ? [90, 210, 330] : [45, 135, 225, 315]
  const seatOrbit = r + 7
  return (
    <g onClick={handleClick} style={{ cursor: "pointer" }}>
      {selected && <circle cx={cx} cy={cy} r={r + 12} fill="rgba(201,169,110,.1)" stroke="#C9A96E" strokeWidth={1.5} strokeDasharray="4,3" />}
      {seatAngles.map((deg, i) => {
        const rad = deg * Math.PI / 180
        return <circle key={i} cx={cx + Math.cos(rad) * seatOrbit} cy={cy + Math.sin(rad) * seatOrbit} r={5} fill={s.seatFill} stroke={selected ? "#C9A96E" : s.stroke} strokeWidth={0.8} />
      })}
      <circle cx={cx} cy={cy} r={r} fill={s.fill} stroke={selected ? "#C9A96E" : s.stroke} strokeWidth={selected ? 2 : 1.5} />
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize={7.5} fill={s.text} fontWeight={700}>{t.displayId}</text>
      <text x={cx} y={cy + 7} textAnchor="middle" fontSize={6} fill={s.text} opacity={0.75}>{rsv ? `${rsv.firstName} ${rsv.lastName[0]}.` : s.label}</text>
    </g>
  )
}

export function FloorClient({ tables: initialTables, session, upcomingReservations = [] }: Props) {
  // 2026-07-15: session was received but never used — every logged-in
  // user, including plain STAFF, could seat guests, log walk-ins, and
  // change table status here regardless of role. isReadOnly gates those
  // mutating actions for STAFF-level users, who can still see live table
  // status (useful during a shift) but not change it.
  const isReadOnly = session.accessLevel === "STAFF"
  const dark = true // floor view always uses dark theme
  const router = useRouter()
  const [tables, setTables] = useState(initialTables)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [actionModal, setActionModal] = useState<null | "seat_rsvp" | "walk_in" | "table_action">(null)
  const [selectedRsvId, setSelectedRsvId] = useState("")
  const [walkInSize, setWalkInSize] = useState("2")
  const [walkInName, setWalkInName] = useState("")
  const [walkInPhone, setWalkInPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [activeSection, setActiveSection] = useState<Section | "ALL">("ALL")

  const selectedTables = tables.filter(t => selectedIds.includes(t.id))
  const primaryTable = selectedTables[0] ?? null
  const stats = { open: tables.filter(t => t.state === "AVAILABLE").length, seated: tables.filter(t => t.state === "SEATED").length, reserved: tables.filter(t => t.state === "RESERVED").length, bussing: tables.filter(t => t.state === "DIRTY").length }
  const now = new Date()
  const eligible = upcomingReservations.filter(r => { const d = new Date(`${r.date.split("T")[0]}T${r.arrivalTime}`); const diff = (d.getTime() - now.getTime()) / 3600000; return diff >= -2 && diff <= 24 })

  useEffect(() => { const i = setInterval(() => router.refresh(), 30000); return () => clearInterval(i) }, [router])

  const onTableClick = useCallback((id: string, e: React.MouseEvent) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) { setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]) }
    // Read-only (STAFF) users can still select a table to see its detail
    // highlighted, but clicking never opens the seat/walk-in/status modal.
    else if (isReadOnly) { setSelectedIds([id]) }
    else { setSelectedIds([id]); setActionModal("table_action") }
  }, [])

  async function updateState(ids: string[], newState: TableState) {
    setTables(prev => prev.map(t => ids.includes(t.id) ? { ...t, state: newState } : t))
    for (const id of ids) { try { await fetch(`/api/tables/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: newState }) }) } catch { } }
  }

  async function handleSeatRsvp() {
    if (!selectedRsvId || selectedIds.length === 0) return; setSubmitting(true)
    try {
      await fetch(`/api/reservations/${selectedRsvId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "SEATED", tableIds: selectedIds }) })
      await updateState(selectedIds, "SEATED"); toast({ title: "Guest seated" }); setActionModal(null); setSelectedRsvId(""); setSelectedIds([]); router.refresh()
    } catch { toast({ title: "Failed", variant: "destructive" }) } finally { setSubmitting(false) }
  }

  async function handleWalkIn() {
    if (!walkInName || selectedIds.length === 0) return; setSubmitting(true)
    try {
      const res = await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: walkInName.split(" ")[0] || walkInName, lastName: walkInName.split(" ").slice(1).join(" ") || "Walk-In", phone: walkInPhone || "0000000000", date: now.toISOString().split("T")[0], arrivalTime: `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`, partySize: parseInt(walkInSize), source: "walk_in" }) })
      if (res.ok) { const { data } = await res.json(); await fetch(`/api/reservations/${data.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "SEATED", tableIds: selectedIds }) }); await updateState(selectedIds, "SEATED"); toast({ title: `${walkInName} seated` }) }
      setActionModal(null); setWalkInName(""); setWalkInPhone(""); setWalkInSize("2"); setSelectedIds([]); router.refresh()
    } catch { toast({ title: "Failed", variant: "destructive" }) } finally { setSubmitting(false) }
  }

  function closeModal() { setActionModal(null); setSelectedIds([]) }
  const visibleTables = activeSection === "ALL" ? tables : tables.filter(t => t.section === activeSection)

  // SVG colours — respond to dark/light toggle
  const bg        = dark ? "#0E0C0A"                : "#F0EBE0"
  const wallFill  = dark ? "rgba(255,255,255,.03)"  : "rgba(0,0,0,.04)"
  const wallStroke= dark ? "rgba(255,255,255,.35)"  : "rgba(0,0,0,.35)"
  const innerWall = dark ? "rgba(255,255,255,.18)"  : "rgba(0,0,0,.18)"
  const kitchenFill=dark ? "rgba(110,110,110,.45)"  : "rgba(120,120,120,.35)"
  const tealFill  = dark ? "rgba(70,150,162,.28)"   : "rgba(70,150,162,.2)"
  const tealStroke= dark ? "rgba(70,150,162,.5)"    : "rgba(50,130,145,.7)"
  const salmonFill= dark ? "rgba(198,105,105,.26)"  : "rgba(198,105,105,.2)"
  const salmonStroke=dark? "rgba(198,105,105,.48)"  : "rgba(180,80,80,.6)"
  const greenDark = dark ? "rgba(45,90,35,.55)"     : "rgba(45,90,35,.45)"
  const greenLight= dark ? "rgba(95,175,105,.24)"   : "rgba(95,175,105,.2)"
  const adminFill = dark ? "rgba(58,56,52,.72)"     : "rgba(100,95,88,.25)"
  const adminStroke=dark ? "rgba(125,120,110,.42)"  : "rgba(100,95,88,.5)"
  const bathFill  = dark ? "rgba(8,8,8,.85)"        : "rgba(30,30,30,.8)"
  const bathStroke= dark ? "rgba(110,110,110,.48)"  : "rgba(80,80,80,.5)"
  const barFill   = dark ? "rgba(235,220,165,.16)"  : "rgba(200,185,120,.2)"
  const barStroke = dark ? "rgba(235,220,165,.52)"  : "rgba(180,160,80,.6)"
  const labelColor= dark ? "rgba(255,255,255,.25)"  : "rgba(0,0,0,.35)"

  return (
    <div className="flex flex-col h-full overflow-hidden bg-hive-bg text-foreground">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-hive-surface shrink-0 flex-wrap">
        <div className="flex items-center gap-1 rounded-lg p-1 bg-hive-surface2">
          {(["ALL","FINE_DINING","BAR","DEN","PATIO"] as const).map(s => (
            <button key={s} onClick={() => setActiveSection(s)}
              className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-all", activeSection === s ? "bg-hive-surface text-gold-400 shadow" : "text-muted-foreground hover:text-foreground")}>
              {s === "ALL" ? "All" : s === "FINE_DINING" ? "Fine Dining" : s === "DEN" ? "Den" : s}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1"><span className="font-semibold tabular-nums text-green-400">{stats.open}</span><span className="text-muted-foreground">open</span></span>
          <span className="flex items-center gap-1"><span className="font-semibold tabular-nums text-purple-400">{stats.seated}</span><span className="text-muted-foreground">seated</span></span>
          <span className="flex items-center gap-1"><span className="font-semibold tabular-nums text-amber-400">{stats.reserved}</span><span className="text-muted-foreground">rsvd</span></span>
          {stats.bussing > 0 && <span className="flex items-center gap-1"><span className="font-semibold tabular-nums text-red-400">{stats.bussing}</span><span className="text-muted-foreground">bussing</span></span>}
        </div>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 border-l border-border/40 pl-3 ml-1">
            <span className="text-xs text-muted-foreground">{selectedTables.map(t => t.displayId).join(", ")}</span>
            {!isReadOnly && (
              <>
                <button onClick={() => setActionModal("seat_rsvp")} className="flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium text-green-400 border-green-400/30 hover:bg-green-400/10 transition-colors"><UserCheck size={12} />Seat Rsvp</button>
                <button onClick={() => setActionModal("walk_in")} className="flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium text-blue-400 border-blue-400/30 hover:bg-blue-400/10 transition-colors"><Plus size={12} />Walk-In</button>
                {primaryTable?.state === "SEATED" && <button onClick={() => updateState(selectedIds, "DIRTY")} className="flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium text-amber-400 border-amber-400/30 hover:bg-amber-400/10 transition-colors"><Flag size={12} />Bussing</button>}
                {primaryTable?.state === "DIRTY" && <button onClick={() => updateState(selectedIds, "AVAILABLE")} className="flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium text-green-400 border-green-400/30 hover:bg-green-400/10 transition-colors"><Flag size={12} />Clean</button>}
              </>
            )}
            <button onClick={() => setSelectedIds([])} className="text-muted-foreground hover:text-foreground p-0.5 rounded"><X size={12} /></button>
          </div>
        )}
        <button onClick={() => router.refresh()} className="text-muted-foreground hover:text-foreground p-1.5 rounded-md"><RefreshCw size={13} /></button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-1 text-[10px] border-b border-border/40 bg-hive-surface/50 shrink-0">
        {Object.entries(STATE).map(([k, v]) => <span key={k} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: v.stroke, opacity: 0.85 }} /><span className="text-muted-foreground">{v.label}</span></span>)}
        <span className="ml-auto text-muted-foreground opacity-50">Click · Shift+click multi-select</span>
      </div>

      {/* SVG Floor Plan */}
      <div className="flex-1 overflow-auto">
        <svg viewBox="0 0 1320 580" width="100%" style={{ minWidth: 1300, background: bg, display: "block" }}>

          {/* ── Building shell fill ── */}
          <polygon points="168,48 1252,48 1252,352 710,352 710,560 153,560 168,48" fill={wallFill} stroke="none" />

          {/* ── SECTIONS ── */}
          {/* Fine Dining */}
          <polygon points="168,48 580,48 580,358 153,358 168,48" fill={tealFill} stroke={tealStroke} strokeWidth={1.5} />
          <text x="230" y="72" fontSize={11} fill={labelColor} fontFamily="Georgia,serif" letterSpacing={2}>FINE DINING</text>

          {/* Bar counter — enlarged, centred in Fine Dining */}
          {/* Fine Dining centre ~x:370. Bar at x:250-450, y:148-268 (200×120) */}
          <rect x="250" y="148" width="200" height="120" fill={barFill} stroke={barStroke} strokeWidth={1.5} rx="3" />
          <text x="350" y="214" textAnchor="middle" fontSize={10} fill="rgba(235,220,150,.78)" fontFamily="Georgia,serif" letterSpacing={2}>BAR</text>

          {/* Lounge/Den */}
          <polygon points="153,358 580,358 580,560 153,560 153,358" fill={salmonFill} stroke={salmonStroke} strokeWidth={1.5} />
          <text x="280" y="475" textAnchor="middle" fontSize={11} fill={labelColor} fontFamily="Georgia,serif" letterSpacing={2}>LOUNGE / DEN 🚬</text>

          {/* Kitchen */}
          <rect x="580" y="48" width="172" height="162" fill={kitchenFill} stroke="rgba(175,175,175,.42)" strokeWidth={1.5} />
          <text x="666" y="134" textAnchor="middle" fontSize={11} fill="rgba(210,210,210,.8)" fontFamily="Georgia,serif" letterSpacing={1.5}>KITCHEN</text>

          {/* Walkway blank gap (no label, no fill) */}
          <rect x="580" y="210" width="172" height="148" fill="rgba(255,255,255,.015)" stroke="none" />

          {/* Bathroom */}
          <rect x="640" y="248" width="112" height="110" fill={bathFill} stroke={bathStroke} strokeWidth={1.5} />
          <text x="696" y="308" textAnchor="middle" fontSize={9} fill="rgba(175,175,175,.8)" fontFamily="Georgia,serif" letterSpacing={1}>BATHROOM</text>

          {/* Admin Backroom — single unified box, NO inner dividing line */}
          <rect x="580" y="358" width="278" height="202" fill={adminFill} stroke={adminStroke} strokeWidth={2} />
          <text x="719" y="475" textAnchor="middle" fontSize={11} fill="rgba(188,183,172,.75)" fontFamily="Georgia,serif" letterSpacing={1.5}>ADMIN BACKROOM</text>

          {/* Patio dark entry strip */}
          <rect x="752" y="48" width="500" height="82" fill={greenDark} stroke="rgba(60,110,45,.58)" strokeWidth={1.5} />
          <text x="1002" y="94" textAnchor="middle" fontSize={11} fill="rgba(160,215,140,.78)" fontFamily="Georgia,serif" letterSpacing={2}>PATIO</text>

          {/* Patio main body */}
          <rect x="752" y="130" width="500" height="222" fill={greenLight} stroke="rgba(95,175,105,.46)" strokeWidth={1.5} />

          {/* ── BUILDING OUTER SHELL — drawn last so it's always on top ── */}
          <polygon points="168,48 1252,48 1252,352 710,352 710,720 153,720 168,48" fill="none" stroke={wallStroke} strokeWidth={2.5} />

          {/* ── INNER WALLS — only clean structural dividers, no overlapping lines ── */}
          {/* Fine Dining | Kitchen/Walkway vertical */}
          <line x1="580" y1="48" x2="580" y2="358" stroke={innerWall} strokeWidth={1.8} />
          {/* Lounge/Den | Admin horizontal extension */}
          <line x1="580" y1="358" x2="858" y2="358" stroke={innerWall} strokeWidth={1.8} />
          {/* Fine Dining | Lounge horizontal */}
          <line x1="153" y1="358" x2="580" y2="358" stroke={innerWall} strokeWidth={1.8} />
          {/* Kitchen | Patio vertical */}
          <line x1="752" y1="48" x2="752" y2="352" stroke={innerWall} strokeWidth={1.8} />
          {/* Patio dark | main horizontal */}
          <line x1="752" y1="130" x2="1252" y2="130" stroke="rgba(255,255,255,.14)" strokeWidth={1} />
          {/* Kitchen bottom */}
          <line x1="580" y1="210" x2="752" y2="210" stroke="rgba(255,255,255,.12)" strokeWidth={1} />
          {/* Step and admin walls drawn by building shell polygon */}

          {/* ── ENTRANCES ── */}
          <line x1="95" y1="268" x2="158" y2="268" stroke="rgba(255,255,255,.35)" strokeWidth={1.2} strokeDasharray="4,3" />
          <polygon points="158,263 172,268 158,273" fill="rgba(255,255,255,.5)" />
          <text x="56" y="264" fontSize={8} fill="rgba(255,255,255,.45)" textAnchor="middle" fontFamily="Georgia,serif">STREET</text>
          <text x="56" y="276" fontSize={8} fill="rgba(255,255,255,.45)" textAnchor="middle" fontFamily="Georgia,serif">ENTRANCE</text>
          <line x1="858" y1="542" x2="858" y2="574" stroke="rgba(255,255,255,.35)" strokeWidth={1.2} strokeDasharray="4,3" />
          <polygon points="853,556 858,572 863,556" fill="rgba(255,255,255,.5)" />
          <text x="922" y="552" fontSize={8} fill="rgba(255,255,255,.45)" textAnchor="middle" fontFamily="Georgia,serif">REAR ENTRANCE</text>
          <line x1="1100" y1="48" x2="1100" y2="12" stroke="rgba(255,255,255,.35)" strokeWidth={1.2} strokeDasharray="4,3" />
          <polygon points="1095,48 1100,34 1105,48" fill="rgba(255,255,255,.5)" />
          <text x="1172" y="16" fontSize={8} fill="rgba(255,255,255,.45)" textAnchor="middle" fontFamily="Georgia,serif">LOBBY ENTRY</text>
          <text x="1172" y="28" fontSize={8} fill="rgba(255,255,255,.45)" textAnchor="middle" fontFamily="Georgia,serif">(from Patio)</text>

          {/* ── TABLES ── */}
          {visibleTables.map(t => (
            <TableShape key={t.id} table={t} selected={selectedIds.includes(t.id)} onClick={onTableClick} />
          ))}
        </svg>
      </div>

      {/* Quick action modal */}
      <Dialog open={actionModal === "table_action"} onOpenChange={open => !open && closeModal()}>
        <DialogContent className="max-w-xs bg-hive-surface border-border">
          <DialogHeader><DialogTitle className="text-sm font-serif">{primaryTable?.label ?? primaryTable?.displayId} · {primaryTable?.capacity} seats</DialogTitle></DialogHeader>
          <p className="text-xs -mt-2 mb-2" style={{ color: STATE[primaryTable?.state ?? "AVAILABLE"].text }}>{primaryTable?.displayId} — {STATE[primaryTable?.state ?? "AVAILABLE"].label} · {primaryTable?.capacity} seats</p>
          <div className="flex flex-col gap-2">
            <button onClick={() => setActionModal("seat_rsvp")} className="flex items-center gap-2.5 w-full px-4 py-3 rounded-lg border text-sm text-left transition-colors hover:bg-amber-400/10 border-border"><UserCheck size={14} className="text-amber-400" />Seat Confirmed Guest</button>
            <button onClick={() => setActionModal("walk_in")} className="flex items-center gap-2.5 w-full px-4 py-3 rounded-lg border text-sm text-left transition-colors hover:bg-blue-400/10 border-border"><Plus size={14} className="text-blue-400" />Seat Walk-In</button>
            {primaryTable?.state === "SEATED" && <button onClick={() => { updateState(selectedIds, "DIRTY"); closeModal() }} className="flex items-center gap-2.5 w-full px-4 py-3 rounded-lg border text-sm text-left transition-colors hover:bg-amber-400/10 border-border"><Flag size={14} className="text-amber-500" />Flag for Bussing</button>}
            {primaryTable?.state === "DIRTY" && <button onClick={() => { updateState(selectedIds, "AVAILABLE"); closeModal() }} className="flex items-center gap-2.5 w-full px-4 py-3 rounded-lg border text-sm text-left transition-colors hover:bg-green-400/10 border-border"><Flag size={14} className="text-green-400" />Mark Clean</button>}
            <button onClick={closeModal} className="w-full px-4 py-3 rounded-lg border text-sm font-medium border-border text-muted-foreground hover:bg-white/5 transition-colors mt-1">Close</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Seat RSVP modal */}
      <Dialog open={actionModal === "seat_rsvp"} onOpenChange={open => !open && setActionModal(null)}>
        <DialogContent className="max-w-md bg-hive-surface border-border">
          <DialogHeader><DialogTitle className="font-serif">Seat Confirmed Guest</DialogTitle></DialogHeader>
          <p className="text-xs text-blue-400 bg-blue-400/10 rounded-lg px-3 py-2">Select a confirmed reservation arriving within 24 hours.</p>
          <div className="space-y-3 mt-1">
            <div><label className="text-xs text-muted-foreground block mb-1">Reservation</label>
              <Select value={selectedRsvId} onValueChange={setSelectedRsvId}><SelectTrigger className="bg-hive-surface2 border-border"><SelectValue placeholder="Select reservation..." /></SelectTrigger>
                <SelectContent>{eligible.map(r => <SelectItem key={r.id} value={r.id}>{r.firstName} {r.lastName} — {r.partySize}p @ {formatTime(r.arrivalTime)}</SelectItem>)}{eligible.length === 0 && <SelectItem value="_none" disabled>No upcoming reservations</SelectItem>}</SelectContent>
              </Select></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Assign Table(s)</label>
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                {tables.filter(t => t.state === "AVAILABLE" || selectedIds.includes(t.id)).map(t => { const sel = selectedIds.includes(t.id); return <button key={t.id} onClick={() => setSelectedIds(prev => sel ? prev.filter(x => x !== t.id) : [...prev, t.id])} className={cn("rounded-lg border px-1.5 py-2 text-xs text-center transition-all", sel ? "border-gold-400 bg-gold-400/10 text-gold-400" : "border-border text-muted-foreground hover:border-foreground/30")}><div className="font-semibold">{t.displayId}</div><div className="opacity-70">({t.capacity})</div></button> })}
              </div></div>
          </div>
          <div className="flex gap-2 mt-2"><Button variant="outline" onClick={() => setActionModal(null)} className="flex-1">Cancel</Button><Button onClick={handleSeatRsvp} disabled={submitting || !selectedRsvId || selectedIds.length === 0} className="flex-1 bg-gold-500 hover:bg-gold-600 text-black">{submitting ? "Seating…" : "Seat Guest"}</Button></div>
        </DialogContent>
      </Dialog>

      {/* Walk-in modal */}
      <Dialog open={actionModal === "walk_in"} onOpenChange={open => !open && setActionModal(null)}>
        <DialogContent className="max-w-sm bg-hive-surface border-border">
          <DialogHeader><DialogTitle className="font-serif">New Walk-In</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground block mb-1">Guest Name *</label><input value={walkInName} onChange={e => setWalkInName(e.target.value)} placeholder="First Last" className="w-full rounded-lg border border-border bg-hive-surface2 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold-400" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground block mb-1">Phone</label><input value={walkInPhone} onChange={e => setWalkInPhone(e.target.value)} placeholder="(555) 000-0000" className="w-full rounded-lg border border-border bg-hive-surface2 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold-400" /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Party Size *</label><input type="number" value={walkInSize} onChange={e => setWalkInSize(e.target.value)} min={1} max={20} className="w-full rounded-lg border border-border bg-hive-surface2 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold-400" /></div>
            </div>
            <div><label className="text-xs text-muted-foreground block mb-1">Tables *</label>
              <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto">
                {tables.filter(t => t.state === "AVAILABLE" || selectedIds.includes(t.id)).map(t => { const sel = selectedIds.includes(t.id); return <button key={t.id} onClick={() => setSelectedIds(prev => sel ? prev.filter(x => x !== t.id) : [...prev, t.id])} className={cn("rounded-lg border px-1 py-1.5 text-xs text-center transition-all", sel ? "border-gold-400 bg-gold-400/10 text-gold-400" : "border-border text-muted-foreground hover:border-foreground/30")}><div className="font-semibold text-[10px]">{t.displayId}</div><div className="opacity-70 text-[9px]">({t.capacity})</div></button> })}
              </div></div>
          </div>
          <div className="flex gap-2 mt-2"><Button variant="outline" onClick={() => setActionModal(null)} className="flex-1">Cancel</Button><Button onClick={handleWalkIn} disabled={submitting || !walkInName || selectedIds.length === 0} className="flex-1 bg-gold-500 hover:bg-gold-600 text-black">{submitting ? "Seating…" : "Seat Walk-In"}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
