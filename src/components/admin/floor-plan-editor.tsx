"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Save, RefreshCw, ZoomIn, ZoomOut, Plus, Trash2, Copy, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

// ─── Types ────────────────────────────────────────────────────────────────────
interface EditorTable {
  id: string; displayId: string; label: string | null
  capacity: number; section: string; state: string
  svgX: number; svgY: number; svgW: number | null; svgH: number | null; svgShape: string | null
  _new?: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────
const VW = 1320; const VH = 580; const GRID = 5

const SECTION_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  FINE_DINING: { fill: "rgba(70,150,162,.22)",   stroke: "#4CAF82",   label: "Fine Dining" },
  BAR:         { fill: "rgba(235,220,165,.14)",  stroke: "#C9A96E",   label: "Bar" },
  DEN:         { fill: "rgba(198,105,105,.22)",  stroke: "#C47070",   label: "Den / Lounge" },
  PATIO:       { fill: "rgba(95,175,105,.22)",   stroke: "#5FA96A",   label: "Patio" },
}

// Shape catalogue — what staff see in the "Add Table" palette
const SHAPE_CATALOGUE = [
  { key: "stool",   label: "Bar Stool",     icon: "●",    defaults: { w: 18, h: 18, capacity: 1, section: "BAR"         } },
  { key: "round2",  label: "2-Seat Round",  icon: "⊙",    defaults: { w: 40, h: 40, capacity: 2, section: "FINE_DINING" } },
  { key: "round3",  label: "3-Seat Round",  icon: "⊙",    defaults: { w: 48, h: 48, capacity: 3, section: "FINE_DINING" } },
  { key: "round4",  label: "4-Seat Round",  icon: "⊙",    defaults: { w: 56, h: 56, capacity: 4, section: "FINE_DINING" } },
  { key: "booth",   label: "Booth",         icon: "▬",    defaults: { w: 60, h: 38, capacity: 4, section: "DEN"         } },
  { key: "bigbooth",label: "Big Booth",     icon: "▬▬",   defaults: { w: 96, h: 50, capacity: 6, section: "PATIO"       } },
]

// Canonical shape from catalogue key
function catalogueToShape(key: string): string {
  if (key === "stool") return "stool"
  if (key.startsWith("round")) return "round"
  return "booth"
}

function snap(v: number) { return Math.round(v / GRID) * GRID }
function getShape(t: EditorTable): string {
  if (t.svgShape) return t.svgShape
  if (t.section === "BAR") return "stool"
  if (t.section === "FINE_DINING") return "round"
  return "booth"
}
function getW(t: EditorTable) { return t.svgW ?? (getShape(t) === "stool" ? 18 : getShape(t) === "round" ? 42 : 56) }
function getH(t: EditorTable) { return t.svgH ?? (getShape(t) === "stool" ? 18 : getShape(t) === "round" ? 42 : 36) }

let newIdCounter = 1000

