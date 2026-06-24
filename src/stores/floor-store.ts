// src/stores/floor-store.ts
// Client-side state for the floor plan view.
// Zustand is used here because floor state (selected table, active section filter)
// is UI state, not server state — it doesn't need to be persisted or fetched.

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { FloorTable, Section, TableState } from "@/types";

interface FloorStore {
  // Data
  tables: FloorTable[];
  setTables: (tables: FloorTable[]) => void;
  updateTableState: (tableId: string, state: TableState) => void;

  // UI state
  selectedTableId: string | null;
  selectTable: (id: string | null) => void;

  activeSection: Section | "ALL";
  setActiveSection: (section: Section | "ALL") => void;

  // Walk-in modal
  walkInTableId: string | null;
  openWalkIn: (tableId: string) => void;
  closeWalkIn: () => void;

  // Seat guest modal
  seatModalTableId: string | null;
  openSeatModal: (tableId: string | null) => void;
  closeSeatModal: () => void;
}

export const useFloorStore = create<FloorStore>()(
  devtools(
    (set) => ({
      tables: [],
      setTables: (tables) => set({ tables }),
      updateTableState: (tableId, state) =>
        set((s) => ({
          tables: s.tables.map((t) =>
            t.id === tableId ? { ...t, state } : t
          ),
        })),

      selectedTableId: null,
      selectTable: (id) => set({ selectedTableId: id }),

      activeSection: "ALL",
      setActiveSection: (section) => set({ activeSection: section }),

      walkInTableId: null,
      openWalkIn: (tableId) => set({ walkInTableId: tableId }),
      closeWalkIn: () => set({ walkInTableId: null }),

      seatModalTableId: null,
      openSeatModal: (tableId) => set({ seatModalTableId: tableId }),
      closeSeatModal: () => set({ seatModalTableId: null }),
    }),
    { name: "floor-store" }
  )
);
