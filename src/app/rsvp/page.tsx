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
