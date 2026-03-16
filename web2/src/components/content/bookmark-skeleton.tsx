const shimmer =
  "bg-gradient-to-r from-transparent via-muted2/10 to-transparent bg-[length:200%_100%] animate-[shimmer_1.4s_ease-in-out_infinite] rounded-sm";

export function BookmarkSkeleton({ delay = 0 }: { delay?: number }) {
  const style = delay ? { animationDelay: `${delay}s` } : undefined;

  return (
    <div className="px-6 py-4 border-b border-border-soft/40">
      {/* Row 1: Favicon + Title */}
      <div className="flex items-center gap-2">
        <div className={`w-3.5 h-3.5 rounded-sm ${shimmer}`} style={style} />
        <div className={`h-3.5 w-48 ${shimmer}`} style={style} />
      </div>

      {/* Row 2: Hostname */}
      <div className={`h-2.5 w-24 mt-1.5 ${shimmer}`} style={style} />

      {/* Row 3: Description */}
      <div className={`h-2.5 w-72 mt-2.5 ${shimmer}`} style={style} />
      <div className={`h-2.5 w-56 mt-1 ${shimmer}`} style={style} />

      {/* Row 4: Tags + Date */}
      <div className="flex items-center gap-2 mt-2.5">
        <div className={`h-2 w-10 ${shimmer}`} style={style} />
        <div className={`h-2 w-12 ${shimmer}`} style={style} />
        <div className={`h-2 w-16 ${shimmer}`} style={style} />
      </div>
    </div>
  );
}
