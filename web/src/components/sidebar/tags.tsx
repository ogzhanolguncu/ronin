import { useRef } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/format";
import { tagsQueryOptions, type Tag } from "@/lib/queries/tags";
import { urlState } from "@/lib/query-manager/url-state-instance";
import { useUrlState } from "@/lib/query-manager/use-url-state";
import { useScrollMist } from "@/hooks/use-scroll-mist";

export const Tags = () => {
  const { data: tags } = useSuspenseQuery(tagsQueryOptions());
  const activeTags = useUrlState((s) => s.tags);

  const handleTagClick = (tagName: string) => {
    const next = activeTags.includes(tagName)
      ? activeTags.filter((t) => t !== tagName)
      : [...activeTags, tagName];
    urlState.set({ tags: next });
  };

  if (tags.length === 0) {
    return (
      <div className="border-border-soft/30 flex min-h-0 flex-1 flex-col border-t">
        <div className="animate-in fade-in flex flex-1 flex-col items-center justify-center gap-3 px-4 py-8 duration-500">
          <span
            className="text-muted2/40 font-mono text-lg tracking-widest select-none"
            style={{ animation: "ink-breathe 3s ease-in-out infinite" }}
          >
            #
          </span>
          <p className="text-muted2/50 font-mono text-[11px] font-light tracking-wide">
            no tags yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <TagsList tags={tags} activeTags={activeTags} onTagClick={handleTagClick} />
  );
};

function TagsList({
  tags,
  activeTags,
  onTagClick,
}: {
  tags: Tag[];
  activeTags: string[];
  onTagClick: (name: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollMist(scrollRef);

  return (
    <div className="border-border-soft/30 flex min-h-0 flex-1 flex-col border-t">
      <div
        ref={scrollRef}
        className="thin-scrollbar content-scroll-mist overflow-y-auto py-3 font-mono"
      >
        <div className="flex flex-col">
          {tags.map((tag) => {
            const isActive = activeTags.includes(tag.name);
            return (
              <button
                key={tag.name}
                type="button"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-xs transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted2 hover:bg-surface2 hover:text-text2",
                )}
                onClick={() => onTagClick(tag.name)}
              >
                #{tag.name}
                <span
                  className={cn(
                    "ml-auto text-[11px] tabular-nums transition-colors",
                    isActive ? "text-primary/60" : "text-muted-foreground",
                  )}
                >
                  {formatCount(tag.count)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
