import * as React from "react"

import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "w-full min-w-0 bg-transparent text-sm text-foreground outline-none transition-colors disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "h-8 rounded-sm border border-input px-2.5 py-1 file:inline-flex file:h-6 file:border-0 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        ghost: "text-sm tracking-wide placeholder:text-muted2",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

type InputProps = React.ComponentProps<"input"> &
  VariantProps<typeof inputVariants> & {
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
  }

function Input({
  className,
  variant,
  type,
  leftIcon,
  rightIcon,
  ...props
}: InputProps) {
  const isGhost = variant === "ghost"

  const iconClasses =
    "pointer-events-none absolute top-1/2 -translate-y-1/2 select-none [&>svg]:size-3.5"

  if (!leftIcon && !rightIcon) {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(inputVariants({ variant, className }))}
        {...props}
      />
    )
  }

  return (
    <div className="relative w-full" data-slot="input-wrapper">
      <input
        type={type}
        data-slot="input"
        className={cn(
          inputVariants({ variant }),
          "peer",
          leftIcon && (isGhost ? "pl-5" : "pl-8"),
          rightIcon && (isGhost ? "pr-5" : "pr-8"),
          className
        )}
        {...props}
      />
      {leftIcon && (
        <span
          className={cn(
            iconClasses,
            isGhost
              ? "left-0 text-muted2/40 peer-[:not(:placeholder-shown)]:text-muted2 transition-colors duration-200"
              : "left-2.5 text-muted2"
          )}
          aria-hidden="true"
        >
          {leftIcon}
        </span>
      )}
      {rightIcon && (
        <span
          className={cn(
            iconClasses,
            isGhost
              ? "right-0 text-muted2/40 peer-[:not(:placeholder-shown)]:text-muted2 transition-colors duration-200"
              : "right-2.5 text-muted2"
          )}
          aria-hidden="true"
        >
          {rightIcon}
        </span>
      )}
    </div>
  )
}

export { Input, inputVariants }
export type { InputProps }
