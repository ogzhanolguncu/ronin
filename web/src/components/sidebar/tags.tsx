import { cn } from "@/lib/utils";
import { useUrlState } from "@/hooks/use-url-state";
import { urlState } from "@/lib/url-state-instance";

const tags = [
  { name: "design", count: 14 },
  { name: "dev", count: 38 },
  { name: "inspiration", count: 7 },
  { name: "reading", count: 23 },
  { name: "tools", count: 11 },
  { name: "reference", count: 5 },
  { name: "later", count: 19 },
  { name: "work", count: 42 },
  { name: "personal", count: 9 },
  { name: "research", count: 16 },
  { name: "bookmarks", count: 31 },
  { name: "archive", count: 8 },
  { name: "tutorials", count: 12 },
  { name: "photography", count: 6 },
  { name: "music", count: 15 },
  { name: "recipes", count: 21 },
  { name: "travel", count: 4 },
  { name: "finance", count: 17 },
  { name: "health", count: 10 },
  { name: "writing", count: 13 },
  { name: "videos", count: 27 },
  { name: "podcasts", count: 8 },
  { name: "quotes", count: 34 },
  { name: "freelance", count: 3 },
  { name: "ux", count: 20 },
];

export const Tags = () => {
  const activeTags = useUrlState((s) => s.tags);

  const handleTagClick = (tagName: string) => {
    const next = activeTags.includes(tagName)
      ? activeTags.filter((t) => t !== tagName)
      : [...activeTags, tagName];
    urlState.set({ tags: next });
  };

  return (
    <div className="border-t border-border-soft/30 min-h-0 flex-1 flex flex-col">
      <div className="thin-scrollbar overflow-y-auto content-scroll-mist font-mono py-3">
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
                onClick={() => handleTagClick(tag.name)}
              >
                #{tag.name}
                <span className={cn(
                  "ml-auto text-[11px] transition-colors tabular-nums",
                  isActive
                    ? "text-primary/60"
                    : "text-muted-foreground",
                )}>
                  {tag.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
