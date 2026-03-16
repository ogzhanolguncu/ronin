import { cn } from "@/lib/utils";
import type { NavItem } from "./types";

const ACTIVE_ITEM = "all";

export function SidebarSection({
  items,
}: {
  items: NavItem[];
}) {
  return (
    <div className="shrink-0 pt-5 pb-3">
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
        "flex w-full items-center gap-2 border-l-2 py-2 pl-3.5 text-xs transition-all [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0",
        isActive
          ? "nav-indicator-active text-primary bg-accent-dim font-medium"
          : "nav-indicator-inactive text-muted2 hover:text-text2 hover:bg-surface2",
      )}
    >
      {item.icon}
      {item.label}
      {item.count !== undefined && (
        <span className="text-muted-foreground ml-auto mr-4 py-px font-mono text-[11px]">
          {item.count}
        </span>
      )}
    </button>
  );
}
