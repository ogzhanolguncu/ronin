import { useRef } from "react";
import { BookmarkList } from "./bookmark-list";
import { ContentToolbar } from "./toolbar";
import { QueryBoundary } from "../query-boundary";

export function Content() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <main className="flex h-full flex-col overflow-hidden">
      <ContentToolbar />
      <div ref={scrollRef} className="flex-1 overflow-y-auto thin-scrollbar content-scroll-mist">
        <QueryBoundary >
          <BookmarkList scrollRef={scrollRef} />
        </QueryBoundary>
      </div>
    </main >
  );
}
