export function SuspenseFallback() {
  return (
    <div className="flex items-center justify-center gap-1.5 p-12">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="font-mono text-muted2/60 text-sm select-none"
          style={{
            animation: "ink-breathe 2s ease-in-out infinite",
            animationDelay: `${i * 300}ms`,
          }}
        >
          ·
        </span>
      ))}
    </div>
  )
}