// ─── Main component ───────────────────────────────────────────────────────────
export function FloorPlanEditor() {
  const [tables, setTables]       = useState<EditorTable[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [dirty, setDirty]         = useState(false)
  const [selected, setSelected]   = useState<string | null>(null)
  const [zoom, setZoom]           = useState(1)
  const [showGrid, setShowGrid]   = useState(true)
  const [filterSection, setFilterSection] = useState<string | null>(null)
  const [addMode, setAddMode]     = useState<string | null>(null) // catalogue key when placing
  const [jsonOpen, setJsonOpen]   = useState(false)
  const [jsonCopied, setJsonCopied] = useState(false)

  const svgRef    = useRef<SVGSVGElement>(null)
  const dragRef   = useRef<{ id: string; ox: number; oy: number; sx: number; sy: number; moved: boolean } | null>(null)
  const resizeRef = useRef<{ id: string; edge: string; sx: number; sy: number; ow: number; oh: number; ox: number; oy: number } | null>(null)

  // ── Load ──
  async function loadTables() {
    setLoading(true)
    try {
      const res = await fetch("/api/tables/all")
      if (res.ok) { const { data } = await res.json(); setTables(data) }
    } catch { toast({ title: "Failed to load tables", variant: "destructive" }) }
    setLoading(false)
  }
  useEffect(() => { loadTables() }, [])

  // ── Save ──
  async function saveAll() {
    setSaving(true)
    let failed = 0
    const savedTables: EditorTable[] = []

    for (const t of tables) {
      try {
        const isNew = !!t._new || t.id.startsWith("_new_")
        const url    = isNew ? "/api/tables"       : `/api/tables/${t.id}`
        const method = isNew ? "POST"              : "PATCH"

        const payload = {
          displayId: t.displayId,
          label:     t.label ?? null,
          capacity:  Number(t.capacity),
          section:   t.section,
          svgX:      Number(t.svgX),
          svgY:      Number(t.svgY),
          svgW:      t.svgW != null ? Number(t.svgW) : null,
          svgH:      t.svgH != null ? Number(t.svgH) : null,
          svgShape:  t.svgShape ?? null,
        }

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (res.ok) {
          const { data } = await res.json()
          // Replace local temp ID with real DB id for new tables
          savedTables.push({ ...t, id: data.id, _new: undefined })
        } else {
          const err = await res.json().catch(() => ({ error: res.statusText }))
          console.error(`[saveAll] ${method} ${url} failed:`, err)
          failed++
          savedTables.push(t) // keep as-is
        }
      } catch (e) {
        console.error("[saveAll] network error:", e)
        failed++
        savedTables.push(t)
      }
    }

    // Update local state with real IDs — do NOT call loadTables() which would reset edits
    setTables(savedTables)
    setSaving(false)

    if (failed === 0) {
      setDirty(false)
      toast({ title: "Floor plan saved!", description: `${tables.length} tables updated` })
    } else {
      toast({
        title: `${tables.length - failed} saved, ${failed} failed`,
        description: "Check browser console for details",
        variant: "destructive",
      })
    }
  }

  // ── Sync Layout — removes orphan DB tables not in current editor ──
  async function syncLayout() {
    if (!confirm(
      "This will:\n\n" +
      "1. Save all " + tables.length + " tables in your current layout\n" +
      "2. Remove ALL other tables from the database (old seed tables, duplicates, etc.)\n\n" +
      "This cannot be undone. Continue?"
    )) return

    setSaving(true)

    // Step 1: load all tables currently in DB
    const dbRes = await fetch("/api/tables/all")
    if (!dbRes.ok) { setSaving(false); toast({ title: "Failed to load DB tables", variant: "destructive" }); return }
    const { data: dbTables } = await dbRes.json() as { data: { id: string }[] }

    // Step 2: collect IDs that are in the editor (real DB ids only, not _new_ ones)
    const editorIds = new Set(tables.filter(t => !t.id.startsWith("_new_")).map(t => t.id))

    // Step 3: deactivate DB tables that are NOT in the editor
    const toRemove = dbTables.filter((t: { id: string }) => !editorIds.has(t.id))
    let removed = 0
    for (const t of toRemove) {
      const res = await fetch(`/api/tables/${t.id}`, { method: "DELETE" })
      if (res.ok) removed++
    }

    // Step 4: save all editor tables (upsert)
    let saved = 0, failed = 0
    const savedTables: EditorTable[] = []
    for (const t of tables) {
      try {
        const isNew = t.id.startsWith("_new_")
        const url    = isNew ? "/api/tables"       : `/api/tables/${t.id}`
        const method = isNew ? "POST"              : "PATCH"
        const payload = {
          displayId: t.displayId, label: t.label ?? null,
          capacity: Number(t.capacity), section: t.section,
          svgX: Number(t.svgX), svgY: Number(t.svgY),
          svgW: t.svgW != null ? Number(t.svgW) : null,
          svgH: t.svgH != null ? Number(t.svgH) : null,
          svgShape: t.svgShape ?? null,
        }
        const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        if (res.ok) { const { data } = await res.json(); savedTables.push({ ...t, id: data.id, _new: undefined }); saved++ }
        else { savedTables.push(t); failed++ }
      } catch { savedTables.push(t); failed++ }
    }

    setTables(savedTables)
    setSaving(false)
    setDirty(false)

    toast({
      title: failed === 0
        ? `✓ Layout synced — ${saved} tables saved, ${removed} orphans removed`
        : `${saved} saved, ${failed} errors, ${removed} removed`,
      variant: failed > 0 ? "destructive" : "default",
      description: removed > 0 ? `Removed ${removed} stale tables from previous seeds` : undefined,
    })
  }

  // ── SVG coordinate helper ──
  function svgPt(e: React.MouseEvent) {
    const svg = svgRef.current; if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY
    const m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 }
    const r = pt.matrixTransform(m.inverse())
    return { x: r.x, y: r.y }
  }

  // ── Mouse handlers ──
  const onTableMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setSelected(id)
    if (addMode) return // don't drag while in add mode
    const pt = svgPt(e)
    const t = tables.find(x => x.id === id)!
    dragRef.current = { id, ox: t.svgX, oy: t.svgY, sx: pt.x, sy: pt.y, moved: false }
  }, [tables, addMode])

  const onResizeMouseDown = useCallback((e: React.MouseEvent, id: string, edge: string) => {
    e.stopPropagation()
    const pt = svgPt(e)
    const t = tables.find(x => x.id === id)!
    resizeRef.current = { id, edge, sx: pt.x, sy: pt.y, ow: getW(t), oh: getH(t), ox: t.svgX, oy: t.svgY }
  }, [tables])

  const onSVGMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragRef.current) {
      const pt = svgPt(e)
      const dx = pt.x - dragRef.current.sx, dy = pt.y - dragRef.current.sy
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current.moved = true
      const { id, ox, oy } = dragRef.current
      setTables(prev => prev.map(t => t.id !== id ? t : {
        ...t,
        svgX: snap(Math.max(0, Math.min(VW - getW(t), ox + dx))),
        svgY: snap(Math.max(0, Math.min(VH - getH(t), oy + dy))),
      }))
      setDirty(true)
    }
    if (resizeRef.current) {
      const pt = svgPt(e)
      const { id, edge, sx, sy, ow, oh, ox, oy } = resizeRef.current
      const dx = pt.x - sx, dy = pt.y - sy
      setTables(prev => prev.map(t => {
        if (t.id !== id) return t
        let w = ow, h = oh, x = ox, y = oy
        if (edge.includes("e")) w = snap(Math.max(10, ow + dx))
        if (edge.includes("s")) h = snap(Math.max(10, oh + dy))
        if (edge.includes("w")) { w = snap(Math.max(10, ow - dx)); x = snap(ox + dx) }
        if (edge.includes("n")) { h = snap(Math.max(10, oh - dy)); y = snap(oy + dy) }
        return { ...t, svgX: x, svgY: y, svgW: w, svgH: h }
      }))
      setDirty(true)
    }
  }, [])

  const onSVGMouseUp = useCallback(() => {
    dragRef.current = null; resizeRef.current = null
  }, [])

  // Click on background — deselect (only if not dragging, not in add mode)
  const onSVGClick = useCallback((e: React.MouseEvent) => {
    if (addMode) {
      // Place new table at click position
      const pt = svgPt(e)
      const cat = SHAPE_CATALOGUE.find(c => c.key === addMode)
      if (!cat) return
      const newTable: EditorTable = {
        id: `_new_${newIdCounter++}`,
        displayId: `NEW${newIdCounter}`,
        label: null,
        capacity: cat.defaults.capacity,
        section: cat.defaults.section,
        state: "AVAILABLE",
        svgX: snap(pt.x - cat.defaults.w / 2),
        svgY: snap(pt.y - cat.defaults.h / 2),
        svgW: cat.defaults.w,
        svgH: cat.defaults.h,
        svgShape: catalogueToShape(addMode),
        _new: true,
      }
      setTables(prev => [...prev, newTable])
      setSelected(newTable.id)
      setDirty(true)
      setAddMode(null) // exit add mode after placing one
      return
    }
    // Only deselect if clicking directly on background (target is svg or a background element)
    if ((e.target as Element).closest('.table-obj') === null) {
      setSelected(null)
    }
  }, [addMode])

  // ── Update selected prop ──
  const sel = tables.find(t => t.id === selected)
  function upd(key: keyof EditorTable, value: unknown) {
    if (!selected) return
    setTables(prev => prev.map(t => t.id === selected ? { ...t, [key]: value } : t))
    setDirty(true)
  }

  // ── Delete selected ──
  function deleteSelected() {
    if (!selected) return
    if (!confirm("Delete this table?")) return
    setTables(prev => prev.filter(t => t.id !== selected))
    setSelected(null); setDirty(true)
  }

  // ── Duplicate selected ──
  function duplicateSelected() {
    if (!sel) return
    const copy: EditorTable = { ...sel, id: `_new_${newIdCounter++}`, displayId: `${sel.displayId}x`, svgX: snap(sel.svgX + 20), svgY: snap(sel.svgY + 20), _new: true }
    setTables(prev => [...prev, copy])
    setSelected(copy.id); setDirty(true)
  }

  // ── JSON export ──
  const exportJSON = JSON.stringify({
    canvas: { w: VW, h: VH },
    building: { shell: "168,48 1252,48 1252,352 710,352 710,560 153,560 168,48" },
    tables: tables.map(t => ({
      id: t.id, displayId: t.displayId, label: t.label,
      capacity: t.capacity, section: t.section,
      shape: getShape(t),
      x: t.svgX, y: t.svgY, w: getW(t), h: getH(t),
    }))
  }, null, 2)

  const visibleTables = filterSection ? tables.filter(t => t.section === filterSection) : tables

  if (loading) return (
    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm gap-2">
      <RefreshCw className="animate-spin h-4 w-4" /> Loading floor plan…
    </div>
  )

  return (
    <div className="flex flex-col gap-3 select-none">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-medium text-sm">Live Floor Plan Editor</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Changes save directly to database and appear instantly on the Floor View
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-amber-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />Unsaved</span>}
          <button onClick={() => {
            if (dirty && !confirm("Reset will discard unsaved changes. Continue?")) return
            setSelected(null); setDirty(false); setAddMode(null); loadTables()
          }} className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground bg-hive-surface2 hover:bg-hive-surface3 transition-colors"><RefreshCw size={11} />Reset</button>
          <button onClick={saveAll} disabled={saving || !dirty}
            className={cn("flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors",
              dirty ? "bg-gold-500 hover:bg-gold-600 text-black" : "bg-hive-surface2 text-muted-foreground cursor-not-allowed")}>
            <Save size={11} />{saving ? "Saving…" : "Save to Database"}
          </button>
          <button onClick={syncLayout} disabled={saving}
            title="Remove all DB tables not in this layout, then save current layout"
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-500/30">
            <RefreshCw size={11} />{saving ? "…" : "Sync & Clean DB"}
          </button>
        </div>
      </div>

      {/* ── Add table palette ── */}
      <div className="flex items-center gap-2 flex-wrap p-3 bg-hive-surface border border-border rounded-xl">
        <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase mr-1">Add:</span>
        {SHAPE_CATALOGUE.map(cat => (
          <button key={cat.key} onClick={() => setAddMode(addMode === cat.key ? null : cat.key)}
            title={cat.label}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
              addMode === cat.key
                ? "bg-gold-500/20 border-gold-500 text-gold-400 ring-1 ring-gold-500/40"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-hive-surface2"
            )}>
            <ShapeIcon shape={catalogueToShape(cat.key)} size={14} />
            {cat.label}
          </button>
        ))}
        {addMode && (
          <span className="ml-auto text-xs text-gold-400 animate-pulse">
            ↖ Click on the floor plan to place
          </span>
        )}
        {!addMode && (
          <span className="ml-auto text-[10px] text-muted-foreground">Click a shape to enter placement mode</span>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-hive-surface2 rounded-lg p-1">
          {([null, "FINE_DINING", "BAR", "DEN", "PATIO"] as const).map(s => (
            <button key={s ?? "ALL"} onClick={() => setFilterSection(s as string | null)}
              className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                filterSection === s ? "bg-hive-surface text-gold-400 shadow" : "text-muted-foreground hover:text-foreground")}>
              {s === null ? "All" : SECTION_COLORS[s]?.label ?? s}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {sel && (
          <>
            <button onClick={duplicateSelected} className="flex items-center gap-1 px-2 py-1.5 text-xs rounded border border-border text-muted-foreground hover:text-foreground bg-hive-surface2"><Copy size={11} />Duplicate</button>
            <button onClick={deleteSelected} className="flex items-center gap-1 px-2 py-1.5 text-xs rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 bg-hive-surface2"><Trash2 size={11} />Delete</button>
          </>
        )}
        <div className="w-px h-4 bg-border" />
        <button onClick={() => setZoom(z => Math.min(2.5, +(z + 0.1).toFixed(1)))} className="p-1.5 rounded bg-hive-surface2 hover:bg-hive-surface3 text-muted-foreground hover:text-foreground"><ZoomIn size={13} /></button>
        <span className="text-xs text-muted-foreground w-9 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.max(0.4, +(z - 0.1).toFixed(1)))} className="p-1.5 rounded bg-hive-surface2 hover:bg-hive-surface3 text-muted-foreground hover:text-foreground"><ZoomOut size={13} /></button>
        <button onClick={() => setZoom(1)} className="px-2 py-1 rounded bg-hive-surface2 text-xs text-muted-foreground hover:text-foreground">100%</button>
        <button onClick={() => setShowGrid(g => !g)} className={cn("px-2 py-1 rounded text-xs transition-colors", showGrid ? "bg-hive-surface text-gold-400" : "bg-hive-surface2 text-muted-foreground hover:text-foreground")}>Grid</button>
      </div>

      {/* ── Main editor ── */}
      <div className="flex gap-3">

        {/* Canvas */}
        <div className="flex-1 border border-border rounded-xl overflow-auto bg-[#0E0C0A]"
          style={{ maxHeight: 540, cursor: addMode ? "crosshair" : "default" }}>
          <div style={{ width: VW * zoom, height: VH * zoom }}>
            <svg ref={svgRef} width={VW * zoom} height={VH * zoom} viewBox={`0 0 ${VW} ${VH}`}
              onMouseMove={onSVGMouseMove} onMouseUp={onSVGMouseUp} onMouseLeave={onSVGMouseUp}
              onClick={onSVGClick} style={{ display: "block" }}>

              {/* Grid */}
              {showGrid && <g opacity={0.04}>
                {Array.from({ length: VW / GRID }, (_, i) => <line key={`v${i}`} x1={i*GRID} y1={0} x2={i*GRID} y2={VH} stroke="white" strokeWidth={0.4} />)}
                {Array.from({ length: VH / GRID }, (_, i) => <line key={`h${i}`} x1={0} y1={i*GRID} x2={VW} y2={i*GRID} stroke="white" strokeWidth={0.4} />)}
              </g>}

              {/* Building shell */}
              <polygon points="168,48 1252,48 1252,352 710,352 710,560 153,560 168,48" fill="rgba(255,255,255,.02)" stroke="rgba(255,255,255,.35)" strokeWidth={2.5} />

              {/* Section fills */}
              <polygon points="168,48 580,48 580,358 153,358 168,48" fill="rgba(70,150,162,.13)" stroke="rgba(70,150,162,.25)" strokeWidth={1} />
              <polygon points="153,358 580,358 580,560 153,560" fill="rgba(198,105,105,.13)" stroke="rgba(198,105,105,.25)" strokeWidth={1} />
              <rect x={580} y={48} width={172} height={162} fill="rgba(100,100,100,.32)" stroke="rgba(175,175,175,.25)" strokeWidth={1} />
              <rect x={640} y={248} width={112} height={110} fill="rgba(5,5,5,.8)" stroke="rgba(100,100,100,.35)" strokeWidth={1} />
              <rect x={580} y={358} width={278} height={202} fill="rgba(50,48,45,.7)" stroke="rgba(120,115,105,.25)" strokeWidth={1} />
              <rect x={752} y={48} width={500} height={82} fill="rgba(40,85,30,.45)" stroke="rgba(55,105,40,.3)" strokeWidth={1} />
              <rect x={752} y={130} width={500} height={222} fill="rgba(75,150,90,.13)" stroke="rgba(75,150,90,.25)" strokeWidth={1} />
              <rect x={250} y={148} width={200} height={120} fill="rgba(235,220,165,.08)" stroke="rgba(235,220,165,.35)" strokeWidth={1.5} rx={2} />

              {/* Zone labels */}
              {[
                {x:240, y:72,  t:"FINE DINING"},   {x:300, y:475, t:"LOUNGE / DEN 🚬"},
                {x:666, y:130, t:"KITCHEN"},        {x:696, y:304, t:"BATH"},
                {x:719, y:440, t:"ADMIN"},          {x:1002,y:88,  t:"PATIO"},
                {x:330, y:207, t:"BAR"},
              ].map(l => <text key={l.t} x={l.x} y={l.y} fontSize={9.5} fill="rgba(255,255,255,.18)" fontFamily="Georgia,serif" letterSpacing={1.5} textAnchor="middle" style={{pointerEvents:"none"}}>{l.t}</text>)}

              {/* Inner walls */}
              {/* Inner walls — interior dividers only */}
              {([
                [580,48,580,358],[153,358,580,358],[580,358,858,358],
                [752,48,752,352],[752,130,1252,130],
              ] as number[][]).map(([x1,y1,x2,y2],i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,.16)" strokeWidth={1.5} />)}

              {/* Entrances */}
              <polygon points="158,263 172,268 158,273" fill="rgba(255,255,255,.4)" />
              <text x={58} y={270} fontSize={7} fill="rgba(255,255,255,.32)" textAnchor="middle" fontFamily="Georgia,serif" style={{pointerEvents:"none"}}>STREET</text>
              <polygon points="853,556 858,572 863,556" fill="rgba(255,255,255,.4)" />
              <text x={858} y={578} fontSize={7} fill="rgba(255,255,255,.32)" textAnchor="middle" fontFamily="Georgia,serif" style={{pointerEvents:"none"}}>REAR ENT.</text>
              <polygon points="1095,48 1100,34 1105,48" fill="rgba(255,255,255,.4)" />
              <text x={1100} y={24} fontSize={7} fill="rgba(255,255,255,.32)" textAnchor="middle" fontFamily="Georgia,serif" style={{pointerEvents:"none"}}>LOBBY</text>

              {/* Tables */}
              {visibleTables.map(t => {
                const w = getW(t), h = getH(t)
                const isSel = t.id === selected
                const shape = getShape(t)
                const sc = SECTION_COLORS[t.section] ?? SECTION_COLORS.FINE_DINING
                const cx = t.svgX + w/2, cy = t.svgY + h/2

                return (
                  <g key={t.id} className="table-obj"
                    onMouseDown={e => onTableMouseDown(e, t.id)}
                    onClick={e => { e.stopPropagation(); setSelected(t.id) }}
                    style={{ cursor: addMode ? "crosshair" : "move" }}>

                    {/* Selection ring */}
                    {isSel && <rect x={t.svgX-5} y={t.svgY-5} width={w+10} height={h+10}
                      rx={shape==="stool"||shape==="round" ? 999 : 7}
                      fill="rgba(201,169,110,.1)" stroke="#C9A96E" strokeWidth={2} strokeDasharray="5,3" />}

                    {/* ── Shape rendering ── */}
                    {shape === "stool" && (
                      <>
                        {/* Stool: filled circle */}
                        <circle cx={cx} cy={cy} r={w/2} fill="rgba(180,140,60,.45)" stroke={isSel?"#C9A96E":sc.stroke} strokeWidth={isSel?2:1.2} />
                        <text x={cx} y={cy+3} textAnchor="middle" fontSize={6} fill="#C9A96E" fontWeight={700} style={{pointerEvents:"none"}}>{t.displayId.replace("B","")}</text>
                      </>
                    )}
                    {shape === "round" && (
                      <>
                        {/* Round: circle with seat dots around it */}
                        {(() => {
                          const r2 = w/2
                          const seatAngles = t.capacity===2?[210,330]:t.capacity===3?[90,210,330]:[45,135,225,315]
                          const orbit = r2 + 7
                          return <>
                            {seatAngles.map((deg,i)=>{
                              const rad=deg*Math.PI/180
                              return <circle key={i} cx={cx+Math.cos(rad)*orbit} cy={cy+Math.sin(rad)*orbit} r={5} fill={sc.fill} stroke={isSel?"#C9A96E":sc.stroke} strokeWidth={0.8} />
                            })}
                            <circle cx={cx} cy={cy} r={r2} fill={sc.fill} stroke={isSel?"#C9A96E":sc.stroke} strokeWidth={isSel?2:1.5} />
                            <text x={cx} y={cy-2} textAnchor="middle" fontSize={7.5} fill={sc.stroke} fontWeight={700} style={{pointerEvents:"none"}}>{t.displayId}</text>
                            <text x={cx} y={cy+7} textAnchor="middle" fontSize={6} fill={sc.stroke} opacity={0.75} style={{pointerEvents:"none"}}>{t.capacity}s</text>
                          </>
                        })()}
                      </>
                    )}
                    {shape === "booth" && (
                      <>
                        {/* Booth: rect with bench lines top/bottom */}
                        <rect x={t.svgX} y={t.svgY} width={w} height={h} rx={3} fill={sc.fill} stroke={isSel?"#C9A96E":sc.stroke} strokeWidth={isSel?2:1.5} />
                        {/* Bench back top */}
                        <rect x={t.svgX} y={t.svgY} width={w} height={7} rx={2} fill="rgba(160,130,80,.25)" stroke={isSel?"#C9A96E":sc.stroke} strokeWidth={0.8} />
                        {/* Bench back bottom */}
                        <rect x={t.svgX} y={t.svgY+h-7} width={w} height={7} rx={2} fill="rgba(160,130,80,.25)" stroke={isSel?"#C9A96E":sc.stroke} strokeWidth={0.8} />
                        {/* Seat dots */}
                        {Array.from({length:Math.ceil(t.capacity/2)},(_,i)=>{
                          const gap=(w-12)/(Math.max(Math.ceil(t.capacity/2)-1,1))
                          return <circle key={`t${i}`} cx={t.svgX+6+i*gap} cy={t.svgY+3.5} r={2.5} fill={sc.stroke} opacity={0.6} />
                        })}
                        {Array.from({length:Math.floor(t.capacity/2)},(_,i)=>{
                          const gap=(w-12)/(Math.max(Math.floor(t.capacity/2)-1,1))
                          return <circle key={`b${i}`} cx={t.svgX+6+i*gap} cy={t.svgY+h-3.5} r={2.5} fill={sc.stroke} opacity={0.6} />
                        })}
                        <text x={cx} y={cy-2} textAnchor="middle" fontSize={7.5} fill={sc.stroke} fontWeight={700} style={{pointerEvents:"none"}}>{t.label??t.displayId}</text>
                        <text x={cx} y={cy+7} textAnchor="middle" fontSize={6} fill={sc.stroke} opacity={0.75} style={{pointerEvents:"none"}}>{t.capacity}s</text>
                      </>
                    )}

                    {/* Resize handles — E S W N SE corners when selected */}
                    {isSel && !addMode && shape !== "stool" && (
                      <>
                        {[
                          {edge:"e",  hx:t.svgX+w,    hy:cy},
                          {edge:"s",  hx:cx,           hy:t.svgY+h},
                          {edge:"w",  hx:t.svgX,       hy:cy},
                          {edge:"n",  hx:cx,           hy:t.svgY},
                          {edge:"se", hx:t.svgX+w,     hy:t.svgY+h},
                        ].map(({edge,hx,hy})=>(
                          <rect key={edge} x={hx-5} y={hy-5} width={10} height={10} rx={2}
                            fill="#C9A96E" stroke="#0E0C0A" strokeWidth={1.2}
                            style={{cursor: edge==="se"?"se-resize":edge==="e"?"ew-resize":edge==="w"?"ew-resize":edge==="s"?"ns-resize":"ns-resize"}}
                            onMouseDown={e=>{e.stopPropagation();onResizeMouseDown(e,t.id,edge)}} />
                        ))}
                      </>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        {/* ── Properties panel ── */}
        <div className="w-56 shrink-0 flex flex-col gap-3">

          {sel ? (
            <>
              {/* Selected table props */}
              <div className="bg-hive-surface border border-gold-500/30 rounded-xl p-4">
                <div className="text-xs text-gold-400 font-semibold mb-3 flex items-center justify-between">
                  <span>{sel.displayId}</span>
                  <span className="text-[10px] font-normal text-muted-foreground">{sel._new ? "NEW" : "saved"}</span>
                </div>
                <div className="space-y-2">
                  <PRow label="ID">
                    <input value={sel.displayId} onChange={e=>upd("displayId",e.target.value)}
                      className="field" />
                  </PRow>
                  <PRow label="Label">
                    <input value={sel.label??""} placeholder="optional" onChange={e=>upd("label",e.target.value||null)}
                      className="field" />
                  </PRow>
                  <PRow label="Seats">
                    <div className="flex items-center gap-1">
                      <button onClick={()=>upd("capacity",Math.max(1,(sel.capacity??1)-1))} className="w-6 h-6 rounded bg-hive-surface3 hover:bg-border text-xs flex items-center justify-center">−</button>
                      <input type="number" value={sel.capacity} min={1} max={20}
                        onChange={e=>upd("capacity",Math.max(1,+e.target.value))}
                        className="field w-10 text-center" />
                      <button onClick={()=>upd("capacity",Math.min(20,(sel.capacity??1)+1))} className="w-6 h-6 rounded bg-hive-surface3 hover:bg-border text-xs flex items-center justify-center">+</button>
                    </div>
                  </PRow>
                  <PRow label="Shape">
                    <select value={getShape(sel)} onChange={e=>upd("svgShape",e.target.value)} className="field">
                      <option value="stool">Bar Stool ●</option>
                      <option value="round">Round ⊙</option>
                      <option value="booth">Booth ▬</option>
                    </select>
                  </PRow>
                  <PRow label="Section">
                    <select value={sel.section} onChange={e=>upd("section",e.target.value)} className="field">
                      <option value="FINE_DINING">Fine Dining</option>
                      <option value="BAR">Bar</option>
                      <option value="DEN">Den</option>
                      <option value="PATIO">Patio</option>
                    </select>
                  </PRow>
                  <div className="border-t border-border/50 pt-2 mt-1 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <PRow label="X">
                        <input type="number" value={sel.svgX} step={5}
                          onChange={e=>upd("svgX",snap(+e.target.value))} className="field" />
                      </PRow>
                      <PRow label="Y">
                        <input type="number" value={sel.svgY} step={5}
                          onChange={e=>upd("svgY",snap(+e.target.value))} className="field" />
                      </PRow>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <PRow label="W">
                        <input type="number" value={getW(sel)} step={5} min={10} max={300}
                          onChange={e=>upd("svgW",snap(+e.target.value))} className="field" />
                      </PRow>
                      <PRow label="H">
                        <input type="number" value={getH(sel)} step={5} min={10} max={300}
                          onChange={e=>upd("svgH",snap(+e.target.value))} className="field" />
                      </PRow>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nudge */}
              <div className="bg-hive-surface border border-border rounded-xl p-3">
                <div className="text-[10px] text-muted-foreground mb-2">Nudge 5px</div>
                <div className="grid grid-cols-3 gap-1 w-24 mx-auto">
                  <div/>
                  <NudgeBtn onClick={()=>upd("svgY",snap(sel.svgY-5))}>↑</NudgeBtn>
                  <div/>
                  <NudgeBtn onClick={()=>upd("svgX",snap(sel.svgX-5))}>←</NudgeBtn>
                  <div className="bg-hive-surface2 rounded flex items-center justify-center text-muted-foreground text-[10px]">·</div>
                  <NudgeBtn onClick={()=>upd("svgX",snap(sel.svgX+5))}>→</NudgeBtn>
                  <div/>
                  <NudgeBtn onClick={()=>upd("svgY",snap(sel.svgY+5))}>↓</NudgeBtn>
                  <div/>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-hive-surface border border-border rounded-xl p-4 text-center">
              <div className="text-2xl mb-2 opacity-40">↖</div>
              <p className="text-xs text-muted-foreground">Click a table on the floor plan to select and edit it</p>
            </div>
          )}

          {/* Shape legend */}
          <div className="bg-hive-surface border border-border rounded-xl p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Shape Guide</div>
            <div className="space-y-1.5">
              {[
                {shape:"stool", label:"Bar Stool",     hint:"Single seat at bar"},
                {shape:"round", label:"Round Table",   hint:"2/3/4-seat freestanding"},
                {shape:"booth", label:"Booth",         hint:"Fixed bench seating"},
              ].map(({shape,label,hint})=>(
                <div key={shape} className="flex items-center gap-2">
                  <div className="w-7 h-7 flex items-center justify-center shrink-0">
                    <ShapeIcon shape={shape} size={18} />
                  </div>
                  <div>
                    <div className="text-[10px] text-foreground font-medium">{label}</div>
                    <div className="text-[9px] text-muted-foreground">{hint}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Table counts */}
          <div className="bg-hive-surface border border-border rounded-xl p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Counts</div>
            {["FINE_DINING","BAR","DEN","PATIO"].map(s => {
              const st = tables.filter(t=>t.section===s)
              const seats = st.reduce((a,t)=>a+t.capacity,0)
              return (
                <div key={s} className="flex justify-between text-[10px] py-0.5">
                  <span className="text-muted-foreground">{SECTION_COLORS[s]?.label ?? s}</span>
                  <span className="text-foreground tabular-nums">{st.length} · {seats}s</span>
                </div>
              )
            })}
            <div className="border-t border-border/50 mt-1.5 pt-1.5 flex justify-between text-[10px]">
              <span className="text-muted-foreground font-medium">Total</span>
              <span className="text-foreground font-medium tabular-nums">{tables.length} · {tables.reduce((a,t)=>a+t.capacity,0)}s</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── JSON Export panel ── */}
      <div className="bg-hive-surface border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setJsonOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          <span className="flex items-center gap-2">
            <Info size={12} />
            Layout JSON Export
            <span className="text-[10px] font-normal opacity-60">— paste back to Claude for diagnostics or backup</span>
          </span>
          <span>{jsonOpen ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {jsonOpen && (
          <div className="border-t border-border px-4 pb-4">
            <div className="flex items-center justify-between mb-2 pt-3">
              <span className="text-[10px] text-muted-foreground">{tables.length} tables · auto-updates as you edit</span>
              <button
                onClick={() => { navigator.clipboard.writeText(exportJSON); setJsonCopied(true); setTimeout(()=>setJsonCopied(false), 2000) }}
                className={cn("flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors",
                  jsonCopied ? "bg-green-500/20 border-green-500/50 text-green-400" : "border-border text-muted-foreground hover:text-foreground bg-hive-surface2")}>
                {jsonCopied ? "✓ Copied!" : "Copy JSON"}
              </button>
            </div>
            <pre className="text-[10px] text-muted-foreground bg-hive-surface2 rounded-lg p-3 overflow-auto max-h-64 font-mono leading-relaxed border border-border/50">
              {exportJSON}
            </pre>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
        <Info size={10} className="shrink-0" />
        Drag to move · Orange handles to resize · Palette to add new tables · Step size: 5px · Hit Save to push to database &amp; Floor View
      </div>
    </div>
  )
}

// ── Small helpers ──────────────────────────────────────────────────────────────
function ShapeIcon({ shape, size = 16 }: { shape: string; size?: number }) {
  if (shape === "stool") return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <circle cx={8} cy={8} r={6} fill="rgba(180,140,60,.5)" stroke="#C9A96E" strokeWidth={1.5} />
    </svg>
  )
  if (shape === "round") return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <circle cx={8} cy={8} r={5} fill="rgba(76,175,130,.2)" stroke="#4CAF82" strokeWidth={1.5} />
      <circle cx={8} cy={2} r={2} fill="rgba(76,175,130,.4)" stroke="#4CAF82" strokeWidth={0.8} />
      <circle cx={14} cy={11} r={2} fill="rgba(76,175,130,.4)" stroke="#4CAF82" strokeWidth={0.8} />
      <circle cx={2} cy={11} r={2} fill="rgba(76,175,130,.4)" stroke="#4CAF82" strokeWidth={0.8} />
    </svg>
  )
  // booth
  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <rect x={1} y={3} width={14} height={10} rx={2} fill="rgba(76,175,130,.2)" stroke="#4CAF82" strokeWidth={1.5} />
      <rect x={1} y={3} width={14} height={3} rx={1.5} fill="rgba(160,130,80,.4)" stroke="#4CAF82" strokeWidth={0.5} />
      <rect x={1} y={10} width={14} height={3} rx={1.5} fill="rgba(160,130,80,.4)" stroke="#4CAF82" strokeWidth={0.5} />
    </svg>
  )
}

function PRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-9 shrink-0">{label}</span>
      <div className="flex-1 [&_.field]:w-full [&_.field]:bg-hive-surface2 [&_.field]:border [&_.field]:border-border [&_.field]:rounded [&_.field]:px-2 [&_.field]:py-1 [&_.field]:text-xs [&_.field]:text-foreground [&_.field]:focus:outline-none [&_.field]:focus:ring-1 [&_.field]:focus:ring-gold-400">
        {children}
      </div>
    </div>
  )
}

function NudgeBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="bg-hive-surface2 hover:bg-hive-surface3 rounded p-1 text-xs text-center text-foreground transition-colors">
      {children}
    </button>
  )
}
