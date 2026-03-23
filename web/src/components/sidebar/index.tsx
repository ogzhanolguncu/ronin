import { Header } from "./header";
import { Collections } from "./collections";
import { Tags } from "./tags";
import { Views, ViewsFallback } from "./views";
import { AddBookmarkDialog } from "./add-bookmark-dialog";
import { QueryBoundary } from "../query-boundary";

export function Sidebar({ onLogout }: { onLogout: () => void }) {
  return (
    <aside className="paper-grain bg-surface border-border-soft/60 relative flex h-full flex-col overflow-hidden border-r sidebar-edge">
      <Header onLogout={onLogout} />
      <QueryBoundary loadingFallback={<ViewsFallback />}>
        <Views />
      </QueryBoundary>
      <Collections />
      <QueryBoundary>
        <Tags />
      </QueryBoundary>
      <div className="shrink-0 border-t border-border-soft px-4 py-4">
        <AddBookmarkDialog />
      </div>
    </aside>
  );
}
