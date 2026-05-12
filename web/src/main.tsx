/* eslint-disable react-refresh/only-export-components --
   Entry point: this module bootstraps the app and is never hot-reloaded itself,
   so the fast-refresh rule's component-only constraint doesn't apply. */
import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { ErrorBoundary } from "react-error-boundary";

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-query-devtools").then((m) => ({
        default: m.ReactQueryDevtools,
      })),
    )
  : () => null;
import { queryClient } from "./lib/queries/query-client.ts";
import { tagsQueryOptions } from "./lib/queries/tags.ts";
import { collectionsQueryOptions } from "./lib/queries/collections.ts";
import { bookmarksQueryOptions } from "./lib/queries/bookmarks.ts";
import { ErrorFallback } from "./components/error-fallback";
import "./index.css";
import { Router } from "./lib/routes.tsx";

const persister = createAsyncStoragePersister({
  storage: window.localStorage,
});

// Seed TAGS from backend during initial render similar to SSG
if (window.__TAGS__) {
  queryClient.setQueryData(tagsQueryOptions().queryKey, window.__TAGS__);
} else if (import.meta.env.DEV) {
  queryClient.prefetchQuery(tagsQueryOptions());
}

// Seed COLLECTIONS from backend during initial render similar to SSG
if (window.__COLLECTIONS__) {
  queryClient.setQueryData(
    collectionsQueryOptions().queryKey,
    window.__COLLECTIONS__,
  );
} else if (import.meta.env.DEV) {
  queryClient.prefetchQuery(collectionsQueryOptions());
}

if (window.__AUTH__ === "authenticated") {
  queryClient.prefetchQuery(
    bookmarksQueryOptions({
      q: "",
      tags: [],
      domains: [],
      view: "all",
      sort: "newest",
      collection: null,
      page: 1,
    }),
  );
}

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}
    >
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Router />
      </ErrorBoundary>
      <Suspense>
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      </Suspense>
    </PersistQueryClientProvider>
  </StrictMode>,
);
