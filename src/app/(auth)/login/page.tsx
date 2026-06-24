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
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl overflow-hidden mb-4">
            <Image
              src="https://hivebuckhead.com/wp-content/uploads/2022/10/apple.png"
              alt="Hive Buckhead"
              width={56}
              height={56}
              className="object-contain"
              unoptimized
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
