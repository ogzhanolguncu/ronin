import { useRef } from "react";
import { BookmarkList, ITEMS_PER_PAGE, MOCK_BOOKMARKS_COUNT } from "./bookmark-list";
import { Pagination } from "./pagination";
import { ContentToolbar } from "./toolbar";
import { QueryBoundary } from "../query-boundary";
import { BookmarkListSkeleton } from "./bookmark-skeleton";
import { urlState } from "@/lib/query-manager/url-state-instance";
import { useUrlState } from "@/lib/query-manager/use-url-state";

export function Content() {
  const page = useUrlState((s) => s.page);
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.ceil(MOCK_BOOKMARKS_COUNT / ITEMS_PER_PAGE);

  function handlePageChange(n: number) {
    urlState.set({ page: n }, { replace: true });
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="flex h-full flex-col overflow-hidden">
      <ContentToolbar />
      <div ref={scrollRef} className="flex-1 overflow-y-auto thin-scrollbar content-scroll-mist">
        <QueryBoundary loadingFallback={<BookmarkListSkeleton />}>
          <BookmarkList currentPage={page} />
        </QueryBoundary>
      </div>
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </main>
  );
}
