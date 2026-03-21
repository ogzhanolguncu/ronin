import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { ErrorBoundary } from "react-error-boundary"
import { queryClient } from "./lib/query-client"
import { tagsQueryOptions } from "./lib/tags"
import { ErrorFallback } from "./components/error-fallback"
import "./index.css"
import App from "./App.tsx"

const persister = createAsyncStoragePersister({
  storage: window.localStorage,
})

// Seed tag cache — from server-injected data or API fetch
if (window.__TAGS__) {
  queryClient.setQueryData(tagsQueryOptions().queryKey, window.__TAGS__)
} else if (import.meta.env.DEV) {
  queryClient.prefetchQuery(tagsQueryOptions())
}

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}
    >
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <App />
      </ErrorBoundary>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </PersistQueryClientProvider>
  </StrictMode>,
)
