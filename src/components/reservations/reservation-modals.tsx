"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatDate, formatTime, cn, todayLocal } from "@/lib/utils"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Reservation = any

// ── New / Edit Reservation Modal ───────────────────────────────────────────

const rsvpSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName:  z.string().min(1, "Required"),
  phone:     z.string().min(10, "Enter a valid phone number"),
  email:     z.string().email().optional().or(z.literal("")),
  date:      z.string().min(1, "Required"),
  arrivalTime: z.string().min(1, "Required"),
  partySize: z.coerce.number().min(1).max(50),
  notes:     z.string().optional(),
})

type RsvpForm = z.infer<typeof rsvpSchema>

interface NewRsvpModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: RsvpForm & { serverId?: string; tableIds?: string[] }) => Promise<void>
  initial?: Reservation | null
  staff: { id: string; name: string }[]
  tables: { id: string; displayId: string; capacity: number; section: string }[]
}

export function NewRsvpModal({ open, onClose, onSubmit, initial, staff, tables }: NewRsvpModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [serverId, setServerId] = useState(initial?.serverId ?? "")

  const { register, handleSubmit, formState: { errors }, reset } = useForm<RsvpForm>({
    resolver: zodResolver(rsvpSchema),
    defaultValues: {
      firstName:   initial?.firstName ?? "",
      lastName:    initial?.lastName ?? "",
      phone:       initial?.phone ?? "",
      email:       initial?.email ?? "",
      date:        initial?.date ? initial.date.split("T")[0] : todayLocal(),
      arrivalTime: initial?.arrivalTime ?? "19:00",
      partySize:   initial?.partySize ?? 2,
      notes:       initial?.notes ?? "",
    },
  })

  // Re-populate form whenever the reservation being edited changes
  useEffect(() => {
    if (open) {
      reset({
        firstName:   initial?.firstName ?? "",
        lastName:    initial?.lastName ?? "",
        phone:       initial?.phone ?? "",
        email:       initial?.email ?? "",
        date:        initial?.date ? initial.date.split("T")[0] : todayLocal(),
        arrivalTime: initial?.arrivalTime ?? "19:00",
        partySize:   initial?.partySize ?? 2,
        notes:       initial?.notes ?? "",
      })
      setServerId(initial?.serverId ?? "")
    }
  }, [open, initial?.id])

  /**
   * BUG HISTORY (2026-07-15): this had a `try { } finally { }` with NO
   * `catch` block at all. If onSubmit (which calls apiPatch, which throws
   * on any non-2xx response) failed for any reason — a validation error,
   * a server error, anything — the exception became an unhandled promise
   * rejection. The finally block cleared the loading spinner, but
   * reset() and onClose() were both inside the try and never ran, so the
   * modal stayed open with zero indication of what went wrong. This is
   * why editing and saving a reservation appeared to do "nothing" —
   * whatever the underlying cause, the failure was completely invisible.
   * Now catches the error and shows exactly what the server said via
   * toast, and the modal correctly stays open (so the user's entered data
   * isn't lost) rather than silently doing nothing.
   */
  async function handleForm(data: RsvpForm) {
    setSubmitting(true)
    try {
      await onSubmit({ ...data, serverId: serverId || undefined })
      reset()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save reservation"
      toast({ title: "Save failed", description: message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Reservation" : "New Reservation"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleForm)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name *" error={errors.firstName?.message}>
              <Input {...register("firstName")} placeholder="First" />
            </Field>
            <Field label="Last Name *" error={errors.lastName?.message}>
              <Input {...register("lastName")} placeholder="Last" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone *" error={errors.phone?.message}>
              <Input {...register("phone")} placeholder="4045550000" type="tel" />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <Input {...register("email")} placeholder="guest@email.com" type="email" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date *" error={errors.date?.message}>
              <Input {...register("date")} type="date" />
            </Field>
            <Field label="Arrival Time *" error={errors.arrivalTime?.message}>
              <Input {...register("arrivalTime")} type="time" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Party Size *" error={errors.partySize?.message}>
              <Input {...register("partySize")} type="number" min={1} max={50} />
            </Field>
            <Field label="Server">
              <Select value={serverId} onValueChange={setServerId}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Notes / Special Requests">
            <Textarea {...register("notes")} placeholder="Allergies, celebrations, seating preferences…" className="h-20" />
          </Field>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : initial ? "Save Changes" : "Create Reservation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Close Table Modal ──────────────────────────────────────────────────────

interface CloseTableModalProps {
  open: boolean
  reservation: Reservation | null
  onClose: () => void
  onSubmit: (data: { orderTotal: number; tipAmount?: number; closingRemarks: string; receiptUrl?: string }) => Promise<void>
}

export function CloseTableModal({ open, reservation: r, onClose, onSubmit }: CloseTableModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [total, setTotal] = useState("")
  const [tip, setTip] = useState("")
  const [remarks, setRemarks] = useState("")
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  function handleReceiptSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setReceiptPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function uploadReceipt(): Promise<string | undefined> {
    if (!receiptFile || !r) return undefined
    const formData = new FormData()
    formData.append("file", receiptFile)
    formData.append("reservationId", r.id)
    formData.append("rsvpCode", r.rsvpCode)
    try {
      setUploadProgress(30)
      const res = await fetch("/api/upload/receipt", { method: "POST", body: formData })
      setUploadProgress(90)
      if (res.ok) {
        const { url } = await res.json()
        setUploadProgress(100)
        return url
      }
    } catch { /* silent — receipt upload failure shouldn't block close */ }
    return undefined
  }

  async function handleSubmit() {
    if (!total || !remarks) return
    setSubmitting(true)
    try {
      const receiptUrl = await uploadReceipt()
      await onSubmit({
        orderTotal: parseFloat(total),
        tipAmount: tip ? parseFloat(tip) : undefined,
        closingRemarks: remarks,
        receiptUrl,
      })
      setTotal(""); setTip(""); setRemarks(""); setReceiptFile(null); setReceiptPreview(null); setUploadProgress(0)
      onClose()
    } finally { setSubmitting(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Close Table & Log Order</DialogTitle>
        </DialogHeader>
        {r && (
          <div className="text-sm text-muted-foreground bg-hive-surface2 rounded-lg px-3 py-2">
            <strong className="text-foreground">{r.firstName} {r.lastName}</strong>
            {" · "}Party of {r.partySize}
            {" · "}{formatDate(r.date)} {formatTime(r.arrivalTime)}
          </div>
        )}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Order Total (pre-tip) *">
              <Input type="number" step="0.01" placeholder="0.00" value={total} onChange={e => setTotal(e.target.value)} />
            </Field>
            <Field label="Tip Amount">
              <Input type="number" step="0.01" placeholder="0.00" value={tip} onChange={e => setTip(e.target.value)} />
            </Field>
          </div>
          <Field label="Closing Remarks *">
            <Textarea
              placeholder="How the experience went, notes for staff, special requests fulfilled…"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="h-20"
            />
          </Field>
          {/* Receipt Upload */}
          <Field label="Receipt Photo (optional)">
            <label className="flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-gold-500/50 transition-colors">
              <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={handleReceiptSelect} />
              {receiptPreview ? (
                <div className="w-full">
                  {receiptFile?.type?.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={receiptPreview} alt="Receipt preview" className="max-h-32 mx-auto rounded object-contain" />
                  ) : (
                    <div className="text-center text-sm text-green-400">📄 {receiptFile?.name}</div>
                  )}
                  <p className="text-[11px] text-center text-muted-foreground mt-2">Click to replace</p>
                </div>
              ) : (
                <>
                  <span className="text-2xl">📸</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Tap to photograph or upload receipt<br />
                    <span className="text-[10px]">JPG, PNG, or PDF</span>
                  </span>
                </>
              )}
            </label>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="w-full bg-hive-surface2 rounded-full h-1.5 mt-1">
                <div className="h-full bg-gold-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !total || !remarks}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete & Log Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Cancel Modal ───────────────────────────────────────────────────────────

const CANCEL_REASONS = [
  "Guest requested cancellation",
  "No show",
  "Duplicate reservation",
  "Capacity issue",
  "Staff initiated",
  "Other",
]

interface CancelModalProps {
  open: boolean
  reservation: Reservation | null
  onClose: () => void
  onSubmit: (data: { reason: string; remarks?: string }) => Promise<void>
}

export function CancelModal({ open, reservation: r, onClose, onSubmit }: CancelModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [reason, setReason] = useState("")
  const [remarks, setRemarks] = useState("")

  async function handleSubmit() {
    if (!reason) return
    setSubmitting(true)
    try {
      await onSubmit({ reason, remarks: remarks || undefined })
      setReason(""); setRemarks("")
      onClose()
    } finally { setSubmitting(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancel Reservation</DialogTitle>
        </DialogHeader>
        {r && (
          <div className="text-sm text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            ⚠ A cancellation notice will be sent to {r.firstName} {r.lastName}.
          </div>
        )}
        <div className="space-y-3">
          <Field label="Reason *">
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Select reason…" /></SelectTrigger>
              <SelectContent>
                {CANCEL_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Additional Remarks">
            <Textarea placeholder="Optional notes…" value={remarks} onChange={e => setRemarks(e.target.value)} className="h-20" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Go Back</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={submitting || !reason}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Cancellation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Field helper ───────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}>{label}</Label>
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  )
}

// ── Seat Guest Modal ─────────────────────────────────────────────────────────
interface SeatGuestModalProps {
  open: boolean
  reservation: { id: string; firstName: string; lastName: string; partySize: number } | null
  tables: { id: string; displayId: string; capacity: number; state: string; section: string }[]
  onClose: () => void
  onSubmit: (tableIds: string[]) => Promise<void>
}

export function SeatGuestModal({ open, reservation, tables, onClose, onSubmit }: SeatGuestModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (open) setSelectedIds([]) }, [open])

  const availableTables = tables.filter(t => t.state === "AVAILABLE" || t.state === "RESERVED")

  function toggle(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleSeat() {
    if (selectedIds.length === 0) return
    setSubmitting(true)
    try { await onSubmit(selectedIds) } finally { setSubmitting(false) }
  }

  const sectionLabels: Record<string, string> = {
    FINE_DINING: "Fine Dining", BAR: "Bar", DEN: "Den / Lounge", PATIO: "Patio"
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="bg-hive-surface border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Seat {reservation?.firstName} {reservation?.lastName}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-1">Party of {reservation?.partySize} · Select one or more tables</p>

        {availableTables.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No available tables right now</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto py-1">
            {availableTables.map(t => {
              const sel = selectedIds.includes(t.id)
              return (
                <button key={t.id} onClick={() => toggle(t.id)}
                  className={`rounded-lg border p-2 text-xs text-center transition-all ${
                    sel ? "border-gold-400 bg-gold-400/10 text-gold-400" : "border-border text-muted-foreground hover:border-foreground/30"
                  }`}>
                  <div className="font-semibold">{t.displayId}</div>
                  <div className="opacity-70">{t.capacity} seats</div>
                  <div className="opacity-50 text-[9px]">{sectionLabels[t.section] ?? t.section}</div>
                </button>
              )
            })}
          </div>
        )}

        {selectedIds.length > 0 && (
          <p className="text-xs text-gold-400">
            {selectedIds.length} table{selectedIds.length > 1 ? "s" : ""} selected
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSeat} disabled={submitting || selectedIds.length === 0}
            className="flex-1 bg-gold-500 hover:bg-gold-600 text-black">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Seat Guest"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
