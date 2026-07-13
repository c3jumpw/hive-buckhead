import { ManageRsvpClient } from "@/components/rsvp/manage-rsvp-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Manage Reservation | Hive Buckhead",
  description: "Look up, modify, or cancel your Hive Buckhead reservation",
}

export default function ManageRsvpPage({
  searchParams,
}: {
  searchParams: { code?: string }
}) {
  return (
    <div className="min-h-screen bg-hive-bg flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/icon.png" alt="Hive Buckhead" width={64} height={64} className="mx-auto mb-3" />
          <h1 className="font-serif text-4xl font-medium tracking-[0.1em] text-gold-500 mb-2">
            HIVE <span className="font-light text-foreground/60">BUCKHEAD</span>
          </h1>
          <p className="text-muted-foreground text-sm tracking-wider">MANAGE YOUR RESERVATION</p>
        </div>
        <ManageRsvpClient initialCode={searchParams.code ?? ""} />
      </div>
    </div>
  )
}
