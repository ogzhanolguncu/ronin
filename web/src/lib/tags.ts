import { queryClient } from "./query-client"

export const tagKeys = { all: ["tags"] as const }

export function getTagsQueryOptions() {
  return {
    queryKey: tagKeys.all,
    queryFn: async (): Promise<string[]> => {
      const res = await fetch("/api/v1/tags")
      if (!res.ok) throw new Error("Failed to fetch tags")
      const data = await res.json()
      window.__TAGS__ = data.tags
      return data.tags
    },
    initialData: () => window.__TAGS__,
    staleTime: Infinity,
  }
}

export function invalidateTags() {
  return queryClient.invalidateQueries({ queryKey: tagKeys.all })
}
