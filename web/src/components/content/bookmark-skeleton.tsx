import { cn } from "@/lib/utils";

const shimmer =
  "bg-gradient-to-r from-transparent via-muted2/10 to-transparent bg-[length:200%_100%] animate-[shimmer_1.4s_ease-in-out_infinite] rounded-sm";

export function BookmarkSkeleton({ delay = 0 }: { delay?: number }) {
  const style = delay ? { animationDelay: `${delay}s` } : undefined;

  return (
    <div className={cn("group relative px-6 py-6 border-b border-border-soft/40 first:border-t-0 transition-colors duration-200 hover:bg-surface")}>
      {/* Action cluster — always visible, top-right */}
      <div className="absolute top-3 right-4 flex items-center gap-0.5">
        <div className={cn("w-6 h-6 rounded", shimmer)} style={style} />
        <div className={cn("w-6 h-6 rounded", shimmer)} style={style} />
        <div className={cn("w-6 h-6 rounded", shimmer)} style={style} />
      </div>

      {/* Row 1: Favicon + Title */}
      <div className="flex items-center gap-2 min-w-0 pr-20">
        <div className={cn("w-4 h-4 rounded-sm shrink-0", shimmer)} style={style} />
        <div className={cn("h-3.5 w-48", shimmer)} style={style} />
      </div>

      {/* Row 2: Hostname */}
      <div className={cn("h-4 w-24 mt-1", shimmer)} style={style} />

      {/* Row 3: Description */}
      <div className={cn("h-2.5 w-72 mt-3", shimmer)} style={style} />
      <div className={cn("h-2.5 w-56 mt-1", shimmer)} style={style} />

      {/* Row 4: Tags + Date */}
      <div className="flex items-center gap-2.5 mt-3">
        <div className={cn("h-4 w-10", shimmer)} style={style} />
        <div className={cn("h-4 w-12", shimmer)} style={style} />
        <div className={cn("h-4 w-16", shimmer)} style={style} />
      </div>

      {/* Notes expansion placeholder */}
      <div
        className="grid ease-out"
        style={{
          gridTemplateRows: "0fr",
          opacity: 0,
          marginTop: 0,
          transition: "grid-template-rows 250ms ease-out, opacity 200ms ease-out, margin-top 250ms ease-out",
        }}
      >
        <div className="overflow-hidden">
          <div className={cn("pl-3 border-l-2 border-border-soft/50 bg-surface/50 rounded-r py-2 pr-3", shimmer)} style={style} />
        </div>
      </div>
    </div>
  );
}
