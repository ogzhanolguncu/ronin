import { useState, useRef } from "react";
import { Input } from "./ui/input";
import { Brand } from "./ui/brand";
import { BrushStroke } from "./ui/brush-stroke";
import { requester } from "@/lib/requester";

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
      await requester("/api/v1/auth/login", {
        method: "POST",
        body: { passphrase },
      });
      onUnlock();
    } catch {
      triggerError();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="passphrase-gate flex flex-col items-center">
      <Brand />
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
    </div>
  );
}
