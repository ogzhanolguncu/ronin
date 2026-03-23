import { useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/format";
import { tagsQueryOptions } from "@/lib/queries/tags";
import { urlState } from "@/lib/query-manager/url-state-instance";
import { useUrlState } from "@/lib/query-manager/use-url-state";

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
      <div className="border-t border-border-soft/30 min-h-0 flex-1 flex flex-col">
        <div className="flex flex-col items-center justify-center flex-1 gap-3 px-4 py-8 animate-in fade-in duration-500">
          <span
            className="font-mono text-muted2/40 text-lg select-none tracking-widest"
            style={{ animation: "ink-breathe 3s ease-in-out infinite" }}
          >
            #
          </span>
          <p className="font-mono text-[11px] text-muted2/50 font-light tracking-wide">
            no tags yet
          </p>
        </div>
      </div>
    );
  }

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
                  {formatCount(tag.count)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
