"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutList, MapPin, CalendarDays, BarChart3,
  Users, TableProperties, Clock, Settings,
  ChevronRight, Shield, LayoutDashboard,
  MessageSquare, Home,
} from "lucide-react";
import { cn, hasAccess } from "@/lib/utils";
import type { SessionStaff } from "@/types";

interface Props { session: SessionStaff }

export function DashboardSidebar({ session }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") ?? "";
  const level = session.accessLevel;

  const isAdminTab = (tab: string) => pathname === "/admin" && currentTab === tab;

  return (
    <aside className="hidden md:flex w-[200px] shrink-0 flex-col border-r border-border bg-hive-surface overflow-y-auto">
      <nav className="flex-1 p-3 space-y-5">
        {/* Home — added 2026-07-16 alongside making Home the universal
            post-login landing page. This is the way back to it from any
            operations page. */}
        <div>
          <div className="space-y-0.5">
            <SidebarItem href="/staff-portal" label="Home" icon={<Home className="h-3.5 w-3.5" />} active={pathname === "/staff-portal"} />
          </div>
        </div>

        {/* Operations */}
        <div>
          <p className="sb-section-label">Operations</p>
          <div className="space-y-0.5">
            {hasAccess(level, "STAFF") && (
              <SidebarItem href="/reservations" label="Reservations" icon={<LayoutList className="h-3.5 w-3.5" />} active={pathname.startsWith("/reservations")} />
            )}
            <SidebarItem href="/floor" label="Floor View" icon={<MapPin className="h-3.5 w-3.5" />} active={pathname.startsWith("/floor")} />
            {hasAccess(level, "STAFF") && (
              <SidebarItem href="/schedule" label="Staff Schedule" icon={<CalendarDays className="h-3.5 w-3.5" />} active={pathname.startsWith("/schedule")} />
            )}
          </div>
        </div>

        {/* Administration — Level 1 only */}
        {hasAccess(level, "MANAGER") && (
          <div>
            <p className="sb-section-label">Administration</p>
            <div className="space-y-0.5">
              <SidebarItem href="/admin?tab=overview" label="Overview" icon={<LayoutDashboard className="h-3.5 w-3.5" />} active={pathname === "/admin" && (currentTab === "overview" || currentTab === "")} />
              <SidebarItem href="/admin?tab=staff" label="Staff" icon={<Users className="h-3.5 w-3.5" />} active={isAdminTab("staff")} />
              <SidebarItem href="/admin?tab=tables" label="Tables & Sections" icon={<TableProperties className="h-3.5 w-3.5" />} active={isAdminTab("tables")} />
              <SidebarItem href="/admin?tab=hours" label="Operating Hours" icon={<Clock className="h-3.5 w-3.5" />} active={isAdminTab("hours")} />
              <SidebarItem href="/admin?tab=messages" label="Messages" icon={<MessageSquare className="h-3.5 w-3.5" />} active={isAdminTab("messages")} />
              <SidebarItem href="/admin?tab=settings" label="Settings" icon={<Settings className="h-3.5 w-3.5" />} active={isAdminTab("settings")} />
            </div>
          </div>
        )}

        {/* Reports & Data — REVISION (2026-07-16): renamed from "Reports";
            Export CSV removed from here — it was a menu link that just
            navigated to Reservations with a query param. Staff
            Intelligence and Analytics both have their own real export
            buttons directly on the page now, which is where an export
            action belongs rather than a detour through the nav. */}
        {hasAccess(level, "STAFF") && (
          <div>
            <p className="sb-section-label">Reports & Data</p>
            <div className="space-y-0.5">
              <SidebarItem href="/analytics" label="Analytics" icon={<BarChart3 className="h-3.5 w-3.5" />} active={pathname === "/analytics"} />
              {hasAccess(level, "MANAGER") && (
                <SidebarItem href="/analytics/staff" label="Staff Intelligence" icon={<Shield className="h-3.5 w-3.5" />} active={pathname === "/analytics/staff"} />
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Access badge */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className={cn("h-2 w-2 rounded-full", level === "OWNER" ? "bg-gold-500" : level === "MANAGER" ? "bg-blue-400" : "bg-muted-foreground")} />
          <span className="text-[10px] text-muted-foreground capitalize">{level.toLowerCase()} access</span>
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({ href, label, icon, active }: {
  href: string; label: string; icon: React.ReactNode; active: boolean;
}) {
  return (
    <Link href={href} className={cn(
      "flex items-center gap-2 rounded-md px-2 py-[7px] text-[12.5px] transition-colors",
      active ? "bg-hive-surface3 text-gold-500" : "text-muted-foreground hover:bg-hive-surface2 hover:text-foreground"
    )}>
      {icon}
      <span className="flex-1">{label}</span>
      {active && <ChevronRight className="h-3 w-3 opacity-40" />}
    </Link>
  );
}
