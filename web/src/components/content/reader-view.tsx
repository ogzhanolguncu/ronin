import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useSuspenseQuery, useQuery } from "@tanstack/react-query"
import DOMPurify from "dompurify"
import { readableContentQueryOptions, highlightsQueryOptions, useCreateHighlight, useUpdateHighlight, useDeleteHighlight } from "@/lib/queries/highlights"
import { computeAnchor, createHighlightRange, applyHighlightMark, clearAllHighlightMarks } from "@/lib/highlight-anchoring"
import { formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Highlight, HighlightColor } from "@/lib/types"
import "./reader-view.css"

const HIGHLIGHT_COLORS: { value: HighlightColor; bg: string }[] = [
  { value: "yellow", bg: "bg-yellow-300/60 dark:bg-yellow-500/40" },
  { value: "green", bg: "bg-green-300/60 dark:bg-green-500/40" },
  { value: "blue", bg: "bg-blue-300/60 dark:bg-blue-500/40" },
  { value: "pink", bg: "bg-pink-300/60 dark:bg-pink-500/40" },
]

type SelectionAnchor = {
  text: string
  startPath: string
  startOffset: number
  endPath: string
  endOffset: number
  rect: DOMRect
}

export function ReaderView({
  bookmarkId,
  onClose,
}: {
  bookmarkId: number
  onClose: () => void
}) {
  const { data: content } = useSuspenseQuery(readableContentQueryOptions(bookmarkId))
  const { data: highlights = [] } = useQuery(highlightsQueryOptions(bookmarkId))

  const articleRef = useRef<HTMLDivElement>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selection, setSelection] = useState<SelectionAnchor | null>(null)
  const [activeHighlightId, setActiveHighlightId] = useState<number | null>(null)
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null)
  const [editNote, setEditNote] = useState("")
  const [editColor, setEditColor] = useState<HighlightColor>("yellow")

  const createHighlight = useCreateHighlight()
  const updateHighlight = useUpdateHighlight()
  const deleteHighlight = useDeleteHighlight()

  const sanitizedHTML = useMemo(
    () =>
      DOMPurify.sanitize(content.html, {
        ADD_TAGS: ["mark"],
        ADD_ATTR: ["data-highlight-id"],
      }),
    [content.html],
  )

  // Apply highlights to DOM after render
  useEffect(() => {
    const root = articleRef.current
    if (!root || !highlights) return

    console.log("[highlights] applying", highlights.length, "highlights to DOM")
    clearAllHighlightMarks(root)

    for (const hl of highlights) {
      console.log("[highlights] resolving:", { start_path: hl.start_path, start_offset: hl.start_offset, end_path: hl.end_path, end_offset: hl.end_offset })
      const range = createHighlightRange(
        hl.start_path,
        hl.start_offset,
        hl.end_path,
        hl.end_offset,
        root,
      )
      if (!range) {
        console.warn("[highlights] failed to resolve range for highlight", hl.id)
        continue
      }
      console.log("[highlights] applying mark for highlight", hl.id, range.toString().slice(0, 50))
      applyHighlightMark(range, hl.id, hl.color, root)
    }

    const marks = root.querySelectorAll("mark[data-highlight-id]")
    console.log("[highlights] total marks in DOM after apply:", marks.length)
  }, [sanitizedHTML, highlights])

  // Handle active highlight styling
  useEffect(() => {
    const root = articleRef.current
    if (!root) return

    root.querySelectorAll("mark.highlight-active").forEach((el) => {
      el.classList.remove("highlight-active")
    })

    if (activeHighlightId !== null) {
      root.querySelectorAll(`mark[data-highlight-id="${activeHighlightId}"]`).forEach((el) => {
        el.classList.add("highlight-active")
      })
    }
  }, [activeHighlightId])

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection()
    const root = articleRef.current
    if (!sel || sel.isCollapsed || !root || !sel.rangeCount) {
      return
    }

    const range = sel.getRangeAt(0)
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
      return
    }

    const text = sel.toString().trim()
    if (!text || text.length > 4096) return

    const start = computeAnchor(range.startContainer, range.startOffset, root)
    const end = computeAnchor(range.endContainer, range.endOffset, root)
    const rect = range.getBoundingClientRect()

    console.log("[selection] computed anchors:", { start, end, text: text.slice(0, 50) })

    setSelection({
      text,
      startPath: start.path,
      startOffset: start.offset,
      endPath: end.path,
      endOffset: end.offset,
      rect,
    })
  }, [])

  const handleHighlightCreate = useCallback(
    (color: HighlightColor) => {
      if (!selection) return

      createHighlight.mutate({
        bookmark_id: bookmarkId,
        text: selection.text,
        note: "",
        color,
        start_path: selection.startPath,
        start_offset: selection.startOffset,
        end_path: selection.endPath,
        end_offset: selection.endOffset,
      })

      window.getSelection()?.removeAllRanges()
      setSelection(null)
    },
    [selection, bookmarkId, createHighlight],
  )

  const dismissSelection = useCallback(() => {
    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }, [])

  // Click on a highlight mark in the article
  const handleArticleClick = useCallback(
    (e: React.MouseEvent) => {
      const mark = (e.target as HTMLElement).closest("mark[data-highlight-id]")
      if (!mark) return

      const hlId = Number(mark.getAttribute("data-highlight-id"))
      const hl = highlights?.find((h) => h.id === hlId)
      if (!hl) return

      setActiveHighlightId(hlId)
      setEditingHighlight(hl)
      setEditNote(hl.note)
      setEditColor(hl.color)
      setSidebarOpen(true)
    },
    [highlights],
  )

  // Scroll to a highlight in the article
  const scrollToHighlight = useCallback((hlId: number) => {
    const root = articleRef.current
    if (!root) return

    const mark = root.querySelector(`mark[data-highlight-id="${hlId}"]`)
    if (mark) {
      mark.scrollIntoView({ behavior: "smooth", block: "center" })
      setActiveHighlightId(hlId)
    }
  }, [])

  const handleSaveNote = useCallback(() => {
    if (!editingHighlight) return
    updateHighlight.mutate({
      id: editingHighlight.id,
      bookmark_id: bookmarkId,
      note: editNote,
      color: editColor,
    })
    setEditingHighlight(null)
    setActiveHighlightId(null)
  }, [editingHighlight, editNote, editColor, bookmarkId, updateHighlight])

  const handleDeleteHighlight = useCallback(
    (hl: Highlight) => {
      deleteHighlight.mutate({ id: hl.id, bookmark_id: bookmarkId })
      if (editingHighlight?.id === hl.id) {
        setEditingHighlight(null)
        setActiveHighlightId(null)
      }
    },
    [bookmarkId, deleteHighlight, editingHighlight],
  )

  // Close sidebar on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (selection) {
          dismissSelection()
        } else if (sidebarOpen) {
          setSidebarOpen(false)
          setEditingHighlight(null)
          setActiveHighlightId(null)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selection, sidebarOpen, onClose, dismissSelection])

  // Dismiss selection when clicking outside toolbar
  useEffect(() => {
    if (!selection) return
    function handleClickOutside(e: MouseEvent) {
      const toolbar = document.getElementById("highlight-toolbar")
      if (toolbar && !toolbar.contains(e.target as Node)) {
        setSelection(null)
      }
    }
    window.addEventListener("mousedown", handleClickOutside)
    return () => window.removeEventListener("mousedown", handleClickOutside)
  }, [selection])

  return (
    <div className="fixed inset-0 z-50 flex bg-background">
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-6 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back
          </button>
          <div className="h-4 w-px bg-border/50" />
          <h1 className="text-sm font-medium text-foreground truncate flex-1">
            {content.title}
          </h1>
          {content.source_url && (
            <a
              href={content.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              Source
            </a>
          )}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-sm transition-colors inline-flex items-center gap-1.5",
              sidebarOpen
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>
            {highlights?.length ? highlights.length : ""}
            {" "}Highlights
          </button>
        </header>

        {/* Article */}
        <div className="flex-1 overflow-y-auto thin-scrollbar py-12">
          <div
            ref={articleRef}
            className="reader-article"
            onMouseUp={handleMouseUp}
            onClick={handleArticleClick}
            dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
          />
        </div>
      </div>

      {/* Highlight sidebar */}
      {sidebarOpen && (
        <aside className="w-80 border-l border-border/50 bg-surface flex flex-col overflow-hidden shrink-0">
          <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Highlights</span>
            <button
              type="button"
              onClick={() => {
                setSidebarOpen(false)
                setEditingHighlight(null)
                setActiveHighlightId(null)
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto thin-scrollbar">
            {!highlights?.length && (
              <p className="text-xs text-muted-foreground px-4 py-6 text-center">
                Select text in the article to create highlights
              </p>
            )}

            {highlights?.map((hl) => (
              <div
                key={hl.id}
                className={cn(
                  "px-4 py-3 border-b border-border/30 cursor-pointer transition-colors",
                  activeHighlightId === hl.id ? "bg-primary/5" : "hover:bg-foreground/[0.02]",
                )}
                onClick={() => {
                  scrollToHighlight(hl.id)
                  setEditingHighlight(hl)
                  setEditNote(hl.note)
                  setEditColor(hl.color)
                }}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      "w-2.5 h-2.5 rounded-full mt-1 shrink-0",
                      hl.color === "yellow" && "bg-yellow-400",
                      hl.color === "green" && "bg-green-400",
                      hl.color === "blue" && "bg-blue-400",
                      hl.color === "pink" && "bg-pink-400",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground/80 line-clamp-3 leading-relaxed">
                      &ldquo;{hl.text}&rdquo;
                    </p>
                    {hl.note && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                        {hl.note}
                      </p>
                    )}
                    <span className="text-[10px] text-muted-foreground/60 mt-1 block">
                      {formatRelativeTime(hl.created_at)}
                    </span>
                  </div>
                </div>

                {/* Inline edit form when this highlight is selected */}
                {editingHighlight?.id === hl.id && (
                  <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <textarea
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Add a note..."
                      className="w-full text-xs bg-background border border-border/50 rounded-sm px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring min-h-[60px]"
                      rows={3}
                    />
                    <div className="flex items-center gap-1.5">
                      {HIGHLIGHT_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setEditColor(c.value)}
                          className={cn(
                            "w-5 h-5 rounded-full transition-all",
                            c.value === "yellow" && "bg-yellow-400",
                            c.value === "green" && "bg-green-400",
                            c.value === "blue" && "bg-blue-400",
                            c.value === "pink" && "bg-pink-400",
                            editColor === c.value && "ring-2 ring-primary ring-offset-1 ring-offset-surface",
                          )}
                        />
                      ))}
                      <div className="flex-1" />
                      <button
                        type="button"
                        onClick={() => handleDeleteHighlight(hl)}
                        className="text-[10px] text-destructive/70 hover:text-destructive transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNote}
                        className="text-[10px] text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* Floating highlight toolbar */}
      {selection && (
        <FloatingToolbar
          rect={selection.rect}
          onSelect={handleHighlightCreate}
          onDismiss={dismissSelection}
        />
      )}
    </div>
  )
}

function FloatingToolbar({
  rect,
  onSelect,
  onDismiss,
}: {
  rect: DOMRect
  onSelect: (color: HighlightColor) => void
  onDismiss: () => void
}) {
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    const toolbar = toolbarRef.current
    if (!toolbar) return

    const toolbarRect = toolbar.getBoundingClientRect()
    let top = rect.top - toolbarRect.height - 8
    let left = rect.left + rect.width / 2 - toolbarRect.width / 2

    // Keep within viewport
    if (top < 8) top = rect.bottom + 8
    if (left < 8) left = 8
    if (left + toolbarRect.width > window.innerWidth - 8) {
      left = window.innerWidth - toolbarRect.width - 8
    }

    setPosition({ top, left })
  }, [rect])

  return (
    <div
      id="highlight-toolbar"
      ref={toolbarRef}
      className="fixed z-[100] flex items-center gap-1 bg-surface border border-border/60 rounded-md shadow-lg px-1.5 py-1"
      style={{ top: position.top, left: position.left }}
    >
      {HIGHLIGHT_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onSelect(c.value)}
          className={cn(
            "w-6 h-6 rounded-full transition-transform hover:scale-110",
            c.value === "yellow" && "bg-yellow-400",
            c.value === "green" && "bg-green-400",
            c.value === "blue" && "bg-blue-400",
            c.value === "pink" && "bg-pink-400",
          )}
          title={`Highlight ${c.value}`}
        />
      ))}
      <div className="w-px h-4 bg-border/50 mx-0.5" />
      <button
        type="button"
        onClick={onDismiss}
        className="text-xs text-muted-foreground hover:text-foreground px-1 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
  )
}
