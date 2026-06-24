// src/hooks/use-reservations.ts
// React Query hooks for reservation data.
// These handle caching, background refetch, and optimistic updates.

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type {
  Reservation,
  ReservationStatus,
} from "@/types";
import type {
  CreateReservationInput,
  UpdateReservationInput,
} from "@/lib/validations/reservation";

// ── Query keys — centralized for cache invalidation ───────────────────────

export const reservationKeys = {
  all: ["reservations"] as const,
  lists: () => [...reservationKeys.all, "list"] as const,
  list: (filters: Record<string, string>) =>
    [...reservationKeys.lists(), filters] as const,
  detail: (id: string) => [...reservationKeys.all, "detail", id] as const,
};

// ── API helpers ────────────────────────────────────────────────────────────

async function fetchReservations(
  filters: Record<string, string> = {}
): Promise<Reservation[]> {
  const params = new URLSearchParams(filters);
  const res = await fetch(`/api/reservations?${params}`);
  if (!res.ok) throw new Error("Failed to fetch reservations");
  const json = await res.json();
  return json.data;
}

async function fetchReservation(id: string): Promise<Reservation> {
  const res = await fetch(`/api/reservations/${id}`);
  if (!res.ok) throw new Error("Failed to fetch reservation");
  const json = await res.json();
  return json.data;
}

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useReservations(
  filters: Record<string, string> = {},
  options?: Omit<UseQueryOptions<Reservation[]>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: reservationKeys.list(filters),
    queryFn: () => fetchReservations(filters),
    refetchInterval: 30_000, // poll every 30 seconds
    ...options,
  });
}

export function useReservation(id: string) {
  return useQuery({
    queryKey: reservationKeys.detail(id),
    queryFn: () => fetchReservation(id),
    enabled: Boolean(id),
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────

export function useCreateReservation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReservationInput) => {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create reservation");
      }
      return (await res.json()).data as Reservation;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reservationKeys.lists() });
    },
  });
}

export function useUpdateReservation(id: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: UpdateReservationInput & { action?: string }
    ) => {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update reservation");
      }
      return (await res.json()).data as Reservation;
    },
    onSuccess: (updated) => {
      // Update the specific item in cache immediately
      qc.setQueryData(reservationKeys.detail(id), updated);
      // Invalidate list queries so they refetch
      qc.invalidateQueries({ queryKey: reservationKeys.lists() });
    },
  });
}

export function useCloseTable(reservationId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Omit<object, "reservationId">
    ) => {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "close_table",
          reservationId,
          ...input,
        }),
      });
      if (!res.ok) throw new Error("Failed to close table");
      return (await res.json()).data as Reservation;
    },
    onSuccess: (updated) => {
      qc.setQueryData(reservationKeys.detail(reservationId), updated);
      qc.invalidateQueries({ queryKey: reservationKeys.lists() });
    },
  });
}

export function useCancelReservation(reservationId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Omit<object, "reservationId">
    ) => {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          reservationId,
          ...input,
        }),
      });
      if (!res.ok) throw new Error("Failed to cancel reservation");
      return (await res.json()).data as Reservation;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reservationKeys.lists() });
    },
  });
}

export function useAdvanceStatus(reservationId: string) {
  return useUpdateReservation(reservationId);
}
