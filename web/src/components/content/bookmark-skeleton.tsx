import { cn } from "@/lib/utils";

const shimmer =
  "bg-gradient-to-r from-transparent via-muted2/10 to-transparent bg-[length:200%_100%] animate-[shimmer_1.4s_ease-in-out_infinite] rounded-sm";

export function BookmarkSkeleton({ delay = 0 }: { delay?: number }) {
  const style = delay ? { animationDelay: `${delay}s` } : undefined;

  return (
    <div className="group relative px-6 py-6 first:border-t-0 transition-colors duration-200">
      {/* Action cluster — mirrors BookmarkItem's 4-button cluster */}
      <div className="absolute top-3 right-4 flex items-center gap-0.5 opacity-0">
        <div className={cn("w-6 h-6 rounded", shimmer)} style={style} />
        <div className={cn("w-6 h-6 rounded", shimmer)} style={style} />
        <div className={cn("w-6 h-6 rounded", shimmer)} style={style} />
        <div className={cn("w-6 h-6 rounded", shimmer)} style={style} />
      </div>

      {/* Row 1: Favicon + Title */}
      <div className="flex items-center gap-2 min-w-0 pr-28">
        <div className={cn("w-4 h-4 rounded-sm shrink-0", shimmer)} style={style} />
        <div className={cn("h-3.5 w-48", shimmer)} style={style} />
      </div>

      {/* Row 2: Hostname */}
      <div className={cn("h-3 w-24 mt-1", shimmer)} style={style} />

      {/* Row 3: Description */}
      <div className={cn("h-2.5 w-72 mt-4", shimmer)} style={style} />
      <div className={cn("h-2.5 w-56 mt-1", shimmer)} style={style} />

      {/* Row 4: Tags + Date */}
      <div className="flex items-center gap-2.5 mt-3">
        <div className={cn("h-3 w-10", shimmer)} style={style} />
        <div className={cn("h-3 w-12", shimmer)} style={style} />
        <div className={cn("h-3 w-16", shimmer)} style={style} />
        <div className={cn("h-3 w-14 ml-auto", shimmer)} style={style} />
      </div>
    </div>
  );
}

export function BookmarkListSkeleton() {
  return (
    <div>
      {Array.from({ length: 5 }, (_, i) => (
        <BookmarkSkeleton key={i} delay={i * 0.08} />
      ))}
    </div>
  );
}
