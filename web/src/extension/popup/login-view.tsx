import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Brand } from "@/components/ui/brand";
import { BrushStroke } from "@/components/ui/brush-stroke";
import { api } from "../lib/api";

export function LoginView({
  onLogin,
  onChangeServer,
}: {
  onLogin: () => void;
  onChangeServer: () => void;
}) {
  const [passphrase, setPassphrase] = useState("");
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function triggerError() {
    setHasError(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setHasError(false), 600);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passphrase.trim() || isLoading) {
      triggerError();
      return;
    }
    setIsLoading(true);
    try {
      await api.login(passphrase);
      onLogin();
    } catch {
      triggerError();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-[360px] p-6">
      <Brand />
      <form onSubmit={handleSubmit} className="mx-auto mt-14 w-72">
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
      <button
        type="button"
        onClick={onChangeServer}
        className="text-muted-foreground hover:text-foreground mx-auto mt-6 block text-xs transition-colors"
      >
        Change server
      </button>
    </div>
  );
}
