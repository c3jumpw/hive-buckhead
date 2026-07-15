"use client"

/**
 * src/components/admin/onboarding-manager.tsx
 * Admin panel for managing the onboarding portal access code.
 * Shows current code, expiry, and a manual rotate button.
 * Also includes message blast tool and staff feedback inbox.
 */

import { useState, useEffect } from "react"
import { RefreshCw, Copy, Send, MessageSquare, ExternalLink, KeyRound, Pencil, X, Save, Trash2 } from "lucide-react"
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

/**
 * SystemeLinkCard
 * Added 2026-07-16 alongside the Messages tab reorg. Opens Systeme.io
 * directly — collected guest contacts (synced on RSVP via
 * upsertSystemeContact), marketing blasts, and segment/tag browsing all
 * live in Systeme.io itself; this is a launcher, not a re-implementation
 * of their CRM inside Hive Buckhead.
 */
export function SystemeLinkCard() {
  return (
    <div className="bg-hive-surface border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <ExternalLink size={16} className="text-gold-400" />
        <h3 className="font-medium text-sm">Marketing (Systeme.io)</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Open Systeme.io to view collected guest contacts, send marketing blasts, and browse segments/tags.
      </p>
      <a href="https://systeme.io/dashboard" target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full bg-hive-surface2 border border-border hover:border-gold-500/40 rounded-lg py-2 text-sm font-medium transition-colors">
        Open Systeme.io <ExternalLink size={12} />
      </a>
    </div>
  )
}

/**
 * PendingApprovalsPanel
 * Shows every staff member who completed onboarding but hasn't been
 * approved/rejected yet. Approve makes them fully active (login, staff
 * lists, dashboards, Google Sheets roster). Reject keeps the record for
 * audit purposes but they never become visible anywhere.
 */
