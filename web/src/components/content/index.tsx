import { useRef, useState } from "react";
import { BookmarkList, ITEMS_PER_PAGE, MOCK_BOOKMARKS_COUNT } from "./bookmark-list";
import { Pagination } from "./pagination";
import { ContentToolbar } from "./toolbar";

export function Content() {
  const [currentPage, setCurrentPage] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.ceil(MOCK_BOOKMARKS_COUNT / ITEMS_PER_PAGE);

  function handlePageChange(page: number) {
    setCurrentPage(page);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="flex h-full flex-col overflow-hidden">
      <ContentToolbar />
      <div ref={scrollRef} className="flex-1 overflow-y-auto thin-scrollbar content-scroll-mist">
        <BookmarkList currentPage={currentPage} />
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </main>
  );
}
