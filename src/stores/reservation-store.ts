// src/stores/reservation-store.ts
// UI state for the reservations page (filters, selected row, view mode).
// Server data (the actual reservations) lives in React Query, not here.

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { ReservationStatus, Section, ViewMode } from "@/types";

interface ReservationFilters {
  search: string;
  date: string;         // "today" | "upcoming" | "past" | "" | "YYYY-MM-DD"
  status: ReservationStatus | "";
  serverId: string;
  section: Section | "";
}

interface ReservationStore {
  // View
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Selection
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;

  // Filters
  filters: ReservationFilters;
  setFilter: <K extends keyof ReservationFilters>(
    key: K,
    value: ReservationFilters[K]
  ) => void;
  resetFilters: () => void;

  // Modals
  newReservationOpen: boolean;
  setNewReservationOpen: (open: boolean) => void;

  closeTableId: string | null;
  openCloseTable: (reservationId: string) => void;
  closeCloseTable: () => void;

  cancelReservationId: string | null;
  openCancelReservation: (id: string) => void;
  closeCancelReservation: () => void;
}

const defaultFilters: ReservationFilters = {
  search: "",
  date: "today",
  status: "",
  serverId: "",
  section: "",
};

export const useReservationStore = create<ReservationStore>()(
  devtools(
    persist(
      (set) => ({
        viewMode: "list",
        setViewMode: (viewMode) => set({ viewMode }),

        selectedId: null,
        setSelectedId: (selectedId) => set({ selectedId }),

        filters: defaultFilters,
        setFilter: (key, value) =>
          set((s) => ({ filters: { ...s.filters, [key]: value } })),
        resetFilters: () => set({ filters: defaultFilters }),

        newReservationOpen: false,
        setNewReservationOpen: (open) => set({ newReservationOpen: open }),

        closeTableId: null,
        openCloseTable: (id) => set({ closeTableId: id }),
        closeCloseTable: () => set({ closeTableId: null }),

        cancelReservationId: null,
        openCancelReservation: (id) => set({ cancelReservationId: id }),
        closeCancelReservation: () => set({ cancelReservationId: null }),
      }),
      {
        name: "hive-reservation-ui",
        // Only persist UI preferences, not sensitive data
        partialize: (state) => ({ viewMode: state.viewMode }),
      }
    ),
    { name: "reservation-store" }
  )
);
