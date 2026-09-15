"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

type RsvpMode = "online" | "fallback" | "closed"

const MODES: { value: RsvpMode; label: string; description: string; emoji: string; color: string }[] = [
  {
    value: "online",
    label: "Online RSVP — Live",
    description: "Guests book online at reservations.thehivebuckhead.com",
    emoji: "\u2705",
    color: "border-green-500 bg-green-500/10",
  },
  {
    value: "fallback",
    label: "Text-to-RSVP Fallback",
    description: "Guests are redirected to the text-to-RSVP page",
    emoji: "\ud83d\udcf1",
    color: "border-amber-500 bg-amber-500/10",
  },
  {
    value: "closed",
    label: "Reservations Closed",
    description: "Guests see a closed message with phone and text contact info",
    emoji: "\ud83d\udd12",
    color: "border-red-500 bg-red-500/10",
  },
]

export default function ControlPage() {
  const [mode, setMode] = useState<RsvpMode>("online")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [confirming, setConfirming] = useState<RsvpMode | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/kill-switch")
      .then(r => r.json())
      .then(d => { setMode(d.data?.rsvpMode ?? "online"); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function applyMode(newMode: RsvpMode) {
    setSaving(true); setError(""); setSaved(false)
    try {
      const res = await fetch("/api/kill-switch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rsvpMode: newMode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`)
      setMode(newMode)
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save. Try again.")
    } finally {
      setSaving(false); setConfirming(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-hive-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-gold-500" size={32} />
      </div>
    )
  }

  const currentMode = MODES.find(m => m.value === mode) ?? MODES[0]

  return (
    <div className="min-h-screen bg-hive-bg p-4 flex flex-col items-center">
      <div className="w-full max-w-md pt-8 space-y-6">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/icon.png" alt="Hive Buckhead" width={52} height={52} className="mx-auto mb-3" />
          <h1 className="font-serif text-2xl text-gold-500">RSVP Control Panel</h1>
          <p className="text-xs text-muted-foreground mt-1">Hive Buckhead · Owner Access</p>
        </div>

        <div className={`border-2 rounded-2xl p-5 text-center ${currentMode.color}`}>
          <div className="text-4xl mb-2">{currentMode.emoji}</div>
          <div className="font-semibold text-lg">{currentMode.label}</div>
          <div className="text-sm text-muted-foreground mt-1">{currentMode.description}</div>
          {saved && (
            <div className="text-green-400 text-sm mt-3 font-medium">
              Saved — live within 30 seconds
            </div>
          )}
          {error && <div className="text-red-400 text-sm mt-3 font-medium">{error}</div>}
        </div>

        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground text-center uppercase tracking-widest">Switch To</p>
          {MODES.filter(m => m.value !== mode).map(m => (
            <button
              key={m.value}
              onClick={() => setConfirming(m.value)}
              disabled={saving}
              className="w-full border border-border rounded-2xl p-4 text-left hover:border-gold-500/50 hover:bg-gold-500/5 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{m.emoji}</span>
                <div>
                  <div className="font-medium text-sm">{m.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground pb-6">
          Changes live within 30 seconds
          {" · "}
          <a href="/reservations" className="text-gold-500 hover:underline">Dashboard</a>
        </p>
      </div>

      {confirming && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center p-4 z-50">
          <div className="bg-hive-surface border border-border rounded-2xl p-6 w-full max-w-sm">
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">{MODES.find(m => m.value === confirming)?.emoji}</div>
              <h2 className="font-serif text-xl text-gold-500 mb-1">Confirm Switch</h2>
              <p className="text-sm text-muted-foreground">
                Switch to:{" "}
                <strong className="text-foreground">{MODES.find(m => m.value === confirming)?.label}</strong>?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirming(null)}
                disabled={saving}
                className="flex-1 border border-border rounded-xl py-3.5 text-sm font-medium text-muted-foreground hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => applyMode(confirming)}
                disabled={saving}
                className="flex-1 bg-gold-500 hover:bg-gold-600 text-hive-bg rounded-xl py-3.5 text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 size={14} className="animate-spin" />Saving...</> : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
