import { queryOptions, useMutation } from "@tanstack/react-query"
import { requester } from "../requester"
import { queryClient } from "./query-client"
import { countsQueryOptions, type BookmarkCounts } from "./counts"
import { tagsQueryOptions, type Tag } from "./tags"
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

function buildSearchParams(filters: BookmarkFilters): URLSearchParams {
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

  return params
}

export function bookmarksQueryOptions(filters: BookmarkFilters) {
  const isSearch = filters.q !== ""
  const params = buildSearchParams(filters)

  if (isSearch) {
    params.set("q", filters.q)
  }

  const endpoint = isSearch ? "/api/v1/bookmarks/search" : "/api/v1/bookmarks"

  return queryOptions({
    queryKey: ["bookmarks", filters] as const,
    queryFn: () =>
      requester<ListBookmarksResponse>(endpoint, { params }),
  })
}

export function invalidateBookmarks() {
  return queryClient.invalidateQueries({ queryKey: ["bookmarks"] })
}

type CreateBookmarkInput = {
  url: string
  title: string
  description: string
  notes: string
  tags: string
  favorite: boolean
  collection_id: number | null
}

export function useCreateBookmark() {
  return useMutation({
    mutationFn: (input: CreateBookmarkInput) =>
      requester<{ id: number }>("/api/v1/bookmarks", {
        method: "POST",
        body: input,
      }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: countsQueryOptions().queryKey })
      await queryClient.cancelQueries({ queryKey: tagsQueryOptions().queryKey })

      const prevCounts = queryClient.getQueryData<BookmarkCounts>(countsQueryOptions().queryKey)
      const prevTags = queryClient.getQueryData<Tag[]>(tagsQueryOptions().queryKey)

      if (prevCounts) {
        queryClient.setQueryData<BookmarkCounts>(countsQueryOptions().queryKey, {
          ...prevCounts,
          all: prevCounts.all + 1,
          unread: prevCounts.unread + 1,
          ...(input.favorite ? { favorites: prevCounts.favorites + 1 } : {}),
        })
      }

      if (prevTags && input.tags) {
        const newTagNames = input.tags.split(" ").filter(Boolean)
        const existingNames = new Set(prevTags.map((t) => t.name))
        const additions = newTagNames
          .filter((name) => !existingNames.has(name))
          .map((name) => ({ name, count: 1 }))
        if (additions.length > 0) {
          queryClient.setQueryData<Tag[]>(tagsQueryOptions().queryKey, [...prevTags, ...additions])
        }
      }

      return { prevCounts, prevTags }
    },
    onError: (_err, _input, context) => {
      if (context?.prevCounts) {
        queryClient.setQueryData(countsQueryOptions().queryKey, context.prevCounts)
      }
      if (context?.prevTags) {
        queryClient.setQueryData(tagsQueryOptions().queryKey, context.prevTags)
      }
    },
    onSettled: () => {
      invalidateBookmarks()
      queryClient.invalidateQueries({ queryKey: countsQueryOptions().queryKey })
      queryClient.invalidateQueries({ queryKey: tagsQueryOptions().queryKey })
    },
  })
}
