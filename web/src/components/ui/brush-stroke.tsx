import { cn } from "@/lib/utils"

export function BrushStroke({ error }: { error: boolean }) {
  const color = error ? "var(--destructive)" : "currentColor"
  return (
    <>
      <style>{`
        @keyframes brush-draw {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes brush-shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-4px); }
          50%       { transform: translateX(4px); }
          80%       { transform: translateX(-2px); }
        }
      `}</style>
      <svg
        viewBox="0 0 360 30"
        className="w-full h-5 -mt-1"
        style={{ animation: error ? "brush-shake 0.45s ease-in-out" : undefined }}
      >
        <defs>
          <clipPath id="brush-reveal">
            <rect
              width="360"
              height="30"
              style={{
                transformOrigin: "0 50%",
                animation: "brush-draw .45s cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
              }}
            />
          </clipPath>
        </defs>
        <path
          clipPath="url(#brush-reveal)"
          d={`
            M 3 16 C 6 11, 14 9, 25 12 C 38 15, 50 18, 65 14
            C 80 10, 95 8, 112 11 C 130 14, 145 17, 162 13
            C 178 9, 195 7, 212 11 C 228 14, 242 17, 258 13
            C 272 9, 288 7, 305 11 C 318 14, 330 16, 342 14
            C 350 12, 355 14, 357 13 L 356 15
            C 353 17, 348 16, 340 15 C 328 18, 315 16, 300 14
            C 285 12, 270 14, 255 16 C 240 19, 225 18, 210 15
            C 195 12, 178 14, 162 16 C 145 19, 130 18, 112 15
            C 95 12, 80 14, 65 17 C 50 20, 35 19, 22 16
            C 12 14, 6 17, 3 16 Z
          `}
          fill={color}
          className={cn(
            "transition-[fill,opacity] duration-300",
            error ? "opacity-60" : "opacity-15 dark:opacity-40",
          )}
        />
      </svg>
    </>
  )
}
