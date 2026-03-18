import { cn } from "@/lib/utils";
import { PlusIcon } from "@/components/ui/icons";
import { useState } from "react";

export const MOCK_COLLECTIONS = [
  { id: 1, name: "Reading list", color: "oklch(0.55 0.14 30)" },
  { id: 2, name: "Design refs", color: "oklch(0.42 0.08 255)" },
  { id: 3, name: "Work resources", color: "oklch(0.55 0.16 145)" },
];

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
              style={{ backgroundColor: collection.color }}
            />
            {collection.name}
          </button>
        ))}
        <button
          type="button"
          className="flex items-center gap-2.5 px-4 py-1.5 text-xs text-muted2/40 transition-colors hover:text-muted2"
        >
          <PlusIcon className="h-3 w-3" />
          New collection
        </button>
      </div>
    </div>
  );
}
