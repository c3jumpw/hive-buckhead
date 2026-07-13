// Activity logger stub
export async function logActivity(..._args: any[]) {
  // Implemented via prisma.activityLog.create directly in routes
}

/**
 * Fetches email addresses for all active OWNER/MANAGER staff.
 * Shared helper — used by every "notify admins" call site (onboarding
 * submissions, profile changes, feedback, callouts) to avoid duplicating
 * the same query in four different route files.
 */
export async function getAdminEmails(): Promise<string[]> {
  const { prisma } = await import("@/lib/db/prisma")
  const admins = await prisma.staff.findMany({
    where: { active: true, accessLevel: { in: ["OWNER", "MANAGER"] } },
    select: { email: true },
  })
  return admins.map((a: { email: string }) => a.email)
}
