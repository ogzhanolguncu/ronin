import type { FallbackProps } from "react-error-boundary"
import { ApiError } from "@/lib/queries/query-client"
import { Button } from "@/components/ui/button"

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const is401 = error instanceof ApiError && error.status === 401

  return (
    <div
      className="flex flex-col items-center justify-center gap-5 p-12 text-center"
      role="alert"
    >
      <p className="text-xs font-mono tracking-wide text-muted2">
        {is401 ? "Session expired" : "Something went wrong"}
      </p>
      <div className="h-px w-12 bg-gradient-to-r from-transparent via-border to-transparent" />
      <p className="max-w-xs text-xs text-muted2/60 font-mono font-light leading-relaxed">
        {error instanceof Error ? error.message : "An unexpected error occurred"}
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={resetErrorBoundary}
        className="font-mono text-xs tracking-wide"
      >
        {is401 ? "Sign in" : "Try again"}
      </Button>
    </div>
  )
}
