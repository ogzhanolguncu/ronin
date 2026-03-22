import { cn } from "@/lib/utils"

type InterludeProps = {
  title: string
  children?: React.ReactNode
  className?: string
}

export function Interlude({ title, children, className }: InterludeProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-5 min-h-[60vh]", className)}>
      <div className="flex items-center">
        <span className="text-foreground text-xl tracking-wide">{title}</span>
        <span
          className="bg-shu mb-2.5 ml-2 inline-block size-1.5 shrink-0 rounded-[1px] shadow-[0_0_3px_oklch(0.55_0.14_30/0.3)]"
          style={{ animation: "ink-breathe 3s ease-in-out infinite" }}
        />
      </div>
      <svg viewBox="0 0 120 8" className="w-28 h-2">
        <path
          d="M 2 4 C 8 2, 16 2, 28 3.5 C 40 5, 52 5.5, 64 4 C 76 2.5, 88 2, 100 3.5 C 108 4.5, 115 4, 118 3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="opacity-15 dark:opacity-40"
        />
      </svg>
      {children}
    </div>
  )
}
