"use client";
// src/components/auth/login-form.tsx
// Staff PIN login form. Fetches staff list on mount, then verifies PIN via API.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface StaffOption {
  id: string;
  name: string;
  role: string;
  accessLevel: string;
}

export function LoginForm() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  // Load staff list on mount
  useEffect(() => {
    fetch("/api/auth/staff-list")
      .then((r) => r.json())
      .then((json) => setStaff(json.data ?? []))
      .catch(() => setError("Failed to load staff list"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedId) {
      setError("Please select your name.");
      return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError("Please enter your 4-digit PIN.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: selectedId, pin }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setError(json.error ?? "Incorrect PIN. Please try again.");
        setPin("");
        return;
      }

      // Redirect based on access level
      const level = json.data?.accessLevel;
      if (level === "STAFF") {
        router.push("/floor");
      } else {
        router.push("/reservations");
      }
      router.refresh();
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Staff Member</Label>
        <Select
          value={selectedId}
          onValueChange={(v) => {
            setSelectedId(v);
            setError("");
          }}
          disabled={loading}
        >
          <SelectTrigger className="h-11 text-sm">
            <SelectValue placeholder={loading ? "Loading…" : "Select your name"} />
          </SelectTrigger>
          {/*
            BUG HISTORY (2026-07-15): Radix's Select auto-flips to open
            above the trigger when it judges there's more room that
            direction — on this login card (vertically centered in a short
            viewport), that flip was pushing the staff name dropdown
            partially off the top of the screen, making later names
            unreachable. side="bottom" + avoidCollisions={false} pins it
            to always open downward here specifically, without changing
            the shared Select component's default collision-avoidance
            behavior used elsewhere in the app (which is fine in taller,
            scrollable contexts).
          */}
          <SelectContent side="bottom" avoidCollisions={false}>
            {staff.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <div className="flex flex-col">
                  <span>{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.role}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">4-Digit PIN</Label>
        <Input
          type="password"
          inputMode="numeric"
          maxLength={4}
          pattern="\d{4}"
          placeholder="••••"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit(e as never)}
          className={cn(
            "h-11 text-center text-2xl tracking-[0.25em]",
            error && "border-destructive"
          )}
          autoComplete="off"
          autoFocus={false}
        />
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <Button
        type="submit"
        className="w-full h-11 font-serif text-base tracking-wider"
        disabled={submitting || loading}
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
}
