import type { FallbackProps } from "react-error-boundary"
import { ApiError } from "@/lib/queries/query-client"
import { Button } from "@/components/ui/button"

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const is401 = error instanceof ApiError && error.status === 401

  return (
    <div
      className="flex flex-col items-center justify-center gap-4 p-8 text-center"
      role="alert"
    >
      <p className="text-sm font-medium text-destructive">
        {is401 ? "Session expired" : "Something went wrong"}
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">
        {error instanceof Error ? error.message : "An unexpected error occurred"}
      </p>
      <Button variant="ghost" size="sm" onClick={resetErrorBoundary}>
        Try again
      </Button>
    </div>
  )
}
