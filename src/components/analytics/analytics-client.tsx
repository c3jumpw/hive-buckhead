"use client"

import { useMemo, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell } from "recharts"
import { formatCurrency, cn } from "@/lib/utils"

type AnyRecord = Record<string, unknown>

interface Props {
  stats: { totalRsvp: number; completedRsvp: number; cancelledRsvp: number }
  allReservations: AnyRecord[]
  staffPerf: AnyRecord[]
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const CHART_COLORS = ["#C9A96E","#5B96C8","#9B7EC8","#4CAF82","#D4A020","#C4524A"]

const TooltipBox = ({ active, payload, label, prefix = "" }: { active?: boolean; payload?: { value: number; name?: string }[]; label?: string; prefix?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-hive-surface border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-gold-500 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-foreground">{p.name && <span className="text-muted-foreground mr-1">{p.name}:</span>}{prefix}{typeof p.value === "number" && prefix === "$" ? formatCurrency(p.value).replace("$","") : p.value}</p>
      ))}
    </div>
  )
}

export function AnalyticsClient({ stats, allReservations, staffPerf }: Props) {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [appliedStart, setAppliedStart] = useState("")
  const [appliedEnd, setAppliedEnd] = useState("")
  const filterActive = !!(appliedStart || appliedEnd)
  const pendingChange = startDate !== appliedStart || endDate !== appliedEnd

  function applyFilter() { setAppliedStart(startDate); setAppliedEnd(endDate) }
  function clearFilter() { setStartDate(""); setEndDate(""); setAppliedStart(""); setAppliedEnd("") }

  // Filter reservations by applied date range
  const filteredReservations = useMemo(() => {
    if (!appliedStart && !appliedEnd) return allReservations
    return allReservations.filter(r => {
      const d = (r.date as string ?? "").split("T")[0]
      if (appliedStart && d < appliedStart) return false
      if (appliedEnd && d > appliedEnd) return false
      return true
    })
  }, [allReservations, appliedStart, appliedEnd])

  const completionRate = stats.totalRsvp > 0 ? Math.round((stats.completedRsvp / stats.totalRsvp) * 100) : 0
  const cancellationRate = stats.totalRsvp > 0 ? Math.round((stats.cancelledRsvp / stats.totalRsvp) * 100) : 0

  // ── Monthly revenue ───────────────────────────────────────────────────
  const monthlyRevenue = useMemo(() => {
    const map: Record<string, { revenue: number; covers: number; count: number }> = {}
    filteredReservations.filter(r => r.status === "COMPLETED" && r.orderTotal).forEach(r => {
      const d = new Date(r.completedAt as string ?? r.date as string)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!map[key]) map[key] = { revenue: 0, covers: 0, count: 0 }
      map[key].revenue += Number(r.orderTotal ?? 0)
      map[key].covers  += r.partySize as number ?? 0
      map[key].count   += 1
    })
    return Object.entries(map).sort(([a],[b]) => a.localeCompare(b)).slice(-6)
      .map(([key, val]) => { const [,m] = key.split("-").map(Number); return { month: MONTHS[m], ...val } })
  }, [allReservations])

  const totalRevenue = filteredReservations.filter(r => r.status === "COMPLETED").reduce((a, r) => a + Number(r.orderTotal ?? 0), 0)

  // ── Hourly distribution ───────────────────────────────────────────────
  const hourlyDist = useMemo(() => {
    const map: Record<string, number> = {}
    filteredReservations.forEach(r => {
      const h = parseInt((r.arrivalTime as string)?.split(":")[0] ?? "19")
      const label = h === 12 ? "12p" : h < 12 ? `${h}a` : `${h-12 === 0 ? 12 : h-12}p`
      map[label] = (map[label] ?? 0) + 1
    })
    return Object.entries(map).sort(([a],[b]) => {
      const toNum = (s: string) => { const n = parseInt(s); return s.endsWith("p") && n !== 12 ? n + 12 : n }
      return toNum(a) - toNum(b)
    }).map(([hour, count]) => ({ hour, count }))
  }, [filteredReservations])

  // ── Day of week ───────────────────────────────────────────────────────
  const dayDist = useMemo(() => {
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
    const map: Record<string, number> = {}
    days.forEach(d => { map[d] = 0 })
    filteredReservations.forEach(r => {
      const d = new Date(r.date as string)
      map[days[d.getDay()]]++
    })
    return days.map(day => ({ day, count: map[day] }))
  }, [filteredReservations])

  // ── Party size ────────────────────────────────────────────────────────
  const partySizeDist = useMemo(() => {
    const map: Record<string, number> = {}
    filteredReservations.forEach(r => {
      const sz = r.partySize as number
      const label = sz >= 8 ? "Party 8+" : `Party ${sz}`
      map[label] = (map[label] ?? 0) + 1
    })
    return Object.entries(map).sort(([a],[b]) => {
      const n = (s: string) => parseInt(s.replace("Party ","").replace("+",""))
      return n(a) - n(b)
    }).map(([size, count]) => ({ size, count }))
  }, [filteredReservations])

  // ── Lead time (how far in advance booked) ─────────────────────────────
  const leadTimeDist = useMemo(() => {
    const buckets: Record<string, number> = { "Same day": 0, "1 day": 0, "2–3 days": 0, "4–7 days": 0, "1–2 wks": 0, "2–4 wks": 0, "1+ mo": 0 }
    filteredReservations.forEach(r => {
      const created = new Date(r.createdAt as string)
      const rsvDate = new Date(r.date as string)
      const days = Math.round((rsvDate.getTime() - created.getTime()) / 86400000)
      if (days <= 0) buckets["Same day"]++
      else if (days === 1) buckets["1 day"]++
      else if (days <= 3) buckets["2–3 days"]++
      else if (days <= 7) buckets["4–7 days"]++
      else if (days <= 14) buckets["1–2 wks"]++
      else if (days <= 28) buckets["2–4 wks"]++
      else buckets["1+ mo"]++
    })
    return Object.entries(buckets).map(([label, count]) => ({ label, count }))
  }, [filteredReservations])

  // ── Weekly volume (last 8 weeks) ──────────────────────────────────────
  const weeklyVol = useMemo(() => {
    const weeks: Record<string, number> = {}
    filteredReservations.forEach(r => {
      const d = new Date(r.date as string)
      const weekStart = new Date(d); weekStart.setDate(d.getDate() - d.getDay())
      const key = weekStart.toISOString().split("T")[0]
      weeks[key] = (weeks[key] ?? 0) + 1
    })
    return Object.entries(weeks).sort(([a],[b]) => a.localeCompare(b)).slice(-8)
      .map(([date, count], i) => ({ week: `Wk ${i+1}`, count, date }))
  }, [filteredReservations])

  // ── Section breakdown ─────────────────────────────────────────────────
  const sectionDist = useMemo(() => {
    const labels: Record<string, string> = { FINE_DINING: "Fine Dining", BAR: "Bar", DEN: "Den", PATIO: "Patio", "null": "No Pref" }
    const map: Record<string, number> = {}
    filteredReservations.forEach(r => { const s = String(r.section ?? "null"); map[s] = (map[s] ?? 0) + 1 })
    return Object.entries(map).map(([k, v]) => ({ name: labels[k] ?? k, value: v }))
  }, [filteredReservations])

  // ── Staff data ────────────────────────────────────────────────────────
  const staffData = staffPerf.map(s => {
    const completed = (s.reservations as AnyRecord[]) ?? []
    const revenue = completed.reduce((a, r) => a + Number(r.orderTotal ?? 0), 0)
    const tips    = completed.reduce((a, r) => a + Number(r.tipAmount ?? 0), 0)
    const covers  = completed.reduce((a, r) => a + (r.partySize as number ?? 0), 0)
    return {
      id: s.id, name: s.name, color: s.color, role: s.role,
      totalRsvp: (s._count as AnyRecord)?.reservations ?? 0,
      shifts:    (s._count as AnyRecord)?.shifts ?? 0,
      callouts:  (s._count as AnyRecord)?.callouts ?? 0,
      completed: completed.length, revenue, tips, covers,
      avgCheck: completed.length > 0 ? revenue / completed.length : 0,
      avgCoversPerShift: (s._count as AnyRecord)?.shifts > 0 ? covers / ((s._count as AnyRecord)?.shifts as number) : 0,
    }
  }).sort((a, b) => (b.revenue as number) - (a.revenue as number))

  const maxCount = Math.max(...hourlyDist.map(h => h.count), 1)
  const maxDayCount = Math.max(...dayDist.map(d => d.count), 1)
  const maxLeadCount = Math.max(...leadTimeDist.map(l => l.count), 1)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-hive-surface shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl text-gold-500">Analytics</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Revenue, booking patterns · {filterActive ? `${appliedStart || "…"} → ${appliedEnd || "…"}` : "All time"}
            </p>
          </div>
        </div>
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
          {filterActive && <span className="text-[10px] text-green-400 opacity-80">✓ Filter active</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Top stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Reservations", value: stats.totalRsvp,     color: "text-gold-500" },
            { label: "Completed",          value: stats.completedRsvp,  color: "text-green-400" },
            { label: "Completion Rate",    value: `${completionRate}%`, color: "text-blue-400" },
            { label: "Cancellation Rate",  value: `${cancellationRate}%`, color: "text-red-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-hive-surface border border-border rounded-xl p-4">
              <div className="text-xs text-muted-foreground mb-1">{label}</div>
              <div className={cn("font-serif text-3xl font-medium", color)}>{value}</div>
            </div>
          ))}
        </div>

        {/* Revenue + total */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-hive-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-sm">Monthly Revenue</h2>
              <span className="text-xs text-muted-foreground">Last 6 months</span>
            </div>
            {monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthlyRevenue} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B5E4A" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#6B5E4A" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<TooltipBox prefix="$" />} cursor={{ fill: "rgba(201,169,110,.06)" }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#C9A96E" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">No completed orders yet</div>
            )}
          </div>
          <div className="bg-hive-surface border border-border rounded-xl p-5 flex flex-col justify-center items-center text-center gap-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Revenue</div>
            <div className="font-serif text-4xl font-medium text-gold-500">{formatCurrency(totalRevenue)}</div>
            <div className="text-xs text-muted-foreground">{stats.completedRsvp} completed · avg {stats.completedRsvp > 0 ? formatCurrency(totalRevenue / stats.completedRsvp) : "$0"} / table</div>
          </div>
        </div>

        {/* ── BOOKING PATTERNS ─────────────────────────────────────────── */}
        <div className="bg-hive-surface border border-border rounded-xl p-5">
          <h2 className="font-medium text-sm mb-5">Booking Patterns</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Hourly */}
            <div>
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Hourly Arrival Distribution</h3>
              <div className="space-y-1.5">
                {hourlyDist.map(({ hour, count }) => (
                  <div key={hour} className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground w-6 text-right shrink-0">{hour}</span>
                    <div className="flex-1 bg-hive-surface2 rounded-full h-5 overflow-hidden">
                      <div className="h-full rounded-full bg-gold-500/60 transition-all" style={{ width: `${Math.max(4, (count / maxCount) * 100)}%` }} />
                    </div>
                    <span className="text-[11px] text-muted-foreground w-5 shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Day of week */}
            <div>
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Day of Week Volume</h3>
              <div className="space-y-1.5">
                {dayDist.map(({ day, count }) => (
                  <div key={day} className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground w-6 shrink-0">{day}</span>
                    <div className="flex-1 bg-hive-surface2 rounded-full h-5 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500/60 transition-all" style={{ width: `${Math.max(4, (count / maxDayCount) * 100)}%` }} />
                    </div>
                    <span className="text-[11px] text-muted-foreground w-5 shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Party size */}
            <div>
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Party Size Distribution</h3>
              <div className="space-y-1.5">
                {partySizeDist.map(({ size, count }) => {
                  const maxP = Math.max(...partySizeDist.map(p => p.count), 1)
                  return (
                    <div key={size} className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground w-12 shrink-0">{size}</span>
                      <div className="flex-1 bg-hive-surface2 rounded-full h-5 overflow-hidden">
                        <div className="h-full rounded-full bg-purple-500/60 transition-all" style={{ width: `${Math.max(4, (count / maxP) * 100)}%` }} />
                      </div>
                      <span className="text-[11px] text-muted-foreground w-5 shrink-0">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Lead time */}
            <div>
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Lead Time (days in advance booked)</h3>
              <div className="space-y-1.5">
                {leadTimeDist.map(({ label, count }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground w-14 shrink-0">{label}</span>
                    <div className="flex-1 bg-hive-surface2 rounded-full h-5 overflow-hidden">
                      <div className="h-full rounded-full bg-teal-500/60 transition-all" style={{ width: `${Math.max(4, (count / maxLeadCount) * 100)}%` }} />
                    </div>
                    <span className="text-[11px] text-muted-foreground w-5 shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Weekly volume + Section split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 pt-6 border-t border-border">
            <div>
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Weekly Reservation Volume — Past 8 Weeks</h3>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={weeklyVol} barSize={28}>
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#6B5E4A" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(201,169,110,.06)" }} />
                  <Bar dataKey="count" name="Reservations" fill="#5B96C8" radius={[3,3,0,0]} label={{ position: "top", fontSize: 9, fill: "#5B96C8" }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Section Preference</h3>
              {sectionDist.length > 0 ? (
                <div className="flex items-center gap-6">
                  <PieChart width={120} height={120}>
                    <Pie data={sectionDist} cx={55} cy={55} innerRadius={30} outerRadius={52} dataKey="value" paddingAngle={2}>
                      {sectionDist.map((_,i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                  <div className="space-y-1.5">
                    {sectionDist.map((s, i) => (
                      <div key={s.name} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-muted-foreground">{s.name}</span>
                        <span className="font-medium ml-auto">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground py-8 text-center">No data yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Staff performance table */}
        <div className="bg-hive-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="font-medium text-sm">Staff Performance</h2>
          </div>
          {staffData.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-hive-surface2">
                  {["Staff","Role","RSVPs","Completed","Revenue","Avg Check","Tips","Covers"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffData.map((s, i) => (
                  <tr key={s.id as string} className="border-b border-border last:border-0 hover:bg-hive-surface2/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color as string }} />
                        <div>
                          <div className="text-sm font-medium">{s.name as string}</div>
                          {i === 0 && (s.revenue as number) > 0 && <div className="text-[10px] text-gold-500">⭐ Top earner</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{s.role as string}</td>
                    <td className="px-4 py-3 text-sm text-center">{s.totalRsvp as number}</td>
                    <td className="px-4 py-3 text-sm text-center text-green-400">{s.completed as number}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gold-500">{formatCurrency(s.revenue as number)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{(s.completed as number) > 0 ? formatCurrency(s.avgCheck as number) : "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{(s.tips as number) > 0 ? formatCurrency(s.tips as number) : "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.covers as number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">Staff data appears once reservations are completed</div>
          )}
        </div>
      </div>
    </div>
  )
}
