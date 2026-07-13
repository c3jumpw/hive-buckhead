/**
 * src/app/(portal)/staff-portal/page.tsx
 * Staff portal landing page — accessible by all access levels (STAFF, MANAGER, OWNER).
 * Shows schedule, announcements, and feedback tools appropriate to the user.
 */
import { requireSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { StaffPortalClient } from "@/components/staff-portal/staff-portal-client"

export const metadata = { title: "Staff Portal — Hive Buckhead" }

export default async function StaffPortalPage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  // Accessible to all authenticated staff
  const session = await requireSession()

  // 2026-07-15: supports deep-linking to a specific tab, e.g. the "My
  // Profile" link in the top nav dropdown goes to /staff-portal?tab=profile
  const validTabs = ["schedule", "announcements", "feedback", "profile"] as const
  const initialTab = validTabs.includes(searchParams.tab as typeof validTabs[number])
    ? (searchParams.tab as typeof validTabs[number])
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
