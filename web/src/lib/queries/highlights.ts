import { queryOptions, useMutation } from "@tanstack/react-query"
import { requester } from "../requester"
import { queryClient } from "./query-client"
import type { Highlight, HighlightsResponse, ReadableContent, HighlightColor } from "../types"

export function readableContentQueryOptions(bookmarkId: number) {
  return queryOptions({
    queryKey: ["readableContent", bookmarkId] as const,
    queryFn: () =>
      requester<ReadableContent>(`/api/v1/assets/${bookmarkId}/readable/content`),
    staleTime: Infinity,
  })
}

export function highlightsQueryOptions(bookmarkId: number) {
  return queryOptions({
    queryKey: ["highlights", bookmarkId] as const,
    queryFn: () =>
      requester<HighlightsResponse>(`/api/v1/bookmarks/${bookmarkId}/highlights`).then(
        (r) => r.highlights,
      ),
  })
}

type CreateHighlightInput = {
  bookmark_id: number
  text: string
  note: string
  color: HighlightColor
  start_path: string
  start_offset: number
  end_path: string
  end_offset: number
}

export function useCreateHighlight() {
  return useMutation({
    mutationFn: ({ bookmark_id, ...body }: CreateHighlightInput) =>
      requester<Highlight>(`/api/v1/bookmarks/${bookmark_id}/highlights`, {
        method: "POST",
        body,
      }),
    onSettled: (_d, _e, variables) => {
      queryClient.invalidateQueries({ queryKey: ["highlights", variables.bookmark_id] })
    },
  })
}

type UpdateHighlightInput = {
  id: number
  bookmark_id: number
  note: string
  color: HighlightColor
}

export function useUpdateHighlight() {
  return useMutation({
    mutationFn: ({ id, note, color }: UpdateHighlightInput) =>
      requester<void>(`/api/v1/highlights/${id}`, {
        method: "PUT",
        body: { note, color },
      }),
    onSettled: (_d, _e, variables) => {
      queryClient.invalidateQueries({ queryKey: ["highlights", variables.bookmark_id] })
    },
  })
}

export function useDeleteHighlight() {
  return useMutation({
    mutationFn: ({ id }: { id: number; bookmark_id: number }) =>
      requester<void>(`/api/v1/highlights/${id}`, { method: "DELETE" }),
    onSettled: (_d, _e, variables) => {
      queryClient.invalidateQueries({ queryKey: ["highlights", variables.bookmark_id] })
    },
  })
}
