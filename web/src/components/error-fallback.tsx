import type { FallbackProps } from "react-error-boundary"
import { ApiError } from "@/lib/queries/query-client"
import { Button } from "@/components/ui/button"
import { Interlude } from "@/components/interlude"

function getErrorInfo(error: unknown) {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401: return { title: "Session expired", action: "Sign in" }
      case 403: return { title: "Access denied", action: "Try again" }
      case 404: return { title: "Not found", action: "Go back" }
      case 408: return { title: "Request timed out", action: "Try again" }
      case 429: return { title: "Too many requests", action: "Try again" }
      case 500: return { title: "Server error", action: "Try again" }
      case 502: return { title: "Server unreachable", action: "Try again" }
      case 503: return { title: "Service unavailable", action: "Try again" }
      default:  return { title: "Request failed", action: "Try again" }
    }
  }
  if (error instanceof Error && error.message === "Failed to fetch") {
    return { title: "Connection lost", action: "Try again" }
  }
  return { title: "Something broke", action: "Try again" }
}

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const { title, action } = getErrorInfo(error)

  return (
    <Interlude title={title}>
      <Button
        variant="ghost"
        size="sm"
        onClick={resetErrorBoundary}
        className="font-mono text-xs tracking-wide"
      >
        {action}
      </Button>
    </Interlude>
  )
}
