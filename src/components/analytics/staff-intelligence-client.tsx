"use client"

import { useState, useMemo } from "react"
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { formatCurrency, cn } from "@/lib/utils"

type AnyRecord = Record<string, unknown>
interface Props { staff: AnyRecord[] }

export function StaffIntelligenceClient({ staff }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  // "applied" versions — only update when user clicks Show Results
  const [appliedStart, setAppliedStart] = useState("")
  const [appliedEnd, setAppliedEnd] = useState("")
  const filterActive = !!(appliedStart || appliedEnd)

  function applyFilter() {
    setAppliedStart(startDate)
    setAppliedEnd(endDate)
  }

  function clearFilter() {
    setStartDate(""); setEndDate("")
    setAppliedStart(""); setAppliedEnd("")
  }

  // Build per-staff metrics, optionally filtered to date range
  const staffData = useMemo(() => staff.map(s => {
    const allReservations = (s.reservations as AnyRecord[]) ?? []
    const allShifts = (s.shifts as AnyRecord[]) ?? []
    const allCallouts = (s.callouts as AnyRecord[]) ?? []

    // Filter by date range if applied
    const reservations = allReservations.filter(r => {
      if (!appliedStart && !appliedEnd) return true
      const d = (r.date as string ?? "").split("T")[0]
      if (appliedStart && d < appliedStart) return false
      if (appliedEnd && d > appliedEnd) return false
      return true
    })
    const shifts = allShifts.filter(sh => {
      if (!appliedStart && !appliedEnd) return true
      const d = (sh.date as string ?? "").split("T")[0]
      if (appliedStart && d < appliedStart) return false
      if (appliedEnd && d > appliedEnd) return false
      return true
    })
    const callouts = allCallouts.filter(co => {
      if (!appliedStart && !appliedEnd) return true
      const d = (co.date as string ?? "").split("T")[0]
      if (appliedStart && d < appliedStart) return false
      if (appliedEnd && d > appliedEnd) return false
      return true
    })

    const completed = reservations.filter(r => r.status === "COMPLETED")
    const cancelled  = reservations.filter(r => r.status === "CANCELLED")
    const revenue = completed.reduce((a, r) => a + Number(r.orderTotal ?? 0), 0)
    const tips    = completed.reduce((a, r) => a + Number(r.tipAmount  ?? 0), 0)
    const covers  = completed.reduce((a, r) => a + (r.partySize as number ?? 0), 0)

    const totalHours = shifts.reduce((a, sh) => {
      const [sh_, sm] = (sh.startTime as string).split(":").map(Number)
      const [eh, em]  = (sh.endTime   as string).split(":").map(Number)
      return a + Math.max(0, (eh * 60 + em - sh_ * 60 - sm) / 60)
    }, 0)

    const showRate = shifts.length > 0 ? Math.round(((shifts.length - callouts.length) / shifts.length) * 100) : 100
    const completionRate = reservations.length > 0 ? Math.round((completed.length / reservations.length) * 100) : 0
    const avgCheck = completed.length > 0 ? revenue / completed.length : 0
    const tipRate  = revenue > 0 ? Math.round((tips / revenue) * 100) : 0
    const coversPerShift = shifts.length > 0 ? Math.round(covers / shifts.length) : 0

    const score = Math.round(
      (showRate * 0.3) +
      (completionRate * 0.2) +
      (Math.min(avgCheck / 200 * 100, 100) * 0.2) +
      (Math.min(tipRate / 25 * 100, 100) * 0.15) +
      (Math.min(coversPerShift / 20 * 100, 100) * 0.15)
    )

    return {
      id: s.id as string, name: s.name as string, color: s.color as string,
      role: s.role as string, accessLevel: s.accessLevel as string,
      reservations: reservations.length, completed: completed.length,
      cancelled: cancelled.length, revenue, tips, covers,
      avgCheck, tipRate, showRate, completionRate, coversPerShift,
      shifts: shifts.length, callouts: callouts.length,
      totalHours: Math.round(totalHours), score,
      radarData: [
        { metric: "Show Rate",   value: showRate },
        { metric: "Completion",  value: completionRate },
        { metric: "Avg Check",   value: Math.min(Math.round(avgCheck / 200 * 100), 100) },
        { metric: "Tip Rate",    value: Math.min(Math.round(tipRate / 25 * 100), 100) },
        { metric: "Throughput",  value: Math.min(Math.round(coversPerShift / 20 * 100), 100) },
      ],
    }
  }).sort((a, b) => b.score - a.score), [staff, appliedStart, appliedEnd])

  const selected    = staffData.find(s => s.id === selectedId) ?? staffData[0]
  const revenueData = staffData.map(s => ({ name: s.name.split(" ")[0], revenue: s.revenue, tips: s.tips }))
  const pendingChange = startDate !== appliedStart || endDate !== appliedEnd

  function exportReport() {
    const rows = [
      ["Name","Role","Score","Reservations","Completed","Revenue","Tips","Avg Check","Covers","Shifts","Callouts","Show Rate","Completion Rate"],
      ...staffData.map(s => [
        s.name, s.role, s.score, s.reservations, s.completed,
        s.revenue.toFixed(2), s.tips.toFixed(2), s.avgCheck.toFixed(2),
        s.covers, s.shifts, s.callouts, `${s.showRate}%`, `${s.completionRate}%`
      ])
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n")
    const a = document.createElement("a")
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
    a.download = `hive-staff-intelligence-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-hive-surface shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl text-gold-500">Staff Intelligence</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Performance metrics · {filterActive ? `${appliedStart || "…"} → ${appliedEnd || "…"}` : "Last 90 days"} · Manager access only
            </p>
          </div>
          <button onClick={exportReport} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gold-500 border border-gold-500/30 rounded-lg hover:bg-gold-500/10 transition-colors shrink-0">
            ↓ Export Report
          </button>
        </div>

        {/* Date filter row */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-xs text-muted-foreground">Date range:</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="h-8 px-2 text-xs bg-hive-surface2 border border-border rounded-md text-foreground" />
          <span className="text-xs text-muted-foreground">to</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="h-8 px-2 text-xs bg-hive-surface2 border border-border rounded-md text-foreground" />

          <button
            onClick={applyFilter}
            disabled={!startDate && !endDate}
            className={cn(
              "h-8 px-3 text-xs rounded-md font-medium transition-colors border",
              pendingChange && (startDate || endDate)
                ? "bg-gold-500 text-black border-gold-500 hover:bg-gold-600"
                : "bg-hive-surface2 text-muted-foreground border-border hover:text-foreground"
            )}
          >
            Show Results
          </button>

          {filterActive && (
            <button onClick={clearFilter} className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md bg-hive-surface2 transition-colors">
              Clear
            </button>
          )}

          {filterActive && (
            <span className="text-[10px] text-green-400 opacity-80">✓ Filter active</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Score leaderboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffData.map((s, i) => (
            <button key={s.id} onClick={() => setSelectedId(s.id)}
              className={cn("bg-hive-surface border rounded-xl p-4 text-left transition-all hover:border-border",
                selectedId === s.id || (!selectedId && i === 0) ? "border-gold-500/50 ring-1 ring-gold-500/20" : "border-border"
              )}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {i < 3 && <span className="text-lg">{["🥇","🥈","🥉"][i]}</span>}
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  <div>
                    <div className="font-medium text-sm">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground">{s.role}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn("font-serif text-2xl font-medium", s.score >= 80 ? "text-green-400" : s.score >= 60 ? "text-gold-500" : "text-amber-400")}>
                    {s.score}
                  </div>
                  <div className="text-[10px] text-muted-foreground">/ 100</div>
                </div>
              </div>
              <div className="w-full bg-hive-surface2 rounded-full h-1.5 mb-3">
                <div className="h-full rounded-full transition-all" style={{ width: `${s.score}%`, background: s.color }} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Metric label="Revenue" value={formatCurrency(s.revenue)} />
                <Metric label="Show Rate" value={`${s.showRate}%`} />
                <Metric label="Avg Check" value={formatCurrency(s.avgCheck)} />
              </div>
            </button>
          ))}
        </div>

        {/* Detail view */}
        {selected && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-hive-surface border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full" style={{ background: selected.color }} />
                <h2 className="font-medium text-sm">{selected.name} — Performance Radar</h2>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={selected.radarData}>
                  <PolarGrid stroke="rgba(255,255,255,.08)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "#6B5E4A" }} />
                  <Radar name={selected.name} dataKey="value" stroke={selected.color}
                    fill={selected.color} fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-hive-surface border border-border rounded-xl p-5">
              <h2 className="font-medium text-sm mb-4">{selected.name} — Detailed Stats</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Reservations",    value: selected.reservations },
                  { label: "Completed",        value: selected.completed },
                  { label: "Cancelled",        value: selected.cancelled, warn: (selected.cancelled as number) > 3 },
                  { label: "Completion Rate",  value: `${selected.completionRate}%` },
                  { label: "Total Revenue",    value: formatCurrency(selected.revenue) },
                  { label: "Total Tips",       value: formatCurrency(selected.tips) },
                  { label: "Avg Check",        value: formatCurrency(selected.avgCheck) },
                  { label: "Tip Rate",         value: `${selected.tipRate}%` },
                  { label: "Total Covers",     value: selected.covers },
                  { label: "Covers / Shift",   value: selected.coversPerShift },
                  { label: "Shifts Worked",    value: selected.shifts },
                  { label: "Callouts",         value: selected.callouts, warn: (selected.callouts as number) >= 2 },
                  { label: "Hours Worked",     value: `${selected.totalHours}h` },
                  { label: "Show Rate",        value: `${selected.showRate}%`, warn: (selected.showRate as number) < 90 },
                ].map(({ label, value, warn }) => (
                  <div key={label} className="bg-hive-surface2 rounded-lg p-3">
                    <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
                    <div className={cn("text-sm font-medium", warn ? "text-amber-400" : "text-foreground")}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Revenue comparison */}
        <div className="bg-hive-surface border border-border rounded-xl p-5">
          <h2 className="font-medium text-sm mb-4">Revenue Comparison — All Staff</h2>
          {revenueData.some(d => d.revenue > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={revenueData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6B5E4A" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6B5E4A" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: "#1A1714", border: "1px solid rgba(201,169,110,.2)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenue" fill="#C9A96E" radius={[4,4,0,0]} barSize={28} />
                <Bar dataKey="tips"    name="Tips"    fill="#4CAF82" radius={[4,4,0,0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
              Revenue data appears once reservations are completed
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-xs font-medium">{value}</div>
    </div>
  )
}
