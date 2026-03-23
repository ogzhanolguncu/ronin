import {
  ArchiveIcon,
  CircleDotIcon,
  GridIcon,
  StarIcon,
} from "../ui/icons";
import type { NavItem } from "./types";
import { SidebarSection } from "./sidebar-section";
import { useQuery } from "@tanstack/react-query";
import { countsQueryOptions, type BookmarkCounts } from "@/lib/queries/counts";

function buildViewItems(counts?: BookmarkCounts): NavItem[] {
  return [
    { id: "all", label: "All bookmarks", icon: <GridIcon />, count: counts?.all },
    { id: "favorites", label: "Favorites", icon: <StarIcon />, count: counts?.favorites },
    { id: "unread", label: "Unread", icon: <CircleDotIcon />, count: counts?.unread },
    { id: "archived", label: "Archived", icon: <ArchiveIcon />, count: counts?.archived },
  ];
}

export function Views() {
  const { data: counts } = useQuery(countsQueryOptions());
  return <SidebarSection items={buildViewItems(counts)} />;
}
