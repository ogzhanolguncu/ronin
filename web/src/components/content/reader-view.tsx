import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useSuspenseQuery, useQuery } from "@tanstack/react-query"
import DOMPurify from "dompurify"
import { readableContentQueryOptions, highlightsQueryOptions, useCreateHighlight, useUpdateHighlight, useDeleteHighlight } from "@/lib/queries/highlights"
import { computeAnchor, createHighlightRange, applyHighlightMark, clearAllHighlightMarks } from "@/lib/highlight-anchoring"
import { formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Highlight, HighlightColor } from "@/lib/types"
import "./reader-view.css"

const HIGHLIGHT_COLORS: { value: HighlightColor; color: string; label: string }[] = [
  { value: "yellow", color: "oklch(0.78 0.08 80)", label: "Kitsune" },
  { value: "green", color: "oklch(0.72 0.08 145)", label: "Matcha" },
  { value: "blue", color: "oklch(0.68 0.08 250)", label: "Ai" },
  { value: "pink", color: "oklch(0.72 0.07 310)", label: "Fuji" },
]

function getHighlightColor(value: HighlightColor): string {
  return HIGHLIGHT_COLORS.find((c) => c.value === value)?.color ?? HIGHLIGHT_COLORS[0].color
}

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

    clearAllHighlightMarks(root)

    for (const hl of highlights) {
      const range = createHighlightRange(
        hl.start_path,
        hl.start_offset,
        hl.end_path,
        hl.end_offset,
        root,
      )
      if (!range) continue
      applyHighlightMark(range, hl.id, hl.color, root)
    }
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
    <div className="fixed inset-0 z-50 flex reader-bg">
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navigation */}
        <div className="flex items-center justify-between h-11 px-5 shrink-0 border-b border-border-soft/50">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted2 hover:text-foreground transition-colors duration-200 inline-flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            Back
          </button>
          <div className="flex items-center gap-3">
            {content.source_url && (
              <a
                href={content.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted2 hover:text-foreground transition-colors duration-200"
              >
                Source
              </a>
            )}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={cn(
                "transition-colors duration-200 inline-flex items-center gap-1.5 text-sm",
                sidebarOpen
                  ? "text-primary"
                  : "text-muted2 hover:text-foreground",
              )}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 11-6 6v3h9l3-3" /><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" /></svg>
              Highlights{highlights?.length ? ` (${highlights.length})` : ""}
            </button>
          </div>
        </div>

        {/* Article */}
        <div className="flex-1 overflow-y-auto thin-scrollbar py-12 reader-scroll-mist">
          <div className="reader-article">
            <h1 className="reader-title">{content.title}</h1>
            {content.source_url && (
              <p className="reader-source">
                {new URL(content.source_url).hostname.replace(/^www\./, "")}
              </p>
            )}
          </div>
          <div className="reader-title-divider" />
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
        <aside className="w-80 bg-surface flex flex-col overflow-hidden shrink-0 reader-sidebar-enter paper-grain border-l border-border-soft/60 sidebar-edge">
          <div className="h-11 px-4 border-b border-border-soft/50 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={() => {
                setSidebarOpen(false)
                setEditingHighlight(null)
                setActiveHighlightId(null)
              }}
              className="text-muted2 hover:text-foreground transition-colors duration-200 p-1 ml-auto"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto thin-scrollbar content-scroll-mist">
            {!highlights?.length && (
              <p className="text-xs text-muted-foreground px-5 py-8 text-center leading-relaxed">
                Select text to highlight
              </p>
            )}

            {highlights?.map((hl) => {
              const isActive = activeHighlightId === hl.id
              const hlColor = getHighlightColor(hl.color)
              return (
                <div
                  key={hl.id}
                  className={cn(
                    "px-4 py-3 cursor-pointer transition-colors duration-200 flex items-start gap-2.5",
                    isActive
                      ? "bg-surface2"
                      : "hover:bg-surface2/50",
                  )}
                  onClick={() => {
                    scrollToHighlight(hl.id)
                    setEditingHighlight(hl)
                    setEditNote(hl.note)
                    setEditColor(hl.color)
                  }}
                >
                  {/* Color dot — like collections */}
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full mt-0.5 dot-glow"
                    style={{ backgroundColor: hlColor, color: hlColor }}
                  />

                  <div className="min-w-0 flex-1">
                    {/* Quoted excerpt */}
                    <p className={cn(
                      "text-sm line-clamp-3 leading-relaxed transition-colors",
                      isActive ? "text-foreground" : "text-text2",
                    )}>
                      {hl.text}
                    </p>

                    {/* Note */}
                    {hl.note && (
                      <p className="text-xs text-text2 mt-1.5 line-clamp-2 leading-relaxed">
                        {hl.note}
                      </p>
                    )}

                    <span className="text-xs text-muted2 mt-1.5 block font-mono">
                      {formatRelativeTime(hl.created_at)}
                    </span>

                    {/* Edit form */}
                    {editingHighlight?.id === hl.id && (
                      <div className="mt-3 pt-3 border-t border-border-soft/50 space-y-3" onClick={(e) => e.stopPropagation()}>
                        <textarea
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder="Add a note..."
                          className="w-full text-xs bg-background border border-border-soft/50 rounded-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring min-h-[64px] transition-colors duration-200 placeholder:text-muted-foreground"
                          rows={3}
                        />
                        <div className="flex items-center gap-2">
                          {HIGHLIGHT_COLORS.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setEditColor(c.value)}
                              className={cn(
                                "h-3 w-3 rounded-full transition-all duration-200",
                                editColor === c.value
                                  ? "dot-glow ring-2 ring-offset-2 ring-offset-surface"
                                  : "opacity-50 hover:opacity-80",
                              )}
                              style={{
                                backgroundColor: c.color,
                                color: c.color,
                                ...(editColor === c.value ? { "--tw-ring-color": c.color } as React.CSSProperties : {}),
                              }}
                            />
                          ))}
                          <div className="flex-1" />
                          <button
                            type="button"
                            onClick={() => handleDeleteHighlight(hl)}
                            className="text-xs text-muted2 hover:text-shu transition-colors duration-200"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveNote}
                            className="text-xs text-primary font-medium hover:text-accent-hover transition-colors duration-200"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </aside>
      )}

      {/* Floating highlight toolbar */}
      {selection && (
        <FloatingToolbar
          rect={selection.rect}
          onSelect={handleHighlightCreate}
        />
      )}
    </div>
  )
}

function FloatingToolbar({
  rect,
  onSelect,
}: {
  rect: DOMRect
  onSelect: (color: HighlightColor) => void
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
      className="fixed z-[100] flex items-center gap-1.5 bg-surface/90 backdrop-blur-sm border border-border-soft rounded-sm shadow-sm px-2 py-1.5 reader-toolbar-enter"
      style={{ top: position.top, left: position.left }}
    >
      {HIGHLIGHT_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onSelect(c.value)}
          className="w-5 h-5 rounded-full transition-transform duration-200 hover:scale-110"
          style={{ backgroundColor: c.color }}
          title={c.label}
        />
      ))}
    </div>
  )
}
