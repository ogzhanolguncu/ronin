import { useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { getCollectionColor, type CollectionColorId } from "@/lib/colors";
import { AddCollectionDialog } from "@/components/sidebar/add-collection-dialog";
import { urlState } from "@/lib/query-manager/url-state-instance";
import { useUrlState } from "@/lib/query-manager/use-url-state";
import { collectionsQueryOptions } from "@/lib/queries/collections";

export function Collections() {
  const collection = useUrlState((s) => s.collection);
  const { data: collections } = useSuspenseQuery(collectionsQueryOptions());
  const isEmpty = collections.length === 0;

  return (
    <div className={cn(
      "shrink-0 min-h-0 flex flex-col border-t border-border-soft/30 transition-[max-height] duration-500 ease-in-out",
      isEmpty ? "max-h-13" : "max-h-[350px]",
    )}>
      <div className="thin-scrollbar overflow-y-auto content-scroll-mist py-3">
        <div className="flex flex-col">
          <AddCollectionDialog />
          {collections.map((item) => {
            const isActive = collection === item.slug;
            const color = getCollectionColor(item.color_id as CollectionColorId);
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
                  style={{ backgroundColor: color?.value, color: color?.value }}
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
