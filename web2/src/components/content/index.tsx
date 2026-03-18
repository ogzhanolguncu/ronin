import { BookmarkList } from "./bookmark-list";
import { ContentToolbar } from "./toolbar";

export function Content() {
  return (
    <main className="flex h-full flex-col overflow-hidden">
      <ContentToolbar />
      <div className="flex-1 overflow-y-auto thin-scrollbar content-scroll-mist">
        <BookmarkList />
      </div>
    </main>
  );
}
