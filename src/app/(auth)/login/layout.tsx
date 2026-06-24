// Auth pages (login) don't get the dashboard nav/sidebar
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
