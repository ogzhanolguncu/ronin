import { Button } from "@/components/ui/button";
import {
  ArchiveIcon,
  CircleDotIcon,
  GridIcon,
  PlusIcon,
  StarIcon,
} from "../ui/icons";
import { Header } from "./header";
import { Collections } from "./collections";
import { Tags } from "./tags";
import type { NavItem } from "./types";
import { SidebarSection } from "./sidebar-section";

const VIEW_ITEMS: NavItem[] = [
  { id: "all", label: "All bookmarks", icon: <GridIcon />, count: 50 },
  { id: "favorites", label: "Favorites", icon: <StarIcon /> },
  { id: "unread", label: "Unread", icon: <CircleDotIcon />, count: 12 },
  { id: "archived", label: "Archived", icon: <ArchiveIcon />, count: 5 },
];

export function Sidebar() {
  return (
    <aside className="paper-grain bg-surface border-border-soft relative flex h-full flex-col overflow-hidden border-r">
      <Header />
      <SidebarSection items={VIEW_ITEMS} />
      <Collections />
      <Tags />
      <div className="shrink-0 border-t border-border-soft/50 px-4 py-3">
        <button
          type="button"
          className="flex items-center gap-2.5 text-xs text-muted2/40 transition-colors hover:text-muted2"
        >
          <PlusIcon className="h-3 w-3" />
          Add bookmark
        </button>
      </div>
    </aside>
  );
}
