import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useUrlState } from "@/hooks/use-url-state";
import { urlState } from "@/lib/url-state-instance";
import { MOCK_COLLECTIONS } from "@/components/sidebar/collections";

const VIEW_LABELS: Record<string, string> = {
  all: "All bookmarks",
  favorites: "Favorites",
  unread: "Unread",
  archived: "Archived",
};

export function ContentToolbar() {
  const q = useUrlState((s) => s.q);
  const sort = useUrlState((s) => s.sort);
  const view = useUrlState((s) => s.view);
  const collection = useUrlState((s) => s.collection);

  const [localQ, setLocalQ] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync external URL changes back to local input
  useEffect(() => {
    setLocalQ(q);
  }, [q]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setLocalQ(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      urlState.set({ q: value, page: 1 });
    }, 300);
  }

  const heading = collection
    ? MOCK_COLLECTIONS.find((c) => c.slug === collection)?.name ?? "Collection"
    : VIEW_LABELS[view] ?? "All bookmarks";

  return (
    <div className="border-b border-border-soft/50 h-24">
      <div className="px-6 pt-5 pb-3">
        <Input
          variant="ghost"
          placeholder="Search bookmarks..."
          value={localQ}
          onChange={handleSearchChange}
          className="flex-1 text-sm placeholder:text-muted2/50 border-b border-transparent transition-colors duration-300 focus:border-border-soft/50"
        />
      </div>

      <div className="flex items-baseline justify-between px-6 pb-3">
        <h2 className="text-xs font-mono text-muted2">
          {heading}
        </h2>
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
