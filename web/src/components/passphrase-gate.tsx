import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";



export function PassphraseGate({ onUnlock }: { onUnlock: () => void }) {
  const [passphrase, setPassphrase] = useState("");
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const triggerError = () => {
    setHasError(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setHasError(false), 600);
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!passphrase.trim() || isLoading) {
      triggerError();
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      if (res.ok) {
        onUnlock();
      } else {
        triggerError();
      }
    } catch {
      triggerError();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="passphrase-gate flex flex-col items-center">
      <div className="flex items-center">
        <span className="text-foreground text-3xl font-light tracking-wide">
          Rōnin
        </span>
        <span className="bg-shu mb-3 ml-1 inline-block size-2 shrink-0 rounded-[1px] shadow-[0_0_4px_oklch(0.55_0.14_30/0.4)]" />
      </div>
      <div className="text-muted2 text-lg tracking-[0.3em] mt-1">浪人</div>

      <form onSubmit={handleSubmit} className="mt-14 w-72">
        <Input
          type="password"
          variant="ghost"
          autoFocus
          value={passphrase}
          disabled={isLoading}
          onChange={(e) => {
            setPassphrase(e.target.value);
            if (hasError) setHasError(false);
          }}
          className="text-center text-base tracking-widest"
        />
        <BrushStroke error={hasError} />
      </form>
    </div >
  );
}


function BrushStroke({ error }: { error: boolean }) {
  const color = error ? "var(--destructive)" : "currentColor";
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
            C 350 12, 355 14, 357 13
            L 356 15
            C 353 17, 348 16, 340 15 C 328 18, 315 16, 300 14
            C 285 12, 270 14, 255 16 C 240 19, 225 18, 210 15
            C 195 12, 178 14, 162 16 C 145 19, 130 18, 112 15
            C 95 12, 80 14, 65 17 C 50 20, 35 19, 22 16
            C 12 14, 6 17, 3 16 Z
          `}
          fill={color}
          className={cn(
            "transition-[fill,opacity] duration-300",
            error ? "opacity-60" : "opacity-15 dark:opacity-40"
          )}
        />
      </svg>
    </>
  );
}
