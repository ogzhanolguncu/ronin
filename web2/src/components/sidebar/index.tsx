import { Button } from "@/components/ui/button";
import {
  ArchiveIcon,
  CircleDotIcon,
  GridIcon,
  PlusIcon,
  StarIcon,
} from "../ui/icons";
import { Header } from "./header";
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
    <aside className="bg-surface border-border flex h-full flex-col overflow-hidden border-r">
      <Header />
      <SidebarSection items={VIEW_ITEMS} />
      <Tags />
      <div className="border-border bg-surface shrink-0 border-t px-4 py-4">
        <Button className="w-full gap-1.5">
          <PlusIcon className="h-3 w-3" />
          Add bookmark
        </Button>
      </div>
    </aside>
  );
}
