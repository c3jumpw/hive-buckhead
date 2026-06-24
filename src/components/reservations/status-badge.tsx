"use client"

import { cn } from "@/lib/utils"
import type { ReservationStatus } from "@/types"

const STATUS_CONFIG: Record<ReservationStatus, {
  label: string
  bg: string
  text: string
  pulse?: boolean
}> = {
  REQUESTED:               { label: "Requested",           bg: "bg-amber-500/10",  text: "text-amber-400" },
  CONFIRMED:               { label: "Confirmed",           bg: "bg-blue-500/10",   text: "text-blue-400" },
  SEATED:                  { label: "Seated",              bg: "bg-purple-500/10", text: "text-purple-400", pulse: true },
  COMPLETED:               { label: "Completed",           bg: "bg-green-500/10",  text: "text-green-400" },
  CANCELLED:               { label: "Cancelled",           bg: "bg-red-500/10",    text: "text-red-400" },
  CHANGE_REQUESTED:        { label: "Change Requested",    bg: "bg-teal-500/10",   text: "text-teal-400", pulse: true },
  CANCELLATION_REQUESTED:  { label: "Cancel Requested",   bg: "bg-amber-500/10",  text: "text-amber-400", pulse: true },
}

export function StatusBadge({ status }: { status: ReservationStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.REQUESTED
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium", cfg.bg, cfg.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full bg-current", cfg.pulse && "animate-pulse")} />
      {cfg.label}
    </span>
  )
}
