// src/app/(auth)/login/page.tsx
// Staff login — select name + enter PIN.
// Two paths: Supabase email auth (for full access) or PIN-only (floor kiosk mode).

import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Staff Login" };

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-hive-bg flex items-center justify-center p-6">
      <div className="w-full max-w-[340px]">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-4">
            {/*
              BUG HISTORY (2026-07-15): this previously pointed at an
              external WordPress media URL (hivebuckhead.com/wp-content/...)
              with no guarantee it stays online, and no real logo asset had
              been provided yet. Real branding files (icon/vert/wide logo)
              were uploaded to github.com/c3jumpw/hive-buckhead/media and
              are now bundled locally in /public/branding — self-hosted,
              always available, no dependency on an external site staying up.
            */}
            <Image
              src="/branding/icon.png"
              alt="Hive Buckhead"
              width={56}
              height={56}
              className="object-contain"
            />
          </div>
          <h1 className="font-serif text-[26px] font-medium tracking-[0.12em] text-gold-500">
            HIVE{" "}
            <span className="font-light text-muted-foreground">BUCKHEAD</span>
          </h1>
          <p className="text-[11px] text-muted-foreground mt-1 tracking-[0.06em] uppercase">
            Staff Access
          </p>
        </div>

        {/* Login form */}
        <div className="bg-hive-surface border border-border rounded-xl p-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
