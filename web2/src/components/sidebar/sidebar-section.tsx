import { cn } from "@/lib/utils";
import type { NavItem } from "./types";

export function SidebarLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground mb-2 px-4 text-[13px] font-medium tracking-wide">
      {children}
    </div>
  );
}

const ACTIVE_ITEM = "all";
export function SidebarSection({
  label,
  items,
}: {
  label: string;
  items: NavItem[];
}) {
  return (
    <div className="shrink-0 pt-4 pb-1.5">
      <SidebarLabel>{label}</SidebarLabel>
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
        <span className="text-muted-foreground bg-surface2 ml-auto rounded-sm px-1 py-px font-mono text-[11px] border-border border mr-2">
          {item.count}
        </span>
      )}
    </button>
  );
}
