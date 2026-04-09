import { useRef } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { urlState } from "@/lib/query-manager/url-state-instance";
import { parseSearchQuery } from "@/lib/query-manager/search-parser";
import { collectionsQueryOptions } from "@/lib/queries/collections";
import {
  useUrlState,
  useUrlStateLocal,
} from "@/lib/query-manager/use-url-state";

const VIEW_LABELS: Record<string, string> = {
  all: "All bookmarks",
  favorites: "Favorites",
  unread: "Unread",
  archived: "Archived",
};

export function ContentToolbar() {
  const sort = useUrlState((s) => s.sort);
  const view = useUrlState((s) => s.view);
  const tags = useUrlState((s) => s.tags);
  const domains = useUrlState((s) => s.domains);
  const collection = useUrlState((s) => s.collection);

  const { data: collections } = useSuspenseQuery(collectionsQueryOptions());
  const [localQ, setLocalQ] = useUrlStateLocal((s) => s.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setLocalQ(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const parsed = parseSearchQuery(value);
      const hasPrefix =
        parsed.tags.length > 0 ||
        parsed.domains.length > 0 ||
        parsed.is.length > 0;

      if (hasPrefix) {
        const viewUpdate =
          parsed.is.length > 0 ? mapIsToView(parsed.is[0]) : undefined;
        urlState.set((prev) => ({
          q: parsed.text,
          tags: [...new Set([...prev.tags, ...parsed.tags])],
          domains: [...new Set([...prev.domains, ...parsed.domains])],
          ...(viewUpdate ? { view: viewUpdate } : {}),
          page: 1,
        }));
        setLocalQ(parsed.text);
      } else {
        urlState.set({ q: value, page: 1 });
      }
    }, 300);
  }

  function removeTag(tag: string) {
    urlState.set((prev) => ({
      tags: prev.tags.filter((t) => t !== tag),
      page: 1,
    }));
  }

  function removeDomain(domain: string) {
    urlState.set((prev) => ({
      domains: prev.domains.filter((d) => d !== domain),
      page: 1,
    }));
  }

  function removeIsFilter() {
    urlState.set({ view: "all", page: 1 });
  }

  const isViewFromSearch = view !== "all" && !collection;
  const hasChips = tags.length > 0 || domains.length > 0 || isViewFromSearch;

  const heading = collection
    ? (collections?.find((c) => c.slug === collection)?.name ?? "Collection")
    : (VIEW_LABELS[view] ?? "All bookmarks");

  const inputRef = useRef<HTMLInputElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !localQ) {
      if (isViewFromSearch) {
        removeIsFilter();
      } else if (domains.length > 0) {
        removeDomain(domains[domains.length - 1]);
      } else if (tags.length > 0) {
        removeTag(tags[tags.length - 1]);
      }
    }
  }

  return (
    <div className="border-border-soft/50 h-24 border-b">
      <div className="px-6 pt-5 pb-3">
        <div
          className={cn(
            "flex cursor-text flex-wrap items-center gap-1.5 border-b transition-colors duration-300",
            hasChips
              ? "border-border-soft/50"
              : "focus-within:border-border-soft/50 border-transparent",
          )}
          onClick={() => inputRef.current?.focus()}
        >
          {tags.map((tag) => (
            <FilterChip
              key={`tag:${tag}`}
              label={`tag:${tag}`}
              onRemove={() => removeTag(tag)}
            />
          ))}
          {domains.map((domain) => (
            <FilterChip
              key={`domain:${domain}`}
              label={`domain:${domain}`}
              onRemove={() => removeDomain(domain)}
            />
          ))}
          {isViewFromSearch && (
            <FilterChip
              label={`is:${view === "favorites" ? "favorite" : view}`}
              onRemove={removeIsFilter}
            />
          )}
          <input
            ref={inputRef}
            type="text"
            className="placeholder:text-muted2/50 min-w-[60px] flex-1 bg-transparent text-sm tracking-wide outline-none"
            value={localQ}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            placeholder={
              !hasChips && !localQ
                ? "Search bookmarks... try tag:design or is:unread"
                : undefined
            }
          />
        </div>
      </div>

      <div className="flex items-baseline justify-between px-6 pb-3">
        <h2 className="text-muted2 font-mono text-xs">{heading}</h2>
        <NativeSelect
          variant="ghost"
          size="sm"
          value={sort}
          onChange={(e) => urlState.set({ sort: e.target.value, page: 1 })}
        >
          <NativeSelectOption value="newest">Newest</NativeSelectOption>
          <NativeSelectOption value="oldest">Oldest</NativeSelectOption>
          <NativeSelectOption value="az">A → Z</NativeSelectOption>
          <NativeSelectOption value="za">Z → A</NativeSelectOption>
        </NativeSelect>
      </div>
    </div>
  );
}

function mapIsToView(value: string): string | undefined {
  const map: Record<string, string> = {
    unread: "unread",
    archived: "archived",
    favorite: "favorites",
  };
  return map[value];
}

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span
      className="text-primary inline-flex cursor-pointer items-center gap-1 px-1.5 py-0.5 font-mono text-xs transition-[filter] duration-300 hover:brightness-125"
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
    >
      {label}
      <button
        type="button"
        className="text-muted2/50 hover:text-muted2 leading-none transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remove ${label}`}
      >
        ×
      </button>
    </span>
  );
}
