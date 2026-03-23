import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/format";
import type { NavItem } from "./types";
import { urlState } from "@/lib/query-manager/url-state-instance";
import { useUrlState } from "@/lib/query-manager/use-url-state";

export function SidebarSection({
  items,
}: {
  items: NavItem[];
}) {
  const view = useUrlState((s) => s.view);

  return (
    <div className="shrink-0 py-3 flex flex-col">
      {items.map((item) => (
        <NavRow
          key={item.id}
          item={item}
          isActive={item.id === view}
          onClick={() => urlState.set({ view: item.id })}
        />
      ))}
    </div>
  );
}

function NavRow({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 border-l-2 py-2.5 pl-3.5 text-xs transition-all [&_svg]:size-3.5 [&_svg]:shrink-0",
        isActive
          ? "nav-indicator-active text-primary bg-accent-dim font-medium"
          : "nav-indicator-inactive text-muted2 hover:text-text2 hover:bg-surface2",
      )}
    >
      {item.icon}
      {item.label}
      {item.count ? (
        <span className={cn(
          "ml-auto mr-4 font-mono text-[11px] tabular-nums transition-colors",
          isActive
            ? "text-primary/60"
            : "text-muted-foreground",
        )}>
          {formatCount(item.count)}
        </span>
      ) : null}
    </button>
  );
}
