import { SearchIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export function ContentToolbar() {
  return (
    <>
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-2">
          {/* <SearchIcon className="size-3.5 text-sumi" /> */}
          <Input
            variant="ghost"
            placeholder="Search bookmarks..."
            className="search-input flex-1"
          />
        </div>
      </div>

      <div className="flex items-baseline justify-between px-6 pb-4">
        <h2 className="text-xs font-mono tracking-wide text-muted2 uppercase">
          All bookmarks
        </h2>
        <NativeSelect variant="ghost" size="sm" defaultValue="newest">
          <NativeSelectOption value="newest">Newest</NativeSelectOption>
          <NativeSelectOption value="oldest">Oldest</NativeSelectOption>
          <NativeSelectOption value="az">A → Z</NativeSelectOption>
          <NativeSelectOption value="za">Z → A</NativeSelectOption>
        </NativeSelect>
      </div>
    </>
  );
}
