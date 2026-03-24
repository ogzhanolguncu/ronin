import { queryOptions, useMutation } from "@tanstack/react-query"
import { requester } from "../requester"
import { queryClient } from "./query-client"
import { countsQueryOptions, type BookmarkCounts } from "./counts"
import { tagsQueryOptions, type Tag } from "./tags"
import type { Bookmark, ListBookmarksResponse } from "../types"

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
  else params.set("archived", "0")
  if (filters.view === "unread") params.set("unread", "1")
  if (filters.collection) params.set("collection", filters.collection)
  if (filters.tags.length) params.set("tags", filters.tags.join(","))
  if (filters.domains.length) params.set("domains", filters.domains.join(","))

  return params
}

export function bookmarksQueryOptions(filters: BookmarkFilters) {
  const params = buildSearchParams(filters)

  if (filters.q) {
    params.set("q", filters.q)
  }

  return queryOptions({
    queryKey: ["bookmarks", filters] as const,
    queryFn: () =>
      requester<ListBookmarksResponse>("/api/v1/bookmarks", { params }),
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
      requester<Bookmark>("/api/v1/bookmarks", {
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

export function useRegenerateAssets() {
  return useMutation({
    mutationFn: (id: number) =>
      requester<{ status: string }>(`/api/v1/assets/${id}/regenerate`, {
        method: "POST",
      }),
    onSettled: () => invalidateBookmarks(),
  })
}

// TODO: Move those to single mutations. Bulk is causing overhead
export function useReadBookmark() {
  return useMutation({
    mutationKey: ["readBookmark"],
    mutationFn: ({ id, read }: { id: number; read: boolean }) =>
      requester<void>("/api/v1/bookmarks/read", {
        method: "PATCH",
        body: { ids_read: [{ id, read }] },
      }),
    onSettled: (_d, _e, _v, _r, context) =>
      Promise.all([
        context.client.invalidateQueries({ queryKey: ["bookmarks"] }),
        context.client.invalidateQueries({ queryKey: countsQueryOptions().queryKey }),
      ]),
  })
}

export function useDeleteBookmark() {
  return useMutation({
    mutationKey: ["deleteBookmark"],
    mutationFn: (id: number) =>
      requester<void>(`/api/v1/bookmarks/${id}`, { method: "DELETE" }),
    onSettled: (_d, _e, _v, _r, context) =>
      Promise.all([
        context.client.invalidateQueries({ queryKey: ["bookmarks"] }),
        context.client.invalidateQueries({ queryKey: countsQueryOptions().queryKey }),
        context.client.invalidateQueries({ queryKey: tagsQueryOptions().queryKey }),
      ]),
  })
}

// TODO: Move those to single mutations. Bulk is causing overhead
export function useArchiveBookmark() {
  return useMutation({
    mutationKey: ["archiveBookmark"],
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
      requester<void>("/api/v1/bookmarks/archive", {
        method: "PATCH",
        body: { ids_archived: [{ id, archived }] },
      }),
    onSettled: (_d, _e, _v, _r, context) =>
      Promise.all([
        context.client.invalidateQueries({ queryKey: ["bookmarks"] }),
        context.client.invalidateQueries({ queryKey: countsQueryOptions().queryKey }),
      ]),
  })
}


// TODO: Move those to single mutations. Bulk is causing overhead
export function useFavoriteBookmark() {
  return useMutation({
    mutationKey: ["favoriteBookmark"],
    mutationFn: ({ id, favorite }: { id: number; favorite: boolean }) =>
      requester<void>("/api/v1/bookmarks/favorite", {
        method: "PATCH",
        body: { ids_favorite: [{ id, favorite }] },
      }),
    onSettled: (_d, _e, _v, _r, context) =>
      Promise.all([
        context.client.invalidateQueries({ queryKey: ["bookmarks"] }),
        context.client.invalidateQueries({ queryKey: countsQueryOptions().queryKey }),
      ]),
  })
}
