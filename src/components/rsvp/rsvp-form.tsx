"use client"

import { useState, useEffect } from "react"
import { Loader2, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn, todayLocal } from "@/lib/utils"

type Step = 1 | 2 | 3 | 4 | 5

// TIME_SLOTS generated dynamically from operating hours (see useOperatingHours hook below)
/**
 * Generates 30-minute reservation time slots between an open and close time.
 *
 * Handles overnight hours correctly — e.g. open 12:00 PM, close 12:00 AM
 * (midnight) the following day. Native <input type="time"> stores midnight
 * as "00:00", which numerically comes BEFORE any afternoon opening time.
 * A naive h < closeH comparison fails immediately in that case and silently
 * produces zero slots (which the RSVP form then displays as "closed" even
 * though the restaurant is genuinely open) — this is why every day showed
 * "We are closed" regardless of the admin-configured hours.
 *
 * Fix: work in total minutes from midnight, and if the close time is
 * numerically <= the open time, treat it as happening after midnight by
 * adding 24 hours (1440 minutes) to the close time before comparing.
 * Display hours are wrapped back into the normal 0-23 range with `% 24`
 * so "25:30" renders as "1:30 AM", not an invalid hour.
 *
 * @param openTime  - "HH:MM" 24-hour format, e.g. "12:00"
 * @param closeTime - "HH:MM" 24-hour format, e.g. "00:00" (midnight)
 * @returns array of { value, label } slots in 30-minute increments
 */
function generateTimeSlots(openTime: string, closeTime: string): { value: string; label: string }[] {
  const slots: { value: string; label: string }[] = []
  const [openH, openM] = openTime.split(":").map(Number)
  const [closeH, closeM] = closeTime.split(":").map(Number)

  const openMinutes = openH * 60 + openM
  let closeMinutes = closeH * 60 + closeM
  // Close time is on/before open time numerically -> it's actually past midnight.
  // Push it into the next day's minute-range so the loop below runs correctly.
  if (closeMinutes <= openMinutes) closeMinutes += 24 * 60

  for (let mins = openMinutes; mins < closeMinutes; mins += 30) {
    const dayHour = Math.floor(mins / 60) % 24  // wrap 24+ back to 0-23 for display
    const m = mins % 60
    const value = `${String(dayHour).padStart(2,"0")}:${String(m).padStart(2,"0")}`
    const hour12 = dayHour % 12 || 12
    const ampm = dayHour < 12 ? "AM" : "PM"
    const label = `${hour12}:${String(m).padStart(2,"0")} ${ampm}`
    slots.push({ value, label })
  }
  return slots
}

const DEFAULT_TIME_SLOTS = generateTimeSlots("17:00", "22:30")

const SECTIONS = [
  { value: "FINE_DINING", label: "Fine Dining", icon: "🍽", detail: "Elegant tableside dining", max: 38 },
  { value: "BAR",         label: "Bar",         icon: "🍸", detail: "Bar seating · up to 4/group", max: 4 },
  { value: "DEN",         label: "Den / Lounge 🚬", icon: "🪑", detail: "Cozy booths · Smoking permitted", max: 52 },
  { value: "PATIO",       label: "Patio",        icon: "☀️", detail: "Outdoor seating", max: 48 },
]

const OCCASIONS = ["Birthday 🎂","Anniversary 💍","Date Night 🕯","Business Dinner 💼","Family Gathering 👨‍👩‍👧","Celebration 🥂","Other ✨"]

const STEP_LABELS = ["Guest", "Details", "Seating", "Extras", "Review"]

