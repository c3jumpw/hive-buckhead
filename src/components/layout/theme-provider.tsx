"use client"
import { useEffect } from "react"
import { useThemeStore } from "@/stores/theme-store"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { dark } = useThemeStore()
  
  useEffect(() => {
    const html = document.documentElement
    if (dark) {
      html.classList.add("dark")
      html.classList.remove("light")
    } else {
      html.classList.add("light")
      html.classList.remove("dark")
    }
  }, [dark])

  return <>{children}</>
}
