"use client"

import { useState } from "react"
import { Search, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { StatusBadge } from "@/components/reservations/status-badge"
import { formatDate, formatTime, cn } from "@/lib/utils"
import type { ReservationStatus } from "@/types"

type Step = "lookup" | "found" | "change_form" | "cancel_form" | "success"

interface FoundReservation {
  id: string; rsvpCode: string; firstName: string; lastName: string
  phone: string; email?: string | null; date: string; arrivalTime: string
  partySize: number; section?: string | null; occasion?: string | null
  notes?: string | null; status: ReservationStatus
}

const SECTION_LABELS: Record<string, string> = {
  FINE_DINING: "Fine Dining", BAR: "Bar", DEN: "Den / Lounge", PATIO: "Patio"
}

const TIME_SLOTS = [
  "17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30","22:00","22:30"
]
const TIME_LABELS: Record<string, string> = {
  "17:00":"5:00 PM","17:30":"5:30 PM","18:00":"6:00 PM","18:30":"6:30 PM",
  "19:00":"7:00 PM","19:30":"7:30 PM","20:00":"8:00 PM","20:30":"8:30 PM",
  "21:00":"9:00 PM","21:30":"9:30 PM","22:00":"10:00 PM","22:30":"10:30 PM",
}

export function ManageRsvpClient({ initialCode }: { initialCode: string }) {
  const [step, setStep] = useState<Step>("lookup")
  const [code, setCode] = useState(initialCode)
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [reservation, setReservation] = useState<FoundReservation | null>(null)

  // Change form state
  const [changeType, setChangeType] = useState("")
  const [newDate, setNewDate] = useState("")
  const [newTime, setNewTime] = useState("")
  const [newPartySize, setNewPartySize] = useState("")
  const [newSection, setNewSection] = useState("")
  const [changeMessage, setChangeMessage] = useState("")

  // Cancel form state
  const [cancelReason, setCancelReason] = useState("")
  const [cancelMessage, setCancelMessage] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [successType, setSuccessType] = useState<"change" | "cancel">("change")

  const today = new Date().toISOString().split("T")[0]

  // ── Step 1: Look up reservation ──────────────────────────────────────

  async function handleLookup() {
    setError("")
    const codeClean = code.trim().toUpperCase()

    if (!codeClean && (!lastName.trim() || !phone.trim())) {
      setError("Enter your RSVP code, or both your last name and phone number.")
      return
    }

    setLoading(true)
    try {
      let url = ""
      if (codeClean) {
        url = `/api/rsvp?code=${codeClean}`
      } else {
        // Look up by phone + last name — search reservations
        const ph = phone.replace(/\D/g, "")
        url = `/api/rsvp?phone=${ph}&lastName=${encodeURIComponent(lastName.trim())}`
      }

      const res = await fetch(url)
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? "Reservation not found.")
        return
      }

      setReservation(json.data)
      setStep("found")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Submit change request ─────────────────────────────────────

  async function handleChange() {
    if (!changeType) { setError("Please select what you'd like to change."); return }
    if (!changeMessage.trim()) { setError("Please describe the change you need."); return }
    setError(""); setSubmitting(true)
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rsvpCode: reservation!.rsvpCode,
          type: "change", changeType,
          message: changeMessage,
          newDate: newDate || null,
          newTime: newTime || null,
          newPartySize: newPartySize ? parseInt(newPartySize) : null,
          newSection: newSection || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSuccessType("change")
      setStep("success")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit request.")
    } finally { setSubmitting(false) }
  }

  // ── Step 3: Submit cancellation ───────────────────────────────────────

  async function handleCancel() {
    setError(""); setSubmitting(true)
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rsvpCode: reservation!.rsvpCode,
          type: "cancellation",
          reason: cancelReason || "Not specified",
          message: cancelMessage || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSuccessType("cancel")
      setStep("success")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit request.")
    } finally { setSubmitting(false) }
  }

  // ── Can they modify? ──────────────────────────────────────────────────

  const canModify = reservation && !["COMPLETED", "CANCELLED"].includes(reservation.status)

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="bg-hive-surface border border-border rounded-2xl overflow-hidden">

      {/* ── LOOKUP ── */}
      {step === "lookup" && (
        <div className="p-6 space-y-4">
          <div>
            <h2 className="font-serif text-xl text-gold-500 mb-1">Find Your Reservation</h2>
            <p className="text-xs text-muted-foreground">Enter your RSVP code from your confirmation message, or look up by last name and phone.</p>
          </div>

          <div className="bg-hive-surface2 rounded-xl p-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">RSVP Code</Label>
              <Input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. 86AH8ZMT"
                className="font-mono tracking-widest h-11 text-center text-lg"
                maxLength={8}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">or look up by</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Last Name</Label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" className="h-10" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Phone Number</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="4045550000" type="tel" className="h-10" />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{error}
            </div>
          )}

          <Button className="w-full h-11" onClick={handleLookup} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            Find My Reservation
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Just booked?{" "}
            <a href="/rsvp" className="text-gold-500 underline underline-offset-2">Make a new reservation</a>
          </p>
        </div>
      )}

      {/* ── FOUND ── */}
      {step === "found" && reservation && (
        <div className="p-6 space-y-4">
          {/* Reservation summary card */}
          <div className="bg-hive-surface2 border border-border rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-serif text-xl text-gold-500">
                  {reservation.firstName} {reservation.lastName}
                </div>
                <div className="text-[10px] text-muted-foreground tracking-widest mt-0.5">
                  RSVP # {reservation.rsvpCode}
                </div>
              </div>
              <StatusBadge status={reservation.status} />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <InfoRow label="Date" value={formatDate(reservation.date)} />
              <InfoRow label="Time" value={formatTime(reservation.arrivalTime)} />
              <InfoRow label="Party" value={`${reservation.partySize} guests`} />
              {reservation.section && <InfoRow label="Section" value={SECTION_LABELS[reservation.section] ?? reservation.section} />}
              {reservation.occasion && <InfoRow label="Occasion" value={reservation.occasion} />}
            </div>
          </div>

          {!canModify && (
            <div className="flex items-start gap-2 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              This reservation is {reservation.status.toLowerCase().replace(/_/g, " ")} and can no longer be modified.
            </div>
          )}

          {canModify && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setStep("change_form"); setError("") }}
                className="flex flex-col items-center gap-2 p-4 bg-hive-surface2 border border-border rounded-xl hover:border-blue-400/50 hover:bg-blue-400/5 transition-colors text-center"
              >
                <span className="text-2xl">✎</span>
                <div>
                  <div className="text-sm font-medium text-blue-400">Request a Change</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Date, time, party size, or section</div>
                </div>
              </button>
              <button
                onClick={() => { setStep("cancel_form"); setError("") }}
                className="flex flex-col items-center gap-2 p-4 bg-hive-surface2 border border-border rounded-xl hover:border-red-400/50 hover:bg-red-400/5 transition-colors text-center"
              >
                <span className="text-2xl">✕</span>
                <div>
                  <div className="text-sm font-medium text-red-400">Cancel Reservation</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Submit a cancellation request</div>
                </div>
              </button>
            </div>
          )}

          <button onClick={() => { setStep("lookup"); setReservation(null) }} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" /> Find a different reservation
          </button>
        </div>
      )}

      {/* ── CHANGE FORM ── */}
      {step === "change_form" && reservation && (
        <div className="p-6 space-y-4">
          <button onClick={() => setStep("found")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Back
          </button>
          <div>
            <h2 className="font-serif text-xl text-gold-500 mb-1">Request a Change</h2>
            <p className="text-xs text-muted-foreground">Changes are reviewed by our staff. Your current reservation remains active until confirmed.</p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">What would you like to change? *</Label>
            <Select value={changeType} onValueChange={v => { setChangeType(v); setError("") }}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date_time">Date and / or Time</SelectItem>
                <SelectItem value="party_size">Party Size</SelectItem>
                <SelectItem value="section">Section Preference</SelectItem>
                <SelectItem value="other">Other / Multiple Changes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {changeType === "date_time" && (
            <div className="space-y-3 bg-hive-surface2 rounded-xl p-4 border border-border">
              <p className="text-xs text-muted-foreground font-medium">Requested new date / time:</p>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">New Date</Label>
                <Input type="date" min={today} value={newDate} onChange={e => setNewDate(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">New Time</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {TIME_SLOTS.map(slot => (
                    <button key={slot} type="button" onClick={() => setNewTime(slot)}
                      className={cn("py-2 rounded-lg border text-xs transition-colors",
                        newTime === slot ? "border-gold-500 bg-gold-500/10 text-gold-500" : "border-border text-muted-foreground hover:border-foreground/40"
                      )}>
                      {TIME_LABELS[slot]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {changeType === "party_size" && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">New Party Size</Label>
              <Input type="number" min={1} max={50} value={newPartySize} onChange={e => setNewPartySize(e.target.value)} placeholder="Number of guests" className="h-10" />
            </div>
          )}

          {changeType === "section" && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Preferred Section</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "FINE_DINING", label: "Fine Dining", icon: "🍽" },
                  { value: "BAR",         label: "Bar",         icon: "🍸" },
                  { value: "DEN",         label: "Den / Lounge",icon: "🪑" },
                  { value: "PATIO",       label: "Patio",       icon: "☀️" },
                ].map(opt => (
                  <button key={opt.value} type="button" onClick={() => setNewSection(opt.value)}
                    className={cn("flex items-center gap-2 p-3 rounded-xl border text-sm transition-colors",
                      newSection === opt.value ? "border-gold-500 bg-gold-500/10 text-gold-500" : "border-border text-muted-foreground hover:border-foreground/40"
                    )}>
                    <span>{opt.icon}</span>{opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Message to Staff *</Label>
            <Textarea
              value={changeMessage}
              onChange={e => setChangeMessage(e.target.value)}
              placeholder="Describe exactly what you'd like to change…"
              className="h-24 resize-none"
            />
          </div>

          <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5">
            ⚠ Your request will be reviewed by our staff. You'll receive a confirmation once the change is approved. Your current reservation stays active until then.
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button className="w-full h-11" onClick={handleChange} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Submit Change Request
          </Button>
        </div>
      )}

      {/* ── CANCEL FORM ── */}
      {step === "cancel_form" && reservation && (
        <div className="p-6 space-y-4">
          <button onClick={() => setStep("found")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Back
          </button>
          <div>
            <h2 className="font-serif text-xl text-red-400 mb-1">Cancel Reservation</h2>
            <p className="text-xs text-muted-foreground">
              Submitting cancels{" "}
              <strong className="text-foreground">{reservation.firstName} {reservation.lastName}</strong>'s reservation for{" "}
              {formatDate(reservation.date)} at {formatTime(reservation.arrivalTime)}.
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Reason for cancellation</Label>
            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Prefer not to say" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="plans_changed">Plans changed</SelectItem>
                <SelectItem value="found_another_venue">Found another venue</SelectItem>
                <SelectItem value="date_time_conflict">Date / time no longer works</SelectItem>
                <SelectItem value="unexpected_circumstances">Unexpected circumstances</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Additional comments (optional)</Label>
            <Textarea value={cancelMessage} onChange={e => setCancelMessage(e.target.value)} placeholder="Anything you'd like us to know…" className="h-20 resize-none" />
          </div>

          <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5">
            ⚠ Your reservation remains active until our team confirms the cancellation. You'll receive a confirmation message once processed.
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button variant="destructive" className="w-full h-11" onClick={handleCancel} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Request Cancellation
          </Button>
        </div>
      )}

      {/* ── SUCCESS ── */}
      {step === "success" && (
        <div className="p-8 text-center space-y-4">
          <div className="text-5xl">{successType === "change" ? "📝" : "✓"}</div>
          <div>
            <h2 className="font-serif text-2xl text-gold-500 mb-2">
              {successType === "change" ? "Change Request Submitted" : "Cancellation Request Submitted"}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {successType === "change"
                ? "Our team will review your request and confirm the change. Your current reservation remains active until approved."
                : "Your cancellation request has been received. Your reservation remains active until our team confirms the cancellation."}
            </p>
          </div>

          <div className="bg-hive-surface2 rounded-xl p-4 text-sm text-muted-foreground leading-relaxed text-left space-y-1.5 border border-border">
            <p>📧 A confirmation will be sent to your email once reviewed.</p>
            <p>📱 A text confirmation will also be sent.</p>
            <p className="text-xs text-muted-foreground/60 pt-1">Typical response time: within 30 minutes during business hours.</p>
          </div>

          <div className="bg-hive-surface2 border border-border rounded-xl px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Your RSVP Code</p>
            <p className="font-mono text-2xl font-bold text-gold-500 tracking-[0.2em]">{reservation?.rsvpCode}</p>
            <p className="text-xs text-muted-foreground mt-1">Save this code to track your request</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => { setStep("lookup"); setReservation(null); setCode("") }}>
              Look up another
            </Button>
            <Button className="flex-1" asChild>
              <a href="/rsvp">New Reservation</a>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
