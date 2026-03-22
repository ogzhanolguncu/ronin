import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Dialog as DialogPrimitive } from "radix-ui";
import { BookmarkItem } from "./bookmark-item";
import { BookmarkDetails } from "./bookmark-details";
import { Pagination } from "./pagination";
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { urlState } from "@/lib/query-manager/url-state-instance";
import { useUrlState } from "@/lib/query-manager/use-url-state";
import { bookmarksQueryOptions, type BookmarkFilters } from "@/lib/queries/bookmarks";
import type { Bookmark } from "@/lib/types";
import { Interlude } from "@/components/interlude";

function useBookmarkFilters(): BookmarkFilters {
  const [s] = useUrlState();
  return { q: s.q, tags: s.tags, domains: s.domains, view: s.view, sort: s.sort, collection: s.collection, page: s.page };
}

export function BookmarkList({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const filters = useBookmarkFilters();
  const { data } = useSuspenseQuery(bookmarksQueryOptions(filters));

  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const bookmarks = data.bookmarks ?? [];
  const meta = data.meta;

  function handleViewClick(bookmark: Bookmark) {
    setSelectedBookmark(bookmark);
    setDetailOpen(true);
  }

  function handleDetailOpenChange(open: boolean) {
    setDetailOpen(open);
    if (!open) {
      setTimeout(() => setSelectedBookmark(null), 200);
    }
  }

  function handlePageChange(n: number) {
    urlState.set({ page: n }, { replace: true });
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (bookmarks.length === 0 && meta.page === 1) {
    return (
      <Interlude title="The path is clear">
        <p className="text-sm text-muted2 font-mono font-light">
          Save your first bookmark to leave a mark
        </p>
      </Interlude>
    );
  }

  return (
    <>
      <div>
        {bookmarks.map((bookmark) => (
          <BookmarkItem
            key={bookmark.id}
            bookmark={bookmark}
            onTagClick={(tag) => urlState.set((prev) => ({
              tags: prev.tags.includes(tag)
                ? prev.tags.filter((t) => t !== tag)
                : [...prev.tags, tag],
              page: 1,
            }))}
            onViewClick={handleViewClick}
          />
        ))}
      </div>
      <Pagination
        currentPage={meta.page}
        totalPages={meta.total_pages}
        onPageChange={handlePageChange}
      />
      <DialogPrimitive.Root open={detailOpen} onOpenChange={handleDetailOpenChange}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            data-slot="dialog-content"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[440px] bg-background rounded-xl ring-1 ring-foreground/8 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-1 duration-200 ease-out"
          >
            {selectedBookmark && <BookmarkDetails bookmark={selectedBookmark} />}
          </DialogPrimitive.Content>
        </DialogPortal>
      </DialogPrimitive.Root>
    </>
  );
}
