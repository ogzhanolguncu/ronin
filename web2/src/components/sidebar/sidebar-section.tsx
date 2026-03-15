import { cn } from "@/lib/utils";
import type { NavItem } from "./types";

const ACTIVE_ITEM = "all";

export function SidebarSection({
  items,
}: {
  items: NavItem[];
}) {
  return (
    <div className="shrink-0 pt-4 pb-2.5">
      {items.map((item) => (
        <NavRow key={item.id} item={item} isActive={item.id === ACTIVE_ITEM} />
      ))}
    </div>
  );
}

function NavRow({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 border-l-2 py-1.5 pl-[14px] text-xs transition-all [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0",
        isActive
          ? "text-primary border-l-primary bg-accent-dim font-medium"
          : "text-muted2 hover:text-text2 hover:bg-surface2 border-l-transparent",
      )}
    >
      {item.icon}
      {item.label}
      {item.count !== undefined && (
        <span className="text-muted-foreground ml-auto py-px font-mono text-[11px] mr-4">
          {item.count}
        </span>
      )}
    </button>
  );
}


