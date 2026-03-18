import { cn } from "@/lib/utils";
import { useState } from "react";
import { getCollectionColor } from "@/lib/colors";
import { AddCollectionDialog } from "@/components/sidebar/add-collection-dialog";

export const MOCK_COLLECTIONS = [
  { id: 1, name: "Reading list", slug: "reading-list", colorId: 1 },
  { id: 2, name: "Design refs", slug: "design-refs", colorId: 2 },
  { id: 3, name: "Work resources", slug: "work-resources", colorId: 3 },
] as const;

export function Collections() {
  const [activeId, setActiveId] = useState<number | null>(null);

  return (
    <div className="shrink-0 border-t border-border-soft/50 pt-3 pb-3">
      <div className="flex flex-col gap-px">
        {MOCK_COLLECTIONS.map((collection) => (
          <button
            key={collection.id}
            type="button"
            className={cn(
              "flex items-center gap-2.5 px-4 py-1.5 text-xs transition-colors  font-mono",
              activeId === collection.id
                ? "text-primary"
                : "text-muted2 hover:bg-surface2 hover:text-text2",
            )}
            onClick={() =>
              setActiveId((prev) =>
                prev === collection.id ? null : collection.id,
              )
            }
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: getCollectionColor(collection.colorId)?.value }}
            />
            {collection.name}
          </button>
        ))}
        <AddCollectionDialog />
      </div>
    </div>
  );
}
