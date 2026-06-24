// src/app/page.tsx
// Root page — redirect to reservations (the main dashboard view)
import { redirect } from "next/navigation"

export default function RootPage() {
  redirect("/reservations")
}
