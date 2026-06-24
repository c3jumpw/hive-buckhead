// src/app/(dashboard)/layout.tsx
// All routes inside (dashboard) share this layout.
// It checks authentication server-side before rendering anything.

import { requireAuth } from "@/lib/auth/session";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // requireAuth() redirects to /login if not authenticated
  const session = await requireAuth();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-hive-bg">
      <DashboardNav session={session} />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar session={session} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