function formatDateLong(d: string) {
  try { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) }
  catch { return d }
}
function formatTime(t: string) {
  if (!t) return "—"
  const [h, m] = t.split(":"); const hr = +h
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`
}

export function RsvpForm() {
  const [step, setStep] = useState<Step>(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [rsvpCode, setRsvpCode] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form state
  const [firstName, setFirstName]   = useState("")
  const [lastName,  setLastName]    = useState("")
  const [phone,     setPhone]       = useState("")
  const [email,     setEmail]       = useState("")
  const [date,      setDate]        = useState(todayLocal())
  const [time,      setTime]        = useState("")
  const [timeSlots,  setTimeSlots]   = useState(DEFAULT_TIME_SLOTS)

  // Fetch operating hours and generate time slots for selected date
  useEffect(() => {
    if (!date) return
    const dayOfWeek = new Date(date + "T12:00:00").getDay()
    fetch("/api/hours/" + dayOfWeek)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.data && !data.data.closed && data.data.openTime && data.data.closeTime) {
          setTimeSlots(generateTimeSlots(data.data.openTime, data.data.closeTime))
        } else if (data?.data?.closed) {
          setTimeSlots([])
        } else {
          setTimeSlots(DEFAULT_TIME_SLOTS)
        }
        setTime("") // reset time when date changes
      })
      .catch(() => setTimeSlots(DEFAULT_TIME_SLOTS))
  }, [date])
  const [partySize, setPartySize]   = useState("")
  const [section,   setSection]     = useState("")
  const [occasion,  setOccasion]    = useState("")
  const [dietary,   setDietary]     = useState("")
  const [notes,     setNotes]       = useState("")

  const today = todayLocal()

  /**
   * BUG HISTORY (2026-07-15): the booking window was hardcoded to 60 days
   * here, completely disconnected from AppSettings.bookingWindowDays —
   * which the admin Settings tab now lets an owner/manager actually edit.
   * Without this fix, changing that setting would persist to the database
   * but have zero real effect on what guests could actually book, since
   * this component never read it. Now fetches the live value on mount and
   * falls back to 60 only if the settings endpoint is unreachable.
   */
  const [bookingWindowDays, setBookingWindowDays] = useState(60)
  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (typeof json?.data?.bookingWindowDays === "number") setBookingWindowDays(json.data.bookingWindowDays) })
      .catch(() => {})
  }, [])

  const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + bookingWindowDays)
  const maxDateStr = maxDate.toISOString().split("T")[0]
  const party = parseInt(partySize) || 0

  // Large party advisory
  const selectedSection = SECTIONS.find(s => s.value === section)
  const largePartyWarning = selectedSection && party > selectedSection.max
    ? `Party of ${party} exceeds the typical capacity for ${selectedSection.label} (${selectedSection.max}). Our team will confirm availability.`
    : section === "BAR" && party > 4
    ? `Bar seating is best for up to 4 guests. For ${party} guests we recommend Fine Dining or Den.`
    : null

  // Validation per step
  function validate(s: Step): boolean {
    const errs: Record<string, string> = {}
    if (s === 1) {
      if (!firstName.trim()) errs.firstName = "Required"
      if (!lastName.trim()) errs.lastName = "Required"
      if (!/^\d{10}$/.test(phone.replace(/\D/g, ""))) errs.phone = "Enter a 10-digit number"
      if (email && !/\S+@\S+\.\S+/.test(email)) errs.email = "Enter a valid email"
    }
    if (s === 2) {
      if (!date) errs.date = "Required"
      if (!time) errs.time = "Please select a time"
      if (!partySize || party < 1 || party > 50) errs.partySize = "Enter a number between 1 and 50"
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function goNext() {
    if (validate(step)) setStep(s => Math.min(s + 1, 5) as Step)
  }
  function goBack() { setStep(s => Math.max(s - 1, 1) as Step) }

  /**
   * Submits the completed RSVP to POST /api/reservations.
   *
   * Error handling history (2026-07-14): this previously caught every
   * failure — network errors, 400 validation failures, 500 server errors —
   * into one generic "Something went wrong" message with no detail. That
   * masked a real bug (missing .nullable() on the email schema field) for
   * an unknown period, because nobody could see *why* submission failed.
   *
   * Now: on a non-2xx response, we parse the JSON body and surface the
   * server's actual message. For Zod validation failures specifically
   * (shape: { error, details: { fieldErrors } }), we pull the first
   * field-specific message so the guest sees something actionable like
   * "Enter a valid email address" instead of a dead end. Network-level
   * failures (fetch itself throwing, e.g. offline) fall through to the
   * catch block, which still shows a generic message since there's no
   * server response to parse in that case.
   */
  async function handleSubmit() {
    setSubmitting(true)
    setErrors({})
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.replace(/\D/g, ""),
          email: email || null,
          date, arrivalTime: time,
          partySize: party,
          section: section || null,
          occasion: occasion || null,
          notes: [dietary ? `Dietary: ${dietary}` : "", notes].filter(Boolean).join(" | ") || null,
          source: "web_form",
        }),
      })

      if (!res.ok) {
        // Try to extract a specific, actionable error message from the
        // server response before falling back to a generic one.
        let message = "Something went wrong. Please try again."
        try {
          const errJson = await res.json()
          const fieldErrors = errJson?.details?.fieldErrors as Record<string, string[]> | undefined
          const firstFieldMessage = fieldErrors ? Object.values(fieldErrors).flat()[0] : undefined
          message = firstFieldMessage || errJson?.error || message
        } catch { /* response wasn't JSON — keep the generic message */ }
        throw new Error(message)
      }

      const json = await res.json()
      setRsvpCode(json.data.rsvpCode)
      setSubmitted(true)
    } catch (err) {
      // err is our own Error with a real message when it came from the
      // !res.ok branch above; for network-level failures (fetch rejecting
      // before we get a response) err.message is generic/browser-provided,
      // so we still fall back to a friendly default in that case.
      const message = err instanceof Error && err.message ? err.message : "Something went wrong. Please try again."
      setErrors({ submit: message })
    } finally { setSubmitting(false) }
  }

  // ── Success screen ────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="bg-hive-surface border border-border rounded-2xl p-8 text-center space-y-4">
        <CheckCircle2 className="h-14 w-14 text-green-400 mx-auto" />
        <div>
          <h2 className="font-serif text-2xl text-gold-500 mb-2">Request Received!</h2>
          <p className="text-sm text-muted-foreground">We'll confirm your reservation shortly.</p>
        </div>
        <div className="bg-hive-surface2 border border-border rounded-xl p-5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Your RSVP Code</p>
          <p className="font-mono text-4xl font-bold text-gold-500 tracking-[0.25em]">{rsvpCode}</p>
          <p className="text-xs text-muted-foreground mt-2">Save this code to manage your reservation</p>
        </div>
        <div className="bg-hive-surface2 border border-border rounded-xl p-4 text-sm text-muted-foreground text-left space-y-1.5">
          <p>📧 Confirmation email sent to your inbox</p>
          <p>📱 Confirmation text sent to your phone</p>
          <p className="text-xs text-muted-foreground/60 pt-1">Our team confirms within 2 hours during business hours.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" asChild>
            <a href={`/rsvp/manage?code=${rsvpCode}`}>Manage Reservation</a>
          </Button>
          <Button className="flex-1" onClick={() => {
            setSubmitted(false); setStep(1); setFirstName(""); setLastName(""); setPhone("")
            setEmail(""); setTime(""); setPartySize(""); setSection(""); setOccasion(""); setDietary(""); setNotes("")
          }}>
            New Reservation
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-0">
        {STEP_LABELS.map((label, i) => {
          const stepNum = (i + 1) as Step
          const isDone = step > stepNum
          const isActive = step === stepNum
          return (
            <div key={label} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all",
                  isDone ? "bg-gold-500/20 border-gold-600 text-gold-500" :
                  isActive ? "bg-gold-500 border-gold-500 text-hive-bg shadow-[0_0_0_4px_rgba(201,169,110,.2)]" :
                  "bg-hive-surface border-border text-muted-foreground"
                )}>
                  {isDone ? "✓" : stepNum}
                </div>
                <span className={cn("text-[10px] whitespace-nowrap", isActive ? "text-gold-500" : isDone ? "text-muted-foreground" : "text-muted-foreground/50")}>
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={cn("flex-1 h-px mx-1 mb-4 transition-colors", isDone ? "bg-gold-600" : "bg-border")} />
              )}
            </div>
          )
        })}
      </div>

      {/* Form card */}
      <div className="bg-hive-surface border border-border rounded-2xl p-6">

        {/* ── STEP 1: Guest Info ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-2xl text-gold-500 mb-1">Welcome — Let's Start with You</h2>
              <p className="text-xs text-muted-foreground">We'll use this to send your confirmation and keep you updated.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="First Name *" error={errors.firstName}>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First" className="h-11" />
              </F>
              <F label="Last Name *" error={errors.lastName}>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last" className="h-11" />
              </F>
            </div>
            <F label="Phone Number *" error={errors.phone} hint="We'll send your confirmation via text">
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="4045550000" type="tel" className="h-11" />
            </F>
            <F label="Email Address" error={errors.email} hint="A confirmation email will be sent here">
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" type="email" className="h-11" />
            </F>
          </div>
        )}

        {/* ── STEP 2: Date, Time, Party ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-2xl text-gold-500 mb-1">When Are You Joining Us?</h2>
              <p className="text-xs text-muted-foreground">Choose your preferred date, time, and party size.</p>
            </div>
            <F label="Date *" error={errors.date}>
              <Input type="date" value={date} min={today} max={maxDateStr} onChange={e => setDate(e.target.value)} className="h-11" />
            </F>
            <F label="Arrival Time *" error={errors.time}>
              <div className="grid grid-cols-4 gap-2">
                {timeSlots.length === 0 ? (
                  <p className="col-span-3 text-sm text-muted-foreground text-center py-2">
                    We are closed on this day. Please select another date.
                  </p>
                ) : timeSlots.map(slot => (
                  <button key={slot.value} type="button" onClick={() => { setTime(slot.value); setErrors(e => ({ ...e, time: "" })) }}
                    className={cn("py-2.5 rounded-lg border text-xs font-medium transition-colors",
                      time === slot.value ? "border-gold-500 bg-gold-500/10 text-gold-500" : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    )}>
                    {slot.label}
                  </button>
                ))}
              </div>
            </F>
            <F label="Party Size *" error={errors.partySize} hint={`Fine Dining (up to 38) · Bar (up to 20) · Den (up to 52) · Patio (up to 48)`}>
              <div className="flex gap-2 items-center">
                <button type="button" onClick={() => setPartySize(s => String(Math.max(1, (parseInt(s)||1) - 1)))}
                  className="h-11 w-11 rounded-lg border border-border text-lg hover:bg-hive-surface2 transition-colors shrink-0">−</button>
                <Input type="number" min={1} max={50} value={partySize} onChange={e => setPartySize(e.target.value)}
                  placeholder="0" className="h-11 text-center text-lg font-medium" />
                <button type="button" onClick={() => setPartySize(s => String(Math.min(50, (parseInt(s)||0) + 1)))}
                  className="h-11 w-11 rounded-lg border border-border text-lg hover:bg-hive-surface2 transition-colors shrink-0">+</button>
              </div>
            </F>
          </div>
        )}

        {/* ── STEP 3: Section Preference ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-2xl text-gold-500 mb-1">Where Would You Like to Sit?</h2>
              <p className="text-xs text-muted-foreground">All requests are subject to availability — our team will confirm when approving.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {SECTIONS.map(s => (
                <button key={s.value} type="button" onClick={() => setSection(prev => prev === s.value ? "" : s.value)}
                  className={cn("flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02]",
                    section === s.value ? "border-gold-500 bg-gold-500/8" : "border-border hover:border-border/60"
                  )}>
                  <span className="text-2xl">{s.icon}</span>
                  <div className="font-medium text-sm">{s.label}</div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed">{s.detail}</div>
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center ml-auto mt-1 transition-all",
                    section === s.value ? "bg-gold-500 border-gold-500" : "border-border"
                  )}>
                    {section === s.value && <span className="text-hive-bg text-[10px] font-bold">✓</span>}
                  </div>
                </button>
              ))}
            </div>
            {largePartyWarning && (
              <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5">
                ⚠ {largePartyWarning}
              </div>
            )}
            <div className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2.5">
              <strong>No preference?</strong> Skip this step — our team will assign the best available section for your party.
            </div>
          </div>
        )}

        {/* ── STEP 4: Extras ── */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-2xl text-gold-500 mb-1">Any Special Details?</h2>
              <p className="text-xs text-muted-foreground">Help us make your visit memorable. All fields are optional.</p>
            </div>
            <F label="Are you celebrating something?">
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map(occ => (
                  <button key={occ} type="button" onClick={() => setOccasion(prev => prev === occ ? "" : occ)}
                    className={cn("px-3 py-1.5 rounded-full text-sm border transition-colors",
                      occasion === occ ? "border-gold-500 bg-gold-500/10 text-gold-500" : "border-border text-muted-foreground hover:border-foreground/40"
                    )}>
                    {occ}
                  </button>
                ))}
              </div>
            </F>
            <F label="Dietary Restrictions or Allergies">
              <Input value={dietary} onChange={e => setDietary(e.target.value)} placeholder="e.g. Gluten-free, nut allergy, vegan…" className="h-11" />
            </F>
            <F label="Additional Notes for Our Team">
              <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Accessibility needs, seating preferences, special requests…" className="h-24 resize-none" />
            </F>
          </div>
        )}

        {/* ── STEP 5: Review ── */}
        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-2xl text-gold-500 mb-1">Review Your Reservation</h2>
              <p className="text-xs text-muted-foreground">Everything look right? Go back to edit any section.</p>
            </div>

            <div className="space-y-3">
              <ReviewSection title="Guest" onEdit={() => setStep(1)}>
                <ReviewRow label="Name" value={`${firstName} ${lastName}`} />
                <ReviewRow label="Phone" value={phone} />
                {email && <ReviewRow label="Email" value={email} />}
              </ReviewSection>

              <ReviewSection title="Reservation" onEdit={() => setStep(2)}>
                <ReviewRow label="Date" value={formatDateLong(date)} />
                <ReviewRow label="Time" value={formatTime(time)} />
                <ReviewRow label="Party Size" value={`${partySize} guest${party !== 1 ? "s" : ""}`} />
              </ReviewSection>

              <ReviewSection title="Seating" onEdit={() => setStep(3)}>
                <ReviewRow label="Section" value={section ? (SECTIONS.find(s => s.value === section)?.label ?? section) : "No preference"} />
              </ReviewSection>

              {(occasion || dietary || notes) && (
                <ReviewSection title="Extras" onEdit={() => setStep(4)}>
                  {occasion && <ReviewRow label="Occasion" value={occasion} />}
                  {dietary  && <ReviewRow label="Dietary"  value={dietary} />}
                  {notes    && <ReviewRow label="Notes"    value={notes} />}
                </ReviewSection>
              )}
            </div>

            {/* Consent */}
            <div className="text-[11px] text-muted-foreground bg-hive-surface2 border border-border rounded-xl p-3 leading-relaxed">
              By submitting, you consent to receive a confirmation text and email from Hive Buckhead regarding this reservation. Your RSVP is <strong className="text-foreground">pending</strong> until our team approves — confirmation follows within 2 hours during business hours.
            </div>

            {errors.submit && <p className="text-sm text-red-400">{errors.submit}</p>}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <Button type="button" variant="outline" className="h-11" onClick={goBack}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          {step < 5 ? (
            <Button type="button" className="flex-1 h-11 font-serif text-base tracking-wider" onClick={goNext}>
              {step === 3 && !section ? "Skip →" : "Continue"} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button type="button" className="flex-1 h-11 font-serif text-base tracking-wider" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Request Reservation 🥂
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function F({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className={cn("text-xs", error ? "text-red-400" : "text-muted-foreground")}>{label}</Label>
      {children}
      {hint && !error && <p className="text-[10px] text-muted-foreground/70 leading-relaxed">{hint}</p>}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  )
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-hive-surface2 border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</span>
        <button type="button" onClick={onEdit} className="text-[11px] text-gold-500 hover:text-gold-400 underline underline-offset-2">Edit</button>
      </div>
      <div className="px-4 py-2 divide-y divide-border">{children}</div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right">{value}</span>
    </div>
  )
}
