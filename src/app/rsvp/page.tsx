import { redirect } from "next/navigation"
import { prisma } from "@/lib/db/prisma"
import { RsvpForm } from "@/components/rsvp/rsvp-form"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Reserve a Table | Hive Buckhead",
  description: "Reserve your table at Hive Buckhead",
}

export const revalidate = 30 // re-check kill switch mode every 30 seconds

// The text-to-RSVP landing page (Systeme.io)
const FALLBACK_URL = "https://pages.hivebuckhead.com/0e2827ef"

export default async function RsvpPage() {
  let rsvpMode = "online"

  try {
    const settings = await prisma.appSettings.findUnique({
      where: { id: "singleton" },
      select: { rsvpMode: true },
    })
    rsvpMode = settings?.rsvpMode ?? "online"
  } catch {
    // DB not yet migrated — default to online so the form still works
    rsvpMode = "online"
  }

  // Fallback mode: redirect guests to the Systeme.io text-to-RSVP page immediately
  if (rsvpMode === "fallback") {
    redirect(FALLBACK_URL)
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

        {rsvpMode === "closed" && (
          <div className="bg-hive-surface border border-border rounded-2xl p-8 text-center space-y-6">
            <div className="text-5xl">🔒</div>
            <div>
              <h2 className="font-serif text-2xl text-gold-500 mb-2">Reservations Closed</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We are not currently accepting reservations online. Please check back soon or contact us directly.
              </p>
            </div>
            <div className="text-xs text-muted-foreground pt-2 border-t border-border space-y-1">
              <p>Call us: <a href="tel:+14704516419" className="text-gold-500">(470) 451-6419</a></p>
              <p>Text us: <a href="sms:+16785396865" className="text-gold-500">(678) 539-6865</a></p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
