export default function UnauthorizedPage() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="font-serif text-2xl text-gold-500 mb-2">Access Denied</h1>
        <p className="text-muted-foreground text-sm">
          You don&apos;t have permission to view this page.
        </p>
      </div>
    </div>
  )
}
