import { useRef } from "react";
import { BookmarkList } from "./bookmark-list";
import { ContentToolbar } from "./toolbar";
import { QueryBoundary } from "../query-boundary";
import { useScrollMist } from "@/hooks/use-scroll-mist";

export function Content({
  onOpenReader,
}: {
  onOpenReader: (id: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollMist(scrollRef);

  return (
    <main className="flex h-full flex-col overflow-hidden">
      <ContentToolbar />
      <div
        ref={scrollRef}
        className="thin-scrollbar content-scroll-mist flex-1 overflow-y-auto"
      >
        <QueryBoundary>
          <BookmarkList scrollRef={scrollRef} onOpenReader={onOpenReader} />
        </QueryBoundary>
      </div>
    </main>
  );
}