export function PendingApprovalsPanel() {
  const [pending, setPending] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/onboarding/pending")
      if (res.ok) { const { data } = await res.json(); setPending(data) }
    } finally { setLoading(false) }
  }

  /**
   * Fetches a short-lived (10 min) signed URL for a private onboarding
   * document and opens it in a new tab. Never uses idDocumentUrl directly
   * as a src — that field is an internal storage PATH, not a fetchable
   * URL, since the bucket is private (see upload-document/route.ts).
   */
  async function viewDocument(path: string) {
    try {
      const res = await fetch(`/api/onboarding/document-url?path=${encodeURIComponent(path)}`)
      const json = await res.json()
      if (res.ok && json.url) {
        window.open(json.url, "_blank", "noopener,noreferrer")
      } else {
        toast({ title: json.error || "Could not open document", variant: "destructive" })
      }
    } catch {
      toast({ title: "Could not open document", variant: "destructive" })
    }
  }

  async function approve(staffId: string, name: string) {
    setProcessingId(staffId)
    try {
      const res = await fetch("/api/onboarding/approve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      })
      if (res.ok) {
        toast({ title: `${name} approved`, description: "They can now log in and appear in staff lists." })
        setPending(prev => prev.filter(p => p.id !== staffId))
      } else {
        const err = await res.json()
        toast({ title: err.error || "Approval failed", variant: "destructive" })
      }
    } finally { setProcessingId(null) }
  }

  async function reject(staffId: string, name: string) {
    if (!confirm(`Reject ${name}'s onboarding? This cannot be undone from here.`)) return
    setProcessingId(staffId)
    try {
      const res = await fetch("/api/onboarding/reject", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      })
      if (res.ok) {
        toast({ title: `${name}'s onboarding rejected` })
        setPending(prev => prev.filter(p => p.id !== staffId))
      } else {
        const err = await res.json()
        toast({ title: err.error || "Rejection failed", variant: "destructive" })
      }
    } finally { setProcessingId(null) }
  }

  return (
    <div className="bg-hive-surface border border-gold-500/30 rounded-xl p-5 space-y-3 md:col-span-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm flex items-center gap-2">
          Pending Approvals
          {pending.length > 0 && <span className="text-[10px] bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full">{pending.length}</span>}
        </h3>
        <button onClick={load} className="text-xs text-muted-foreground hover:text-foreground">Refresh</button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : pending.length === 0 ? (
        <p className="text-xs text-muted-foreground">No submissions awaiting approval.</p>
      ) : (
        <div className="space-y-2">
          {pending.map(p => (
            <div key={p.id} className="bg-hive-surface2 border border-border rounded-lg p-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.email} · {p.role}{p.position?.name ? ` (${p.position.name})` : ""}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Submitted {new Date(p.createdAt).toLocaleDateString()}</div>
                {p.onboardingRecord?.signatureText && (
                  <div className="text-[10px] text-muted-foreground mt-1 italic">Signed: "{p.onboardingRecord.signatureText}"</div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {p.onboardingRecord?.idDocumentUrl && (
                  <button onClick={() => viewDocument(p.onboardingRecord!.idDocumentUrl!)}
                    className="px-3 py-1.5 rounded-lg border border-blue-500/30 text-blue-400 text-xs hover:bg-blue-500/10">
                    View ID
                  </button>
                )}
                <button onClick={() => reject(p.id, p.name)} disabled={processingId === p.id}
                  className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 disabled:opacity-50">
                  Reject
                </button>
                <button onClick={() => approve(p.id, p.name)} disabled={processingId === p.id}
                  className="px-3 py-1.5 rounded-lg bg-gold-500 hover:bg-gold-600 text-black text-xs font-medium disabled:opacity-50">
                  {processingId === p.id ? "…" : "Approve"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type IntegrationKey = "sendgrid" | "quo" | "systeme"
type IntegrationStatus = { configured: boolean; source: "override" | "env" | "none"; masked: string | null }

const INTEGRATION_LABELS: Record<IntegrationKey, string> = {
  sendgrid: "SendGrid (Email)", quo: "Quo (SMS)", systeme: "Systeme.io (CRM)",
}
const SOURCE_LABELS: Record<IntegrationStatus["source"], string> = {
  override: "Custom — set here", env: "From Vercel env var", none: "Not configured",
}

/**
 * IntegrationSettingsPanel
 * Added 2026-07-16. Lets an OWNER/MANAGER view and edit the SendGrid/Quo/
 * Systeme.io API keys without a redeploy — previously these were only
 * settable via Vercel's env vars. Existing values are never sent to the
 * client in full, only masked (last 4 chars) — editing means typing a new
 * value, not revealing the old one. Saving requires the admin's own current
 * PIN, per the passcode-reconfirmation requirement for configuration
 * changes. Google Sheets / Database aren't included here — those are a
 * multi-line service-account key and a connection string, not a single
 * token, and stay managed directly in Vercel.
 */
export function IntegrationSettingsPanel() {
  const [status, setStatus] = useState<Record<IntegrationKey, IntegrationStatus> | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingKey, setEditingKey] = useState<IntegrationKey | null>(null)
  const [newValue, setNewValue] = useState("")
  const [pin, setPin] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/settings/integrations")
      if (res.ok) { const { data } = await res.json(); setStatus(data) }
    } finally { setLoading(false) }
  }

  function startEdit(key: IntegrationKey) {
    setEditingKey(key); setNewValue(""); setPin("")
  }
  function cancelEdit() {
    setEditingKey(null); setNewValue(""); setPin("")
  }

  async function save(key: IntegrationKey, valueOverride?: string) {
    const apiKey = valueOverride ?? newValue
    if (!pin) { toast({ title: "Enter your PIN to confirm", variant: "destructive" }); return }
    setSaving(true)
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration: key, apiKey, currentPin: pin }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: json.error || "Save failed", variant: "destructive" })
        return
      }
      setStatus(s => s ? { ...s, [key]: json.data } : s)
      toast({ title: apiKey ? "API key updated" : "Reverted to Vercel env var" })
      cancelEdit()
    } catch (e) {
      toast({ title: "Save failed", description: String(e), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-hive-surface border border-border rounded-xl p-5 space-y-3 md:col-span-2">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-gold-400" />
        <h3 className="font-medium text-sm">Integration Settings</h3>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Prefilled from Vercel by default. Edit a key here to override it without a redeploy — saving requires your PIN.
      </p>
      {loading || !status ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-2">
          {(Object.keys(INTEGRATION_LABELS) as IntegrationKey[]).map(key => (
            <div key={key} className="bg-hive-surface2 border border-border rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{INTEGRATION_LABELS[key]}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono">{status[key].masked ?? "—"}</span>
                    <span>·</span>
                    <span>{SOURCE_LABELS[status[key].source]}</span>
                  </div>
                </div>
                {editingKey !== key && (
                  <button onClick={() => startEdit(key)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-hive-surface transition-colors shrink-0">
                    <Pencil className="h-3 w-3" />Edit
                  </button>
                )}
              </div>
              {editingKey === key && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <input
                    type="text" autoComplete="off" placeholder="New API key"
                    value={newValue} onChange={e => setNewValue(e.target.value)}
                    className="w-full bg-hive-surface border border-border rounded-md px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-gold-400"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="password" inputMode="numeric" maxLength={4} placeholder="Your PIN"
                      value={pin} onChange={e => setPin(e.target.value)}
                      className="w-24 bg-hive-surface border border-border rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gold-400"
                    />
                    <button onClick={() => save(key)} disabled={saving || !newValue}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gold-500 hover:bg-gold-600 text-black text-xs font-medium disabled:opacity-50">
                      <Save className="h-3 w-3" />Save
                    </button>
                    <button onClick={cancelEdit} disabled={saving}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-hive-surface disabled:opacity-50">
                      <X className="h-3 w-3" />Cancel
                    </button>
                  </div>
                  {status[key].source === "override" && (
                    <button
                      disabled={saving}
                      onClick={() => save(key, "")}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />Revert to Vercel env var instead
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * IntegrationDiagnosticsPanel
 * Shows configuration status for every external integration at a glance.
 * Built specifically so "did an email/SMS not send because of a code bug,
 * or because a credential is missing?" is a 5-second visual check instead
 * of a live-test-and-log-dive every time it comes up.
 */
export function IntegrationDiagnosticsPanel() {
  const [checks, setChecks] = useState<Record<string, { configured: boolean; detail: string }>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/diagnostics")
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.data) setChecks(json.data) })
      .finally(() => setLoading(false))
  }, [])

  const labels: Record<string, string> = {
    sendgrid: "SendGrid (Email)", quo: "Quo (SMS)",
    systemeIo: "Systeme.io (CRM)", googleSheets: "Google Sheets",
    database: "Database",
  }

  return (
    <div className="bg-hive-surface border border-border rounded-xl p-5 space-y-3">
      <h3 className="font-medium text-sm">Integration Status</h3>
      {loading ? (
        <p className="text-xs text-muted-foreground">Checking…</p>
      ) : (
        <div className="space-y-2">
          {Object.entries(checks).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{labels[key] ?? key}</span>
              <span className={val.configured ? "text-green-400" : "text-red-400"}>
                {val.configured ? "✓ Configured" : "✗ Missing"}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">
        "Configured" means the credential is present — a send can still fail for other reasons (invalid key, unverified sender, no API credits).
      </p>
    </div>
  )
}

/**
 * RecentSendsPanel
 * Shows the last 30 email/SMS send attempts with their actual outcome.
 * Built 2026-07-15 alongside the logEmailAttempt wrapper — this is what
 * makes "did the confirmation email actually send, and if not why" a
 * visible, self-service answer instead of something only Claude could
 * diagnose by reading server code and guessing.
 */
export function RecentSendsPanel() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/message-logs")
      if (res.ok) { const { data } = await res.json(); setLogs(data) }
    } finally { setLoading(false) }
  }

  const statusColor: Record<string, string> = {
    SENT: "text-green-400", FAILED: "text-red-400", PARTIAL: "text-amber-400", PENDING: "text-muted-foreground",
  }

  return (
    <div className="bg-hive-surface border border-border rounded-xl p-5 space-y-3 md:col-span-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Recent Sends</h3>
        <button onClick={load} className="text-xs text-muted-foreground hover:text-foreground">Refresh</button>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : logs.length === 0 ? (
        <p className="text-xs text-muted-foreground">No sends recorded yet.</p>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {logs.map(l => (
            <div key={l.id} className="flex items-center justify-between bg-hive-surface2 border border-border rounded-lg px-3 py-2 text-xs">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${statusColor[l.status] ?? "text-muted-foreground"}`}>{l.status}</span>
                  <span className="text-muted-foreground">{l.channel}</span>
                  <span className="truncate">{l.subject}</span>
                </div>
                <div className="text-muted-foreground truncate">{l.recipient}</div>
                {l.status === "FAILED" && <div className="text-red-300/80 truncate mt-0.5">{l.body}</div>}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{new Date(l.sentAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * AdminActivityLogPanel
 * Added 2026-07-16 — the "master log of edits and who performed them"
 * request. Lists system-level admin actions (staff invited/edited/
 * offboarded, onboarding approved/rejected, integration settings changed,
 * reservations reset) fed by logAdminAction() in activity-logger.ts.
 * Deliberately separate from RecentSendsPanel above — that's message
 * delivery outcomes, this is who-changed-what. Export CSV hits the same
 * GET route with format=csv so the on-screen list and the download can
 * never show different data.
 */
export function AdminActivityLogPanel() {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/activity-log")
      if (res.ok) { const { data } = await res.json(); setEntries(data) }
    } finally { setLoading(false) }
  }

  return (
    <div className="bg-hive-surface border border-border rounded-xl p-5 space-y-3 md:col-span-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Admin Activity Log</h3>
        <div className="flex items-center gap-3">
          <a href="/api/admin/activity-log?format=csv" className="text-xs text-gold-400 hover:text-gold-300">↓ Export CSV</a>
          <button onClick={load} className="text-xs text-muted-foreground hover:text-foreground">Refresh</button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">Staff changes, onboarding decisions, settings edits — most recent 50. Full history in the export.</p>
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">No admin actions logged yet.</p>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {entries.map(e => (
            <div key={e.id} className="flex items-center justify-between bg-hive-surface2 border border-border rounded-lg px-3 py-2 text-xs">
              <div className="min-w-0 flex-1">
                <span className="truncate block">{e.description}</span>
                <span className="text-muted-foreground text-[10px]">{e.performedBy}</span>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{new Date(e.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
