import { queryOptions } from "@tanstack/react-query"
import { requester } from "../requester"
import { queryClient } from "./query-client"
import type { CollectionsResponse } from "../types"

export function collectionsQueryOptions() {
  return queryOptions({
    queryKey: ["collections"] as const,
    queryFn: () =>
      requester<CollectionsResponse>("/api/v1/collections").then(
        (r) => r.collections,
      ),
    staleTime: Infinity,
  })
}

export function invalidateCollections() {
  return queryClient.invalidateQueries({ queryKey: ["collections"] })
}
