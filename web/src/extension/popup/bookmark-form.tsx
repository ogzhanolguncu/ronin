import { useState, useEffect, useRef } from "react"
import { FormInput, FormTextarea, FormSelect } from "@/components/ui/form-input"
import { FormTagInput } from "@/components/ui/tag-input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Settings, ChevronRight, Loader2, Check, ExternalLink, Archive, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { getHostname } from "@/lib/types"
import { useScrollMist } from "@/hooks/use-scroll-mist"
import type { Bookmark, Collection } from "@/lib/types"
import { api, ApiError } from "../lib/api"
import type { TagsResponse, MetadataResponse } from "../lib/api"
import { getServerUrl } from "../lib/storage"

interface Props {
  collections: Collection[]
  tags: TagsResponse["tags"]
  initialUrl: string
  initialTitle: string
  existingBookmark: Bookmark | null
  metadata: MetadataResponse | null
  onSaved: () => void
  onAuthError: () => void
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
  const isEdit = !!existingBookmark
  const scrollRef = useRef<HTMLDivElement>(null)
  useScrollMist(scrollRef)

  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState("")
  const [collectionId, setCollectionId] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [favorite, setFavorite] = useState(false)
  const [notes, setNotes] = useState("")
  const [notesOpen, setNotesOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "error" | "warn" } | null>(null)
  const [saved, setSaved] = useState(false)
  const [serverUrl, setServerUrlState] = useState("")

  useEffect(() => {
    getServerUrl().then(setServerUrlState)
  }, [])

  // Sync form fields when existingBookmark arrives async
  useEffect(() => {
    if (!existingBookmark) return
    setTitle(existingBookmark.title)
    setDescription(existingBookmark.description)
    setCollectionId(existingBookmark.collection_id ? String(existingBookmark.collection_id) : "")
    setSelectedTags(existingBookmark.tags)
    setFavorite(existingBookmark.favorite)
    setNotes(existingBookmark.notes)
    setNotesOpen(!!existingBookmark.notes)
  }, [existingBookmark])

  // Enrich from metadata when it arrives (only for new bookmarks)
  useEffect(() => {
    if (!metadata || isEdit) return
    if (metadata.title && metadata.title.length > title.length) setTitle(metadata.title)
    if (metadata.description && !description) setDescription(metadata.description.slice(0, 500))
  }, [metadata])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!initialUrl.trim() || !title.trim()) {
      setMessage({ text: "URL and title are required", type: "error" })
      return
    }

    setSaving(true)
    setMessage(null)

    const data = {
      url: initialUrl.trim(),
      title: title.trim().slice(0, 512),
      description: description.trim().slice(0, 1024),
      notes: notes.trim(),
      tags: selectedTags.join(" "),
      favorite,
      collection_id: collectionId ? parseInt(collectionId, 10) : undefined,
    }

    try {
      if (isEdit) {
        await api.updateBookmark(existingBookmark!.id, data)
      } else {
        await api.createBookmark(data)
      }
      setSaved(true)
      onSaved()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setMessage({ text: "Bookmark already exists", type: "warn" })
        } else if (err.status === 401) {
          onAuthError()
        } else {
          setMessage({ text: err.message, type: "error" })
        }
      } else {
        setMessage({ text: "Failed to save", type: "error" })
      }
    } finally {
      setSaving(false)
    }
  }

  const hostname = getHostname(initialUrl)
  const faviconUrl = serverUrl ? `${serverUrl}/api/v1/favicons/${hostname}` : ""

  if (saved) {
    return (
      <div className="w-[360px] animate-in fade-in duration-300">
        <div className="px-6 pt-6 pb-4 flex flex-col items-center gap-3">
          <Check className="size-8 text-primary" strokeWidth={1.5} />
          <p className="text-sm font-medium text-foreground">
            {isEdit ? "Updated" : "Saved"}
          </p>
        </div>

        <div className="px-6 pb-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-border-soft">
            {faviconUrl && (
              <img
                src={faviconUrl}
                alt=""
                className="size-5 rounded-sm shrink-0"
                onError={(e) => { e.currentTarget.style.display = "none" }}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground truncate">{title}</p>
              <p className="text-xs text-muted-foreground truncate">{hostname}</p>
            </div>
          </div>
        </div>

        {!isEdit && (
          <div className="px-6 py-3 flex items-center gap-4 text-xs text-muted-foreground">
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
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ExternalLink className="size-3" />
              Wayback
            </a>
          </div>
        )}
      </div>
    )
  }

  const collectionOptions = collections.map((c) => ({
    value: String(c.id),
    label: c.name,
  }))

  const allTagNames = tags.map((t) => t.name)

  return (
    <div className="w-[360px] max-h-[600px] flex flex-col relative">
      {/* Fixed header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
        <div className="flex items-center">
          <span className="text-foreground text-base font-semibold tracking-tight">
            Rōnin
          </span>
          <span className="bg-shu mb-1.5 ml-0.5 inline-block size-1.5 shrink-0 rounded-[1px] shadow-[0_0_3px_oklch(0.55_0.14_30/0.3)]" />
        </div>
        <button
          type="button"
          onClick={() => typeof chrome !== "undefined" && chrome.runtime?.openOptionsPage()}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="size-3.5" />
        </button>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto thin-scrollbar content-scroll-mist">
        {/* Page preview card */}
        <div className="mx-6 mb-4 p-3 rounded-lg bg-surface border border-border-soft">
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
                        className: "size-7 rounded-sm bg-surface2 flex items-center justify-center text-xs font-medium text-muted-foreground",
                        textContent: hostname[0]?.toUpperCase() || "?",
                      }),
                    )
                  }}
                />
              ) : (
                <div className="size-7 rounded-sm bg-surface2 animate-pulse" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground font-medium truncate leading-tight">
                {metadata?.title || initialTitle}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{hostname}</p>
            </div>
            {isEdit && (
              <span className="shrink-0 self-start text-[10px] font-medium uppercase tracking-wider text-shu bg-accent-dim px-1.5 py-0.5 rounded">
                Saved
              </span>
            )}
          </div>
          {metadata?.preview_image && (
            <img
              src={metadata.preview_image}
              alt=""
              className="mt-2.5 w-full h-[120px] object-cover rounded-md"
              onError={(e) => { e.currentTarget.style.display = "none" }}
            />
          )}
        </div>

        <form id="bookmark-form" onSubmit={handleSubmit}>
          <div className="px-6 py-3 flex flex-col gap-6">
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
                  <span className="text-muted-foreground font-medium">without</span> the hash (#). If
                  a tag does not exist it will be automatically created.
                </>
              }
            />

            <div>
              <button
                type="button"
                className="text-sm font-medium text-foreground/80 cursor-pointer select-none flex items-center gap-0.5"
                onClick={() => setNotesOpen((o) => !o)}
              >
                <ChevronRight
                  className={cn(
                    "size-4 text-muted2/50 transition-transform duration-200",
                    notesOpen && "rotate-90",
                  )}
                />
                Notes
              </button>
              {notesOpen && (
                <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-150">
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

      <div className="p-6 pb-7 shrink-0">
        <Button form="bookmark-form" type="submit" className="w-full h-9" disabled={saving}>
          {saving ? <Loader2 className="animate-spin size-4" /> : isEdit ? "Update" : "Save"}
        </Button>
        {message && (
          <p
            className={cn(
              "text-xs text-center mt-3",
              message.type === "error" ? "text-destructive" : "text-kitsune",
            )}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  )
}
