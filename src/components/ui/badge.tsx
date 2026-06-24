import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        success:
          "border-transparent bg-green-100 text-green-700 hover:bg-green-100/80 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-950/80",
        warning:
          "border-transparent bg-amber-100 text-amber-700 hover:bg-amber-100/80 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-950/80",
        info:
          "border-transparent bg-blue-100 text-blue-700 hover:bg-blue-100/80 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-950/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
