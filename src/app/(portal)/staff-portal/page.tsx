/**
 * src/app/(portal)/staff-portal/page.tsx
 * Home — the landing page for every access level after login (see
 * login-form.tsx). Shows quick links, announcements, schedule, resources,
 * and feedback tools appropriate to the user. URL kept as /staff-portal
 * (2026-07-16 rebrand only changed the on-page label and default tab —
 * see staff-portal-client.tsx — so existing links in announcement/
 * onboarding emails and bookmarks keep working unchanged).
 */
import { requireSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { StaffPortalClient } from "@/components/staff-portal/staff-portal-client"

export const metadata = { title: "Home — Hive Buckhead" }

export default async function StaffPortalPage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  // Accessible to all authenticated staff
  const session = await requireSession()

  // 2026-07-15: supports deep-linking to a specific tab, e.g. the "My
  // Profile" link in the top nav dropdown goes to /staff-portal?tab=profile
  //
  // REVISION (2026-07-16): "announcements" folded into "home" (see
  // staff-portal-client.tsx) and "resources" added for the new Resource
  // Hub. Old ?tab=announcements links — e.g. ones already sent in past
  // announcement emails — still resolve, just land on Home now instead of
  // a dedicated announcements view.
  const validTabs = ["home", "schedule", "resources", "feedback", "profile"] as const
  const rawTab = searchParams.tab === "announcements" ? "home" : searchParams.tab
  const initialTab = validTabs.includes(rawTab as typeof validTabs[number])
    ? (rawTab as typeof validTabs[number])
    : undefined

  // Load announcements (pinned first, then by date)
  const announcements = await prisma.announcement.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 20,
    include: { reads: { where: { staffId: session.id }, select: { readAt: true } } },
  })

  // Load this staff member's shifts for the next 14 days
  const today = new Date()
  const twoWeeksOut = new Date(); twoWeeksOut.setDate(today.getDate() + 14)
  const shifts = await prisma.shift.findMany({
    where: { staffId: session.id, date: { gte: today, lte: twoWeeksOut } },
    orderBy: { date: "asc" },
  })

  // Load recurring schedule (all 7 days)
  const recurringShifts = await prisma.recurringShift.findMany({
    where: { staffId: session.id, active: true },
    orderBy: { dayOfWeek: "asc" },
  })

  return (
    <StaffPortalClient
      session={session}
      announcements={announcements}
      shifts={shifts}
      recurringShifts={recurringShifts}
      initialTab={initialTab}
    />
  )
}
