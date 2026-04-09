import { useState, useEffect, useRef } from "react";
import {
  FormInput,
  FormTextarea,
  FormSelect,
} from "@/components/ui/form-input";
import { FormTagInput } from "@/components/ui/tag-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Settings,
  ChevronRight,
  Loader2,
  Check,
  ExternalLink,
  Archive,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getHostname } from "@/lib/types";
import { useScrollMist } from "@/hooks/use-scroll-mist";
import type { Bookmark, Collection } from "@/lib/types";
import { api, ApiError } from "../lib/api";
import type { TagsResponse, MetadataResponse } from "../lib/api";
import { getServerUrl } from "../lib/storage";

interface Props {
  collections: Collection[];
  tags: TagsResponse["tags"];
  initialUrl: string;
  initialTitle: string;
  existingBookmark: Bookmark | null;
  metadata: MetadataResponse | null;
  onSaved: () => void;
  onAuthError: () => void;
}

export function BookmarkForm({
  collections,
  tags,
  initialUrl,
  initialTitle,
  existingBookmark,
  metadata,
  onSaved,
  onAuthError,
}: Props) {
  const isEdit = !!existingBookmark;
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollMist(scrollRef);

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [favorite, setFavorite] = useState(false);
  const [notes, setNotes] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "error" | "warn";
  } | null>(null);
  const [saved, setSaved] = useState(false);
  const [serverUrl, setServerUrlState] = useState("");

  useEffect(() => {
    getServerUrl().then(setServerUrlState);
  }, []);

  // Sync form fields when existingBookmark arrives async
  useEffect(() => {
    if (!existingBookmark) return;
    setTitle(existingBookmark.title);
    setDescription(existingBookmark.description);
    setCollectionId(
      existingBookmark.collection_id
        ? String(existingBookmark.collection_id)
        : "",
    );
    setSelectedTags(existingBookmark.tags);
    setFavorite(existingBookmark.favorite);
    setNotes(existingBookmark.notes);
    setNotesOpen(!!existingBookmark.notes);
  }, [existingBookmark]);

  // Enrich from metadata when it arrives (only for new bookmarks)
  useEffect(() => {
    if (!metadata || isEdit) return;
    if (metadata.title && metadata.title.length > title.length)
      setTitle(metadata.title);
    if (metadata.description && !description)
      setDescription(metadata.description.slice(0, 500));
  }, [metadata]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!initialUrl.trim() || !title.trim()) {
      setMessage({ text: "URL and title are required", type: "error" });
      return;
    }

    setSaving(true);
    setMessage(null);

    const data = {
      url: initialUrl.trim(),
      title: title.trim().slice(0, 512),
      description: description.trim().slice(0, 1024),
      notes: notes.trim(),
      tags: selectedTags.join(" "),
      favorite,
      collection_id: collectionId ? parseInt(collectionId, 10) : undefined,
    };

    try {
      if (isEdit) {
        await api.updateBookmark(existingBookmark!.id, data);
      } else {
        await api.createBookmark(data);
      }
      setSaved(true);
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setMessage({ text: "Bookmark already exists", type: "warn" });
        } else if (err.status === 401) {
          onAuthError();
        } else {
          setMessage({ text: err.message, type: "error" });
        }
      } else {
        setMessage({ text: "Failed to save", type: "error" });
      }
    } finally {
      setSaving(false);
    }
  }

  const hostname = getHostname(initialUrl);
  const faviconUrl = serverUrl
    ? `${serverUrl}/api/v1/favicons/${hostname}`
    : "";

  if (saved) {
    return (
      <div className="animate-in fade-in w-[360px] duration-300">
        <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-4">
          <Check className="text-primary size-8" strokeWidth={1.5} />
          <p className="text-foreground text-sm font-medium">
            {isEdit ? "Updated" : "Saved"}
          </p>
        </div>

        <div className="px-6 pb-2">
          <div className="bg-surface border-border-soft flex items-center gap-3 rounded-lg border p-3">
            {faviconUrl && (
              <img
                src={faviconUrl}
                alt=""
                className="size-5 shrink-0 rounded-sm"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-sm">{title}</p>
              <p className="text-muted-foreground truncate text-xs">
                {hostname}
              </p>
            </div>
          </div>
        </div>

        {!isEdit && (
          <div className="text-muted-foreground flex items-center gap-4 px-6 py-3 text-xs">
            <span className="flex items-center gap-1">
              <Archive className="size-3" />
              Snapshot creating...
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="size-3" />
              Reader extracting...
            </span>
            <a
              href={`https://web.archive.org/web/${initialUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ExternalLink className="size-3" />
              Wayback
            </a>
          </div>
        )}
      </div>
    );
  }

  const collectionOptions = collections.map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  const allTagNames = tags.map((t) => t.name);

  return (
    <div className="relative flex max-h-[600px] w-[360px] flex-col">
      {/* Fixed header */}
      <div className="flex shrink-0 items-center justify-between px-6 pt-5 pb-3">
        <div className="flex items-center">
          <span className="text-foreground text-base font-semibold tracking-tight">
            Rōnin
          </span>
          <span className="bg-shu mb-1.5 ml-0.5 inline-block size-1.5 shrink-0 rounded-[1px] shadow-[0_0_3px_oklch(0.55_0.14_30/0.3)]" />
        </div>
        <button
          type="button"
          onClick={() =>
            typeof chrome !== "undefined" && chrome.runtime?.openOptionsPage()
          }
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="size-3.5" />
        </button>
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="thin-scrollbar content-scroll-mist flex-1 overflow-y-auto"
      >
        {/* Page preview card */}
        <div className="bg-surface border-border-soft mx-6 mb-4 rounded-lg border p-3">
          <div className="flex gap-3">
            <div className="shrink-0">
              {faviconUrl ? (
                <img
                  src={faviconUrl}
                  alt=""
                  className="size-7 rounded-sm"
                  onError={(e) => {
                    e.currentTarget.replaceWith(
                      Object.assign(document.createElement("div"), {
                        className:
                          "size-7 rounded-sm bg-surface2 flex items-center justify-center text-xs font-medium text-muted-foreground",
                        textContent: hostname[0]?.toUpperCase() || "?",
                      }),
                    );
                  }}
                />
              ) : (
                <div className="bg-surface2 size-7 animate-pulse rounded-sm" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-sm leading-tight font-medium">
                {metadata?.title || initialTitle}
              </p>
              <p className="text-muted-foreground mt-0.5 truncate text-xs">
                {hostname}
              </p>
            </div>
            {isEdit && (
              <span className="text-shu bg-accent-dim shrink-0 self-start rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wider uppercase">
                Saved
              </span>
            )}
          </div>
          {metadata?.preview_image && (
            <img
              src={metadata.preview_image}
              alt=""
              className="mt-2.5 h-[120px] w-full rounded-md object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
        </div>

        <form id="bookmark-form" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6 px-6 py-3">
            <FormInput
              label="Title"
              placeholder="In Praise of Interfaces"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <FormTextarea
              label="Description"
              placeholder="Why good APIs feel invisible"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              currentLength={description.length}
            />

            <FormSelect
              label="Collection"
              hint="Manage collections from the sidebar."
              options={collectionOptions}
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
            />

            <FormTagInput
              className="h-auto min-h-8"
              label="Tags"
              allTags={allTagNames}
              value={selectedTags}
              onChange={setSelectedTags}
              placeholder="#engineering, #api-design"
              hint={
                <>
                  Enter any number of tags separated by space and{" "}
                  <span className="text-muted-foreground font-medium">
                    without
                  </span>{" "}
                  the hash (#). If a tag does not exist it will be automatically
                  created.
                </>
              }
            />

            <div>
              <button
                type="button"
                className="text-foreground/80 flex cursor-pointer items-center gap-0.5 text-sm font-medium select-none"
                onClick={() => setNotesOpen((o) => !o)}
              >
                <ChevronRight
                  className={cn(
                    "text-muted2/50 size-4 transition-transform duration-200",
                    notesOpen && "rotate-90",
                  )}
                />
                Notes
              </button>
              {notesOpen && (
                <div className="animate-in fade-in slide-in-from-top-1 pt-2 duration-150">
                  <FormTextarea
                    hint="Supports Markdown"
                    placeholder="Revisit the section on composability"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={2000}
                    currentLength={notes.length}
                  />
                </div>
              )}
            </div>

            <Checkbox
              label="Mark as favorite"
              hint="Favorite bookmarks are pinned for quick access."
              className="font-medium"
              checked={favorite}
              onChange={(e) => setFavorite(e.target.checked)}
            />
          </div>
        </form>
      </div>

      <div className="shrink-0 p-6 pb-7">
        <Button
          form="bookmark-form"
          type="submit"
          className="h-9 w-full"
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isEdit ? (
            "Update"
          ) : (
            "Save"
          )}
        </Button>
        {message && (
          <p
            className={cn(
              "mt-3 text-center text-xs",
              message.type === "error" ? "text-destructive" : "text-kitsune",
            )}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
