"use client"

/**
 * src/components/admin/onboarding-manager.tsx
 * Admin panel for managing the onboarding portal access code.
 * Shows current code, expiry, and a manual rotate button.
 * Also includes message blast tool and staff feedback inbox.
 */

import { useState, useEffect } from "react"
import { RefreshCw, Copy, Send, MessageSquare, ExternalLink } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export function OnboardingManager() {
  const [code, setCode] = useState<string | null>(null)
  const [nextRotation, setNextRotation] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [rotating, setRotating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { loadCode() }, [])

  async function loadCode() {
    setLoading(true)
    try {
      const res = await fetch("/api/onboarding/config")
      if (res.ok) {
        const { data } = await res.json()
        setCode(data.accessCode)
        setNextRotation(data.nextRotationAt)
      }
    } finally { setLoading(false) }
  }

  async function rotateCode() {
    setRotating(true)
    try {
      const res = await fetch("/api/onboarding/config", { method: "POST" })
      if (res.ok) {
        const { data } = await res.json()
        setCode(data.accessCode)
        setNextRotation(data.nextRotationAt)
        toast({ title: "Access code rotated", description: "Give the new code to today's onboarding candidate." })
      }
    } finally { setRotating(false) }
  }

  function copyCode() {
    if (!code) return
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-hive-surface border border-border rounded-xl p-5 space-y-4">
      <div>
        <h3 className="font-medium text-sm">Onboarding Portal Access Code</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Give this code to new hires to access the onboarding form at{" "}
          <span className="text-gold-400">onboarding.thehivebuckhead.com</span>
        </p>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <RefreshCw size={12} className="animate-spin" /> Loading...
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-hive-surface2 border border-border rounded-lg px-4 py-3 font-mono text-xl tracking-widest text-center text-gold-400">
              {code ?? "— — — — — — — —"}
            </div>
            <button onClick={copyCode} disabled={!code}
              className="p-3 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-hive-surface2 transition-colors">
              {copied ? "✓" : <Copy size={16} />}
            </button>
          </div>

          {nextRotation && (
            <p className="text-[11px] text-muted-foreground">
              Auto-rotates on {new Date(nextRotation).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </p>
          )}

          <button onClick={rotateCode} disabled={rotating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gold-500/30 text-gold-400 hover:bg-gold-500/10 text-sm font-medium transition-colors disabled:opacity-50">
            <RefreshCw size={13} className={rotating ? "animate-spin" : ""} />
            {rotating ? "Rotating…" : "Generate New Code Now"}
          </button>
        </>
      )}
    </div>
  )
}

/** Message blast tool — send announcement to all or filtered staff */
export function MessageBlastTool() {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [targetGroup, setTargetGroup] = useState("all")
  const [pinned, setPinned] = useState(false)
  const [sending, setSending] = useState(false)

  async function sendBlast() {
    if (!title.trim() || !body.trim()) return
    setSending(true)
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, targetGroup, pinned }),
      })
      if (res.ok) {
        toast({ title: "Announcement sent", description: "All staff will see this in their portal." })
        setTitle(""); setBody(""); setPinned(false)
      } else {
        toast({ title: "Failed to send", variant: "destructive" })
      }
    } finally { setSending(false) }
  }

  return (
    <div className="bg-hive-surface border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Send size={16} className="text-gold-400" />
        <h3 className="font-medium text-sm">Send Team Announcement</h3>
      </div>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title"
        className="w-full bg-hive-surface2 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold-400" />
      <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="Message body..."
        className="w-full bg-hive-surface2 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold-400 resize-none" />
      <div className="flex items-center gap-3">
        <select value={targetGroup} onChange={e => setTargetGroup(e.target.value)}
          className="bg-hive-surface2 border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none">
          <option value="all">All Staff</option>
          <option value="servers">Servers</option>
          <option value="bartenders">Bartenders</option>
          <option value="kitchen">Kitchen</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} className="rounded" />
          Pin to top
        </label>
      </div>
      <button onClick={sendBlast} disabled={sending || !title.trim() || !body.trim()}
        className="w-full bg-gold-500 hover:bg-gold-600 text-black font-semibold py-2 rounded-lg text-sm disabled:opacity-50 transition-colors">
        {sending ? "Sending…" : "Send to Team"}
      </button>
    </div>
  )
}

/** Staff feedback inbox — admin/manager view */
export function FeedbackInbox() {
  const [feedback, setFeedback] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadFeedback() }, [])

  async function loadFeedback() {
    setLoading(true)
    try {
      const res = await fetch("/api/feedback")
      if (res.ok) { const { data } = await res.json(); setFeedback(data) }
    } finally { setLoading(false) }
  }

  const categoryColors: Record<string, string> = {
    general: "text-blue-400", schedule: "text-amber-400",
    safety: "text-red-400", suggestion: "text-green-400",
  }

  return (
    <div className="bg-hive-surface border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare size={16} className="text-gold-400" />
        <h3 className="font-medium text-sm">Staff Feedback ({feedback.length})</h3>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : feedback.length === 0 ? (
        <p className="text-xs text-muted-foreground">No feedback submitted yet.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {feedback.map(f => (
            <div key={f.id} className="bg-hive-surface2 border border-border rounded-lg p-3">
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${categoryColors[f.category] || "text-muted-foreground"}`}>
                  {f.category}
                </span>
                <span className="text-[10px] text-muted-foreground">{new Date(f.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm mt-1.5">{f.message}</p>
              <p className="text-[10px] text-muted-foreground mt-2">
                {f.isAnonymous ? "Anonymous" : f.staffName || "Unknown"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Quo messaging quick-link card */
export function QuoLinkCard() {
  return (
    <div className="bg-hive-surface border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <ExternalLink size={16} className="text-gold-400" />
        <h3 className="font-medium text-sm">Customer Messaging</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">Open your Quo inbox to view and respond to customer conversations.</p>
      <a href="https://my.quo.com/inbox/PNiXqWFx95" target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full bg-hive-surface2 border border-border hover:border-gold-500/40 rounded-lg py-2 text-sm font-medium transition-colors">
        Open Quo Inbox <ExternalLink size={12} />
      </a>
    </div>
  )
}
