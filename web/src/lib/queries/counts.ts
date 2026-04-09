import { queryOptions } from "@tanstack/react-query";
import { requester } from "../requester";
import { queryClient } from "./query-client";

export type BookmarkCounts = {
  all: number;
  favorites: number;
  unread: number;
  archived: number;
};

type BookmarkCountsResponse = {
  counts: BookmarkCounts;
};

export function countsQueryOptions() {
  return queryOptions({
    queryKey: ["bookmarkCounts"] as const,
    queryFn: () =>
      requester<BookmarkCountsResponse>("/api/v1/bookmarks/counts").then(
        (r) => r.counts,
      ),
  });
}

export function invalidateCounts() {
  return queryClient.invalidateQueries({
    queryKey: countsQueryOptions().queryKey,
  });
}
