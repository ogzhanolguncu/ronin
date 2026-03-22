export function SuspenseFallback() {
  return (
    <>
      <style>{`
        @keyframes stamp-press {
          0%, 100% {
            transform: translateY(0);
            box-shadow: 0 0 3px oklch(0.55 0.14 30 / 0.3);
          }
          40% {
            transform: translateY(3px);
            box-shadow: 0 0 8px oklch(0.55 0.14 30 / 0.6);
          }
          60% {
            transform: translateY(3px);
            box-shadow: 0 0 8px oklch(0.55 0.14 30 / 0.6);
          }
        }
      `}</style>
      <div className="flex flex-col items-center justify-center gap-5 min-h-[60vh]">
        <div className="flex items-center gap-3">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block size-2 rounded-[1px] bg-shu"
              style={{
                animation: "stamp-press 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite",
                animationDelay: `${i * 300}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </>
  )
}
