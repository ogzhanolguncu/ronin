import { queryOptions } from "@tanstack/react-query"
import { requester } from "../requester"
import { queryClient } from "./query-client"

export type Tag = {
  name: string
  count: number
}

type TagsResponse = {
  tags: Tag[]
}

export function tagsQueryOptions() {
  return queryOptions({
    queryKey: ["tags"] as const,
    queryFn: () => requester<TagsResponse>("/api/v1/tags").then((r) => r.tags),
    staleTime: Infinity,
  })
}

export function invalidateTags() {
  return queryClient.invalidateQueries({ queryKey: tagsQueryOptions().queryKey })
}
