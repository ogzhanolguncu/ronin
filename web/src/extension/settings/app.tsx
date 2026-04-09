import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getServerUrl, setServerUrl } from "../lib/storage";
import { api, ApiError } from "../lib/api";

type ConnectionStatus =
  | "idle"
  | "testing"
  | "connected"
  | "auth-required"
  | "error";

export function App() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    getServerUrl().then((u) => {
      if (u) {
        setUrl(u);
        testConnection();
      }
    });
  }, []);

  async function testConnection() {
    setStatus("testing");
    setStatusText("Testing connection...");
    try {
      await api.getCollections();
      setStatus("connected");
      setStatusText("Connected");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setStatus("auth-required");
        setStatusText("Connected (login required)");
      } else {
        setStatus("error");
        setStatusText(
          err instanceof Error ? err.message : "Cannot reach server",
        );
      }
    }
  }

  async function handleSave() {
    if (!url.trim()) return;
    await setServerUrl(url.trim());
    await testConnection();
  }

  async function handleLogout() {
    try {
      await api.logout();
    } catch {}
    setStatus("idle");
    setStatusText("Session cleared");
  }

  return (
    <div className="mx-auto max-w-[440px] px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center gap-0.5">
        <span className="text-foreground text-[22px] font-light tracking-wide">
          Ronin
        </span>
        <span className="bg-shu mb-2 ml-0.5 inline-block size-[5px] shrink-0 rounded-[1px] shadow-[0_0_4px_oklch(0.55_0.14_30/0.4)]" />
        <span className="text-muted-foreground ml-2 text-sm">Settings</span>
      </div>

      {/* Server URL */}
      <section className="mb-6">
        <label className="text-muted-foreground mb-2 block text-xs font-medium tracking-wider uppercase">
          Server URL
        </label>
        <div className="flex gap-2">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="https://ronin.example.com"
          />
          <Button onClick={handleSave} className="shrink-0">
            Save
          </Button>
        </div>
        {status !== "idle" && (
          <div className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "size-1.5 rounded-full",
                status === "connected" && "bg-emerald-500",
                status === "auth-required" && "bg-emerald-500",
                status === "error" && "bg-destructive",
                status === "testing" && "bg-muted-foreground animate-pulse",
              )}
            />
            {statusText}
          </div>
        )}
      </section>

      {/* Session */}
      <section className="mb-6">
        <label className="text-muted-foreground mb-2 block text-xs font-medium tracking-wider uppercase">
          Session
        </label>
        <Button variant="outline" onClick={handleLogout}>
          Clear session &amp; logout
        </Button>
      </section>

      <p className="text-muted-foreground mt-10 text-[11px]">
        Ronin Extension v1.0.0
      </p>
    </div>
  );
}
