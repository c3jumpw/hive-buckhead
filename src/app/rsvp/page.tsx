import { prisma } from "@/lib/db/prisma"
import { RsvpForm } from "@/components/rsvp/rsvp-form"
import { RsvpFallback } from "@/components/rsvp/rsvp-fallback"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Reserve a Table | Hive Buckhead",
  description: "Reserve your table at Hive Buckhead",
}

export const revalidate = 30 // re-check mode every 30 seconds

export default async function RsvpPage() {
  // Read RSVP mode from AppSettings — gracefully fallback to "online" if
  // the table doesn't exist yet (pre-migration) so the public page never breaks.
  let rsvpMode = "online"
  let fallbackMessage = "To make a reservation, please text us at (678) 539-6865 with your name, date, time, and party size."
  
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } })
    if (settings) {
      rsvpMode = (settings as Record<string, unknown>).rsvpMode as string ?? "online"
      fallbackMessage = (settings as Record<string, unknown>).rsvpFallbackMessage as string ?? fallbackMessage
    }
  } catch {
    // DB unreachable or column not yet migrated — show the form as default
    rsvpMode = "online"
  }

  return (
    <div className="min-h-screen bg-hive-bg flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/icon.png" alt="Hive Buckhead" width={64} height={64} className="mx-auto mb-3" />
          <h1 className="font-serif text-4xl font-medium tracking-[0.1em] text-gold-500 mb-2">
            HIVE <span className="font-light text-foreground/60">BUCKHEAD</span>
          </h1>
          <p className="text-muted-foreground text-sm tracking-wider">
            {rsvpMode === "closed" ? "RESERVATIONS" : "RESERVE A TABLE"}
          </p>
        </div>
        
        {rsvpMode === "online" && <RsvpForm />}
        {rsvpMode === "fallback" && <RsvpFallback message={fallbackMessage} mode="fallback" />}
        {rsvpMode === "closed" && <RsvpFallback message="We are not currently accepting reservations online. Please check back soon or call us directly." mode="closed" />}
      </div>
    </div>
  )
}
