"use client"
/**
 * src/app/(portal)/onboarding/page.tsx
 * Public onboarding portal — accessed via randomized code given by admin.
 * Multi-step form: verify code → personal info → documents → legal docs → complete.
 */

import { useState } from "react"
import { toast } from "@/hooks/use-toast"
import { LEGAL_DOCS } from "@/lib/legal-docs"

type Step = "verify" | "personal" | "documents" | "legal" | "pin" | "complete"

export default function OnboardingPortalPage() {
  const [step, setStep] = useState<Step>("verify")
  const [accessCode, setAccessCode] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state — collected across steps
  const [form, setForm] = useState({
    name: "", email: "", phone: "", role: "",
    legalName: "", dateOfBirth: "", address: "",
    emergencyContact: "", emergencyPhone: "",
    startDate: "", tshirtSize: "",
    employmentSigned: false, codeOfConductSigned: false,
    pin: "", confirmPin: "",
  })

  function upd(k: string, v: string | boolean) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  /** Step 1 — verify access code */
  async function verifyCode() {
    if (!accessCode.trim()) return
    setVerifying(true)
    try {
      const res = await fetch("/api/onboarding/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: accessCode.trim().toUpperCase() }),
      })
      if (res.ok) setStep("personal")
      else {
        const err = await res.json()
        toast({ title: err.error || "Invalid code", variant: "destructive" })
      }
    } finally { setVerifying(false) }
  }

  /** Final submission */
  async function submitOnboarding() {
    if (form.pin !== form.confirmPin) { toast({ title: "PINs don\'t match", variant: "destructive" }); return }
    if (form.pin.length !== 4 || !/^\d{4}$/.test(form.pin)) { toast({ title: "PIN must be 4 digits", variant: "destructive" }); return }
    if (!form.employmentSigned || !form.codeOfConductSigned) { toast({ title: "Please sign all documents", variant: "destructive" }); return }
    setSubmitting(true)
    try {
      const res = await fetch("/api/onboarding/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) setStep("complete")
      else {
        const err = await res.json()
        toast({ title: err.error || "Submission failed", variant: "destructive" })
      }
    } finally { setSubmitting(false) }
  }

  // BUG HISTORY (2026-07-15): this class set bg-white but no explicit text
  // color. Without one, inputs inherited the app-wide dark-theme default
  // text color (near-white), which is effectively invisible on a white
  // input background. text-gray-900 fixes this explicitly rather than
  // relying on inheritance from wherever this page happens to be mounted.
  //
  // REVISION (2026-07-15, same day): follow-up request — the input tiles
  // themselves (bg-white) were sitting inside an ALSO bg-white card with
  // only a faint border-gray-200 separating them, so fields blended into
  // the card with very little visual distinction. Changed to a light gray
  // fill (bg-gray-100) with a more visible border, so each field reads
  // clearly as its own interactive tile — text stays dark (gray-900) for
  // legibility, only the tile background got darker/more distinct.
  const fieldClass = "w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400"

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header — BUG HISTORY (2026-07-15): this was a hand-drawn inline
            SVG approximating the real hexagon/bee mark, built before real
            logo assets existed. Replaced with the actual icon.png now that
            it's been uploaded to the repo and bundled locally. */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/icon.png" alt="Hive Buckhead" width={64} height={64} className="mx-auto mb-3" />
          <h1 className="text-2xl font-serif font-bold text-gray-900">HIVE BUCKHEAD</h1>
          <p className="text-sm text-gray-500 mt-1">Staff Onboarding Portal</p>
          <p className="text-xs text-gray-400 mt-0.5">Hive Restaurant Buckhead, LLC</p>
        </div>

        {/* Progress indicator */}
        {step !== "verify" && step !== "complete" && (
          <div className="flex items-center mb-8">
            {["personal", "documents", "legal", "pin"].map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  ["personal","documents","legal","pin"].indexOf(step) >= i ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-400"
                }`}>{i + 1}</div>
                {i < 3 && <div className={`flex-1 h-0.5 ${["personal","documents","legal","pin"].indexOf(step) > i ? "bg-amber-500" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

          {/* ── STEP: Verify access code ── */}
          {step === "verify" && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Enter Access Code</h2>
              <p className="text-sm text-gray-500">Your manager will provide today\'s access code to begin onboarding.</p>
              <input type="text" value={accessCode} onChange={e => setAccessCode(e.target.value.toUpperCase())} placeholder="e.g. XK7M2PQ9"
                maxLength={8} className={fieldClass + " text-center text-xl tracking-widest font-mono uppercase"} />
              <button onClick={verifyCode} disabled={verifying || !accessCode.trim()}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors">
                {verifying ? "Verifying…" : "Continue →"}
              </button>
            </div>
          )}

          {/* ── STEP: Personal Information ── */}
          {step === "personal" && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Personal Information</h2>
              <p className="text-sm text-gray-500">Please fill in your details accurately. This information is kept confidential.</p>
              {[
                { key: "name", label: "Full Name *", type: "text", placeholder: "First Last" },
                { key: "email", label: "Email Address *", type: "email", placeholder: "you@example.com" },
                { key: "phone", label: "Phone Number *", type: "tel", placeholder: "(404) 555-0100" },
                { key: "legalName", label: "Legal Name (if different)", type: "text", placeholder: "As it appears on your ID" },
                { key: "dateOfBirth", label: "Date of Birth", type: "date", placeholder: "" },
                { key: "address", label: "Home Address", type: "text", placeholder: "123 Main St, Atlanta, GA 30301" },
                { key: "emergencyContact", label: "Emergency Contact Name", type: "text", placeholder: "Full name" },
                { key: "emergencyPhone", label: "Emergency Contact Phone", type: "tel", placeholder: "(404) 555-0100" },
                { key: "tshirtSize", label: "T-Shirt Size", type: "text", placeholder: "S / M / L / XL / XXL" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-gray-600">{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]} onChange={e => upd(f.key, e.target.value)} placeholder={f.placeholder} className={fieldClass + " mt-1"} />
                </div>
              ))}
              <button onClick={() => setStep("documents")} disabled={!form.name || !form.email || !form.phone}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors">
                Next: Documents →
              </button>
            </div>
          )}

          {/* ── STEP: Documents (role + start date) ── */}
          {step === "documents" && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Role & Start Date</h2>
              {[
                { key: "role", label: "Position / Role *", type: "text", placeholder: "e.g. Server, Bartender, Busser" },
                { key: "startDate", label: "Start Date", type: "date", placeholder: "" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-gray-600">{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]} onChange={e => upd(f.key, e.target.value)} placeholder={f.placeholder} className={fieldClass + " mt-1"} />
                </div>
              ))}
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                <p className="text-xs text-amber-700">📎 ID document upload will be requested by your manager directly for security purposes.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("personal")} className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm">← Back</button>
                <button onClick={() => setStep("legal")} disabled={!form.role}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50">Next: Legal Docs →</button>
              </div>
            </div>
          )}

          {/* ── STEP: Legal Documents ── */}
          {step === "legal" && (
            <div className="space-y-6">
              <h2 className="font-semibold text-lg">Review & Sign Documents</h2>
              <p className="text-sm text-gray-500">Please read each document carefully before signing.</p>

              {[
                { doc: LEGAL_DOCS.employmentAgreement, key: "employmentSigned", label: "I have read and agree to the Employment Agreement" },
                { doc: LEGAL_DOCS.codeOfConduct, key: "codeOfConductSigned", label: "I have read and agree to the Code of Conduct & Workplace Policies" },
              ].map(({ doc, key, label }) => (
                <div key={key} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                    <h3 className="font-semibold text-sm">{doc.title}</h3>
                    <p className="text-xs text-gray-400">{doc.subtitle}</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto p-4 text-xs text-gray-600 whitespace-pre-line leading-relaxed">
                    {doc.body}
                  </div>
                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" checked={(form as any)[key]} onChange={e => upd(key, e.target.checked)} className="mt-0.5 rounded" />
                      <span className="text-xs text-gray-600">{label}</span>
                    </label>
                  </div>
                </div>
              ))}

              <div className="flex gap-3">
                <button onClick={() => setStep("documents")} className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm">← Back</button>
                <button onClick={() => setStep("pin")} disabled={!form.employmentSigned || !form.codeOfConductSigned}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50">Next: Set PIN →</button>
              </div>
            </div>
          )}

          {/* ── STEP: Set PIN ── */}
          {step === "pin" && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Set Your Staff PIN</h2>
              <p className="text-sm text-gray-500">Choose a 4-digit PIN you\'ll use to log into the staff system. Keep it private.</p>
              {[
                { key: "pin", label: "4-Digit PIN *", placeholder: "e.g. 4821" },
                { key: "confirmPin", label: "Confirm PIN *", placeholder: "Re-enter PIN" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-gray-600">{f.label}</label>
                  <input type="password" value={(form as any)[f.key]} onChange={e => upd(f.key, e.target.value)} placeholder={f.placeholder}
                    maxLength={4} className={fieldClass + " mt-1 text-center text-xl tracking-widest"} />
                </div>
              ))}
              <div className="flex gap-3">
                <button onClick={() => setStep("legal")} className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm">← Back</button>
                <button onClick={submitOnboarding} disabled={submitting || !form.pin || form.pin !== form.confirmPin}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50">
                  {submitting ? "Submitting…" : "Complete Onboarding ✓"}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: Complete ──
              BUG HISTORY (2026-07-15): this previously told every new hire
              to "log into the staff portal using your PIN" immediately —
              but at this point their account is active:false and they
              cannot log in at all until an admin approves them (see
              /api/onboarding/submit and /api/onboarding/approve). Telling
              them to log in right away just produced a confusing "invalid
              PIN" experience. Rewritten to accurately describe the actual
              next step: their manager has been notified and will review
              the submission; a separate email follows once approved with
              their employee ID and the real portal link. */}
          {step === "complete" && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-3xl">✓</div>
              <h2 className="font-semibold text-xl text-gray-900">Onboarding Received!</h2>
              <p className="text-sm text-gray-500">Thanks for completing your paperwork. Your manager has been notified and will review your submission shortly.</p>
              <p className="text-sm text-gray-500">You'll receive a follow-up email as soon as your account is approved — it will include your employee ID and a link to log in.</p>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700 text-left">
                Keep the 4-digit PIN you just created somewhere safe — you'll use it to log in once your account is approved.
              </div>
            </div>
          )}

        </div>
        <p className="text-center text-xs text-gray-400 mt-6">© Hive Restaurant Buckhead, LLC · Atlanta, GA</p>
      </div>
    </div>
  )
}
