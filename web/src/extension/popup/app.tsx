import { useState, useEffect } from "react";
import { getServerUrl } from "../lib/storage";
import { api, ApiError } from "../lib/api";
import type { Bookmark, Collection } from "@/lib/types";
import type { TagsResponse, MetadataResponse } from "../lib/api";
import { SetupView } from "./setup-view";
import { LoginView } from "./login-view";
import { BookmarkForm } from "./bookmark-form";

type View = "loading" | "setup" | "login" | "form";

export function App() {
  const [view, setView] = useState<View>("loading");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [tags, setTags] = useState<TagsResponse["tags"]>([]);
  const [tabUrl, setTabUrl] = useState("");
  const [tabTitle, setTabTitle] = useState("");
  const [existingBookmark, setExistingBookmark] = useState<Bookmark | null>(
    null,
  );
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const serverUrl = await getServerUrl();
    if (!serverUrl) {
      setView("setup");
      return;
    }

    try {
      const [colRes, tagRes, tab] = await Promise.all([
        api.getCollections(),
        api.getTags(),
        typeof chrome !== "undefined" && chrome.tabs
          ? chrome.tabs
              .query({ active: true, currentWindow: true })
              .then((t) => t[0])
          : Promise.resolve({
              url: "https://example.com",
              title: "Example Page",
            }),
      ]);
      setCollections(colRes.collections);
      setTags(tagRes.tags);

      const url = tab?.url || "";
      const title = tab?.title || "";
      setTabUrl(url);
      setTabTitle(title);
      setView("form");

      // Fetch existing bookmark + metadata in parallel (non-blocking)
      if (url && url.startsWith("http")) {
        const [existing, meta] = await Promise.all([
          api.getBookmarkByUrl(url).catch(() => null),
          api.getMetadata(url).catch(() => null),
        ]);
        setExistingBookmark(existing);
        setMetadata(meta);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setView("login");
      } else {
        setView("setup");
      }
    }
  }

  async function handleConnected() {
    await init();
  }

  async function handleLogin() {
    await init();
  }

  let content;
  if (view === "loading") {
    content = (
      <div className="flex min-h-[200px] w-[360px] items-center justify-center">
        <div className="border-primary size-4 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  } else if (view === "setup") {
    content = <SetupView onConnected={handleConnected} />;
  } else if (view === "login") {
    content = (
      <LoginView
        onLogin={handleLogin}
        onChangeServer={() => setView("setup")}
      />
    );
  } else {
    content = (
      <BookmarkForm
        collections={collections}
        tags={tags}
        initialUrl={tabUrl}
        initialTitle={tabTitle}
        existingBookmark={existingBookmark}
        metadata={metadata}
        onSaved={() => setTimeout(() => window.close(), 1500)}
        onAuthError={() => setView("login")}
      />
    );
  }

  return content;
}
