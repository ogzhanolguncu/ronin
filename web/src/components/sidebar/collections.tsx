import { cn } from "@/lib/utils";
import { getCollectionColor } from "@/lib/colors";
import { useUrlState } from "@/hooks/use-url-state";
import { urlState } from "@/lib/url-state-instance";
import { AddCollectionDialog } from "@/components/sidebar/add-collection-dialog";

export const MOCK_COLLECTIONS = [
  { id: 1, name: "Reading list", slug: "reading-list", colorId: 1 },
  { id: 2, name: "Design refs", slug: "design-refs", colorId: 2 },
  { id: 3, name: "Work resources", slug: "work-resources", colorId: 3 },
  { id: 4, name: "Side projects", slug: "side-projects", colorId: 4 },
  { id: 5, name: "Recipes", slug: "recipes", colorId: 5 },
  { id: 6, name: "Travel plans", slug: "travel-plans", colorId: 6 },
  { id: 7, name: "Music finds", slug: "music-finds", colorId: 7 },
  { id: 8, name: "Gift ideas", slug: "gift-ideas", colorId: 8 },
  { id: 9, name: "Architecture", slug: "architecture", colorId: 9 },
  { id: 10, name: "Film watchlist", slug: "film-watchlist", colorId: 10 },
] as const;

export function Collections() {
  const collection = useUrlState((s) => s.collection);

  return (
    <div className="shrink-0 max-h-[350px] min-h-0 flex flex-col border-t border-border-soft/30">
      <div className="thin-scrollbar overflow-y-auto content-scroll-mist py-3">
        <div className="flex flex-col">
          <AddCollectionDialog />
          {MOCK_COLLECTIONS.map((item) => {
            const isActive = collection === item.slug;
            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2 text-xs transition-colors font-mono",
                  isActive
                    ? "text-primary"
                    : "text-muted2 hover:bg-surface2 hover:text-text2",
                )}
                onClick={() =>
                  urlState.set({ collection: isActive ? null : item.slug })
                }
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full dot-glow"
                  style={{ backgroundColor: getCollectionColor(item.colorId)?.value, color: getCollectionColor(item.colorId)?.value }}
                />
                {item.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
