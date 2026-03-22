import { queryOptions } from "@tanstack/react-query"
import { requester } from "../requester"
import { queryClient } from "./query-client"
import type { ListBookmarksResponse } from "../types"

export const ITEMS_PER_PAGE = 20

export type BookmarkFilters = {
  q: string
  tags: string[]
  domains: string[]
  view: string
  sort: string
  collection: string | null
  page: number
}

function buildSearchParams(filters: BookmarkFilters): string {
  const params = new URLSearchParams()
  params.set("page", String(filters.page))
  params.set("limit", String(ITEMS_PER_PAGE))
  params.set("sort", filters.sort)

  if (filters.view === "favorites") params.set("favorite", "1")
  if (filters.view === "archived") params.set("archived", "1")
  if (filters.view === "unread") params.set("unread", "1")
  if (filters.collection) params.set("collection", filters.collection)
  if (filters.tags.length) params.set("tags", filters.tags.join(","))
  if (filters.domains.length) params.set("domains", filters.domains.join(","))

  return params.toString()
}

export function bookmarksQueryOptions(filters: BookmarkFilters) {
  const isSearch = filters.q !== ""
  const params = new URLSearchParams(buildSearchParams(filters))

  if (isSearch) {
    params.set("q", filters.q)
  }

  const endpoint = isSearch ? "/api/v1/bookmarks/search" : "/api/v1/bookmarks"

  return queryOptions({
    queryKey: ["bookmarks", filters] as const,
    queryFn: () =>
      requester<ListBookmarksResponse>(`${endpoint}?${params.toString()}`),
  })
}

export function invalidateBookmarks() {
  return queryClient.invalidateQueries({ queryKey: ["bookmarks"] })
}
