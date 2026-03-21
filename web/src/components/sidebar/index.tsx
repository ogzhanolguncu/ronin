import {
  ArchiveIcon,
  CircleDotIcon,
  GridIcon,
  StarIcon,
} from "../ui/icons";
import { Header } from "./header";
import { Collections } from "./collections";
import { Tags } from "./tags";
import type { NavItem } from "./types";
import { SidebarSection } from "./sidebar-section";
import { AddBookmarkDialog } from "./add-bookmark-dialog";
import { QueryBoundary } from "../query-boundary";

const VIEW_ITEMS: NavItem[] = [
  { id: "all", label: "All bookmarks", icon: <GridIcon />, count: 50 },
  { id: "favorites", label: "Favorites", icon: <StarIcon /> },
  { id: "unread", label: "Unread", icon: <CircleDotIcon />, count: 12 },
  { id: "archived", label: "Archived", icon: <ArchiveIcon />, count: 5 },
];

export function Sidebar({ onLogout }: { onLogout: () => void }) {
  return (
    <aside className="paper-grain bg-surface border-border-soft/60 relative flex h-full flex-col overflow-hidden border-r sidebar-edge" >
      <Header onLogout={onLogout} />
      <SidebarSection items={VIEW_ITEMS} />
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
