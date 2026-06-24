"use client"
import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ThemeStore {
  dark: boolean
  toggleTheme: () => void
  setDark: (v: boolean) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      dark: true,
      toggleTheme: () => set(s => ({ dark: !s.dark })),
      setDark: (dark) => set({ dark }),
    }),
    { name: "hive-theme" }
  )
)
