import { queryOptions } from "@tanstack/react-query"
import { requester } from "../requester"
import { queryClient } from "./query-client"
import type { Collection } from "../types"

export function collectionsQueryOptions() {
  return queryOptions({
    queryKey: ["collections"] as const,
    queryFn: () => requester<Collection[]>("/api/v1/collections"),
    staleTime: Infinity,
  })
}

export function invalidateCollections() {
  return queryClient.invalidateQueries({ queryKey: ["collections"] })
}
