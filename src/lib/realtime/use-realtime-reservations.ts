"use client";
// src/lib/realtime/use-realtime-reservations.ts
// Subscribes to Postgres changes via Supabase Realtime.
// When any reservation changes in the DB, React Query cache is invalidated
// and UI updates automatically — no manual polling needed.

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/auth/supabase-browser";
import { reservationKeys } from "@/hooks/use-reservations";

export function useRealtimeReservations() {
  const qc = useQueryClient();

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    const channel = supabase
      .channel("reservations-changes")
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "reservations",
        },
        (payload) => {
          console.log("[Realtime] Reservation change:", payload.eventType);

          // Invalidate affected queries
          if (payload.eventType === "DELETE") {
            qc.invalidateQueries({ queryKey: reservationKeys.lists() });
          } else {
            const id = (payload.new as { id?: string })?.id;
            if (id) {
              // Invalidate the specific detail
              qc.invalidateQueries({ queryKey: reservationKeys.detail(id) });
            }
            // Always invalidate lists
            qc.invalidateQueries({ queryKey: reservationKeys.lists() });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tables",
        },
        () => {
          // Table state changes (seated, dirty, etc.) affect floor view
          qc.invalidateQueries({ queryKey: ["tables"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
