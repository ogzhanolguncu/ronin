import { Header } from "./header";
import { Collections } from "./collections";
import { Tags } from "./tags";
import { Views } from "./views";
import { AddBookmarkDialog } from "./add-bookmark-dialog";
import { QueryBoundary } from "../query-boundary";

export function Sidebar({ onLogout }: { onLogout: () => void }) {
  return (
    <aside className="paper-grain bg-surface border-border-soft/60 sidebar-edge relative flex h-full flex-col overflow-hidden border-r">
      <Header onLogout={onLogout} />
      <Views />
      <Collections />
      <QueryBoundary>
        <Tags />
      </QueryBoundary>
      <div className="border-border-soft shrink-0 border-t px-4 py-4">
        <AddBookmarkDialog />
      </div>
    </aside>
  );
}
