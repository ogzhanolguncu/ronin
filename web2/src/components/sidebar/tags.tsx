import { cn } from "@/lib/utils";
import { useState } from "react";

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
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const handleTagClick = (tag: string) => {
    setActiveTag((prev) => (prev === tag ? null : tag));
  };


  return (
    <div className="tags-scroll thin-scrollbar shrink-0 border-t border-border-soft/50 pt-3 pb-3 min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-px">
        {tags.map((tag) => (
          <button
            key={tag.name}
            type="button"
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 text-xs transition-colors",
              activeTag === tag.name
                ? "text-primary"
                : "text-muted2 hover:bg-surface2 hover:text-text2",
            )}
            onClick={() => handleTagClick(tag.name)}
          >
            #{tag.name}
            <span className="text-muted-foreground ml-auto font-mono text-[11px]">
              {tag.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
