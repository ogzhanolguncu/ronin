import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export function ContentToolbar() {
  return (
    <div className="border-b border-border-soft/50 h-24">
      <div className="px-6 pt-5 pb-3">
        <Input
          variant="ghost"
          placeholder="Search bookmarks..."
          className="flex-1 text-sm placeholder:text-muted2/50 border-b border-transparent transition-colors duration-300 focus:border-border-soft/50"
        />
      </div>

      <div className="flex items-baseline justify-between px-6 pb-3">
        <h2 className="text-xs font-mono text-muted2">
          All bookmarks
        </h2>
        <NativeSelect variant="ghost" size="sm" defaultValue="newest">
          <NativeSelectOption value="newest">Newest</NativeSelectOption>
          <NativeSelectOption value="oldest">Oldest</NativeSelectOption>
          <NativeSelectOption value="az">A → Z</NativeSelectOption>
          <NativeSelectOption value="za">Z → A</NativeSelectOption>
        </NativeSelect>
      </div>
    </div>
  );
}
