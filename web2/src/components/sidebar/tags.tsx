import { cn } from "@/lib/utils";
import { useState } from "react";
import { SidebarLabel } from "./sidebar-section";

const tags = [
  "design",
  "dev",
  "inspiration",
  "reading",
  "tools",
  "reference",
  "later",
];

export const Tags = () => {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const handleTagClick = (tag: string) => {
    setActiveTag((prev) => (prev === tag ? null : tag));
  };
  return (
    <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto pt-3.5 pb-1.5">
      <SidebarLabel>Tags</SidebarLabel>
      <div className="flex flex-col gap-px">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 text-xs transition-all",
              activeTag === tag
                ? "bg-accent-dim text-primary font-medium"
                : "text-muted2 hover:bg-surface2 hover:text-text2",
            )}
            onClick={() => handleTagClick(tag)}
          >
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full transition-colors",
                activeTag === tag ? "bg-primary" : "bg-border2",
              )}
            />
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
};
