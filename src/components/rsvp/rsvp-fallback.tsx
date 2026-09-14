"use client"

interface Props {
  message: string
  mode: "fallback" | "closed"
}

export function RsvpFallback({ message, mode }: Props) {
  const isClosed = mode === "closed"
  
  return (
    <div className="bg-hive-surface border border-border rounded-2xl p-8 text-center space-y-6">
      <div className="text-5xl">{isClosed ? "🔒" : "📱"}</div>
      
      <div>
        <h2 className="font-serif text-2xl text-gold-500 mb-2">
          {isClosed ? "Reservations Closed" : "Text Us to Reserve"}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>
      </div>

      {!isClosed && (
        <a
          href="sms:+16785396865"
          className="inline-flex items-center justify-center gap-2 w-full bg-gold-500 hover:bg-gold-600 text-hive-bg font-semibold py-4 px-6 rounded-xl text-lg transition-colors"
        >
          📲 Text (678) 539-6865
        </a>
      )}

      <div className="text-xs text-muted-foreground pt-2 border-t border-border">
        <p>You can also call us at <a href="tel:+16785396865" className="text-gold-500">(678) 539-6865</a></p>
      </div>
    </div>
  )
}
