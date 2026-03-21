import { Suspense, type ReactNode } from "react"
import { ErrorBoundary, type FallbackProps } from "react-error-boundary"
import { ErrorFallback } from "./error-fallback"
import { SuspenseFallback } from "./suspense-fallback"

type QueryBoundaryProps = {
  children: ReactNode
  loadingFallback?: ReactNode
  errorFallback?: (props: FallbackProps) => ReactNode
  resetKeys?: unknown[]
}

export function QueryBoundary({
  children,
  loadingFallback,
  errorFallback,
  resetKeys,
}: QueryBoundaryProps) {
  const errorBoundaryProps = errorFallback
    ? { fallbackRender: errorFallback, resetKeys }
    : { FallbackComponent: ErrorFallback, resetKeys }

  return (
    <ErrorBoundary {...errorBoundaryProps}>
      <Suspense fallback={loadingFallback ?? <SuspenseFallback />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}
