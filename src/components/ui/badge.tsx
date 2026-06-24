import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        requested: "bg-amber-500/10 text-amber-400",
        confirmed: "bg-blue-500/10 text-blue-400",
        seated: "bg-purple-500/10 text-purple-400",
        completed: "bg-green-500/10 text-green-400",
        cancelled: "bg-red-500/10 text-red-400",
        change: "bg-teal-500/10 text-teal-400",
        cancelreq: "bg-amber-500/10 text-amber-400",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
  pulse?: boolean
}

function Badge({ className, variant, dot, pulse, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "inline-block h-1.5 w-1.5 rounded-full bg-current",
            pulse && "animate-pulse"
          )}
        />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
