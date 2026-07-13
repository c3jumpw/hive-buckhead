import { RsvpForm } from "@/components/rsvp/rsvp-form"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Reserve a Table | Hive Buckhead",
  description: "Reserve your table at Hive Buckhead",
}

export default function RsvpPage() {
  return (
    <div className="min-h-screen bg-hive-bg flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          {/* 2026-07-15: added real logo icon above the text wordmark —
              this page previously had no image at all, text-only. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/icon.png" alt="Hive Buckhead" width={64} height={64} className="mx-auto mb-3" />
          <h1 className="font-serif text-4xl font-medium tracking-[0.1em] text-gold-500 mb-2">
            HIVE <span className="font-light text-foreground/60">BUCKHEAD</span>
          </h1>
          <p className="text-muted-foreground text-sm tracking-wider">RESERVE A TABLE</p>
        </div>
        <RsvpForm />
      </div>
    </div>
  )
}
