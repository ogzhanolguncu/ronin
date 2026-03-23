import {
  ArchiveIcon,
  CircleDotIcon,
  GridIcon,
  StarIcon,
} from "../ui/icons";
import type { NavItem } from "./types";
import { SidebarSection } from "./sidebar-section";
import { useSuspenseQuery } from "@tanstack/react-query";
import { countsQueryOptions, type BookmarkCounts } from "@/lib/queries/counts";

function buildViewItems(counts: BookmarkCounts): NavItem[] {
  return [
    { id: "all", label: "All bookmarks", icon: <GridIcon />, count: counts.all },
    { id: "favorites", label: "Favorites", icon: <StarIcon />, count: counts.favorites },
    { id: "unread", label: "Unread", icon: <CircleDotIcon />, count: counts.unread },
    { id: "archived", label: "Archived", icon: <ArchiveIcon />, count: counts.archived },
  ];
}

export function ViewsFallback() {
  return (
    <>
      <style>{`
        @keyframes stamp-press {
          0%, 100% { transform: translateY(0); box-shadow: 0 0 3px oklch(0.55 0.14 30 / 0.3); }
          40%, 60% { transform: translateY(3px); box-shadow: 0 0 8px oklch(0.55 0.14 30 / 0.6); }
        }
      `}</style>
      <div className="shrink-0 py-3 flex items-center justify-center h-42.5">
        <div className="flex items-center gap-2.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block size-1.5 rounded-[1px] bg-shu"
              style={{
                animation: "stamp-press 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite",
                animationDelay: `${i * 300}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export function Views() {
  const { data: counts } = useSuspenseQuery(countsQueryOptions());
  return <SidebarSection items={buildViewItems(counts)} />;
}
