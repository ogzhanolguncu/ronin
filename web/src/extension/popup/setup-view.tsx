import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setServerUrl } from "../lib/storage";
import { api, ApiError } from "../lib/api";
import { Brand } from "@/components/ui/brand";

export function SetupView({ onConnected }: { onConnected: () => void }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError("");
    setLoading(true);

    try {
      await setServerUrl(url.trim());
      await api.getCollections();
      onConnected();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onConnected();
      } else {
        setError(
          err instanceof Error ? err.message : "Cannot connect to server",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-[360px] p-6">
      <Brand />
      <form onSubmit={handleSubmit} className="mt-10 space-y-3">
        <label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          Server URL
        </label>
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://ronin.example.com"
          required
          autoFocus
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Connecting..." : "Connect"}
        </Button>
        {error && (
          <p className="text-destructive text-center text-xs">{error}</p>
        )}
      </form>
    </div>
  );
}
