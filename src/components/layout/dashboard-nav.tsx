"use client";
import { useThemeStore } from "@/stores/theme-store";
// src/components/layout/dashboard-nav.tsx
// Top navigation bar — rendered on every dashboard page.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCw, Sun, Moon, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { initials, hasAccess } from "@/lib/utils";
import type { SessionStaff } from "@/types";

interface DashboardNavProps {
  session: SessionStaff;
}

export function DashboardNav({ session }: DashboardNavProps) {
  const router = useRouter()
  const { dark, toggleTheme } = useThemeStore();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-[54px] shrink-0 items-center justify-between border-b border-border bg-hive-surface px-4 gap-3">
      {/* Brand — BUG HISTORY (2026-07-15): previously an external
          hivebuckhead.com WordPress image URL with an onError fallback
          to hide it if unreachable, paired with separate HTML text. Real
          logo files are now bundled locally (see /public/branding) —
          using wide-logo.png here since it's a pre-composed horizontal
          lockup (icon + wordmark) rather than reconstructing that layout
          from a small icon + separate text every time.
          REVISION (2026-07-16): now links to /staff-portal (Home) instead
          of /reservations, matching Home's new role as the universal
          landing page — clicking the logo should go "home," not to one
          specific operations page. */}
      <Link href="/staff-portal" className="flex items-center shrink-0">
        <img
          src="/branding/wide-logo.png"
          alt="Hive Buckhead"
          className="h-8 w-auto object-contain"
        />
      </Link>

      {/* Quick nav (large screens) — Home added 2026-07-16, mirrors the
          same link added to the top of DashboardSidebar. */}
      <nav className="hidden md:flex items-center gap-1">
        <NavLink href="/staff-portal">Home</NavLink>
        <NavLink href="/reservations">Reservations</NavLink>
        <NavLink href="/floor">Floor</NavLink>
        <NavLink href="/schedule">Schedule</NavLink>
        {hasAccess(session.accessLevel, "MANAGER") && (
          <NavLink href="/admin">Admin</NavLink>
        )}
        {hasAccess(session.accessLevel, "MANAGER") && (
          <NavLink href="/analytics">Analytics</NavLink>
        )}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Live sync indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-green-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-dot" />
          Live
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleTheme()}>
                {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{dark ? "Light mode" : "Dark mode"}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => router.refresh()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh data</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors">
              <Avatar className="h-6 w-6">
                <AvatarFallback
                  className="text-[10px] font-semibold text-white"
                  style={{ backgroundColor: session.color }}
                >
                  {initials(session.name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block">{session.name.split(" ")[0]}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{session.name}</p>
              <p className="text-xs text-muted-foreground">{session.role}</p>
            </div>
            <DropdownMenuSeparator />
            {/* 2026-07-15: links directly to the Staff Portal's Profile tab,
                where email/phone/PIN can be updated — previously there was
                no way to reach this from the main admin dashboard at all,
                only by separately navigating to /staff-portal and clicking
                the Profile tab manually. */}
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/staff-portal?tab=profile">
                <UserCog className="mr-2 h-4 w-4" />
                Edit Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 text-sm text-muted-foreground rounded-md hover:bg-accent hover:text-foreground transition-colors"
    >
      {children}
    </Link>
  );
}
