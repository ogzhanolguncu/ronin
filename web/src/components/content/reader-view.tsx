import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import {
  readableContentQueryOptions,
  highlightsQueryOptions,
  useCreateHighlight,
  useUpdateHighlight,
  useDeleteHighlight,
} from "@/lib/queries/highlights";
import {
  computeAnchor,
  createHighlightRange,
  applyHighlightMark,
  clearAllHighlightMarks,
} from "@/lib/highlight-anchoring";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  HighlighterIcon,
  ChevronLeftIcon,
  CloseIcon,
} from "@/components/ui/icons";
import type { Highlight, HighlightColor } from "@/lib/types";
import "./reader-view.css";

const HIGHLIGHT_COLORS: {
  value: HighlightColor;
  color: string;
  label: string;
}[] = [
  { value: "yellow", color: "oklch(0.76 0.05 80)", label: "Kitsune" },
  { value: "green", color: "oklch(0.70 0.05 145)", label: "Matcha" },
  { value: "blue", color: "oklch(0.66 0.05 250)", label: "Ai" },
  { value: "pink", color: "oklch(0.70 0.05 310)", label: "Fuji" },
];

function getHighlightColor(value: HighlightColor): string {
  return (
    HIGHLIGHT_COLORS.find((c) => c.value === value)?.color ??
    HIGHLIGHT_COLORS[0].color
  );
}

type SelectionAnchor = {
  text: string;
  startPath: string;
  startOffset: number;
  endPath: string;
  endOffset: number;
  rect: DOMRect;
};

export default function ReaderView({
  bookmarkId,
  onClose,
}: {
  bookmarkId: number;
  onClose: () => void;
}) {
  const { data: content } = useSuspenseQuery(
    readableContentQueryOptions(bookmarkId),
  );
  const { data: highlights = [] } = useQuery(
    highlightsQueryOptions(bookmarkId),
  );

  const articleRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selection, setSelection] = useState<SelectionAnchor | null>(null);
  const [activeHighlightId, setActiveHighlightId] = useState<number | null>(
    null,
  );
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(
    null,
  );
  const [editNote, setEditNote] = useState("");
  const [editColor, setEditColor] = useState<HighlightColor>("yellow");

  const createHighlight = useCreateHighlight();
  const updateHighlight = useUpdateHighlight();
  const deleteHighlight = useDeleteHighlight();

  const sanitizedHTML = useMemo(
    () =>
      DOMPurify.sanitize(content.html, {
        ADD_TAGS: ["mark"],
        ADD_ATTR: ["data-highlight-id"],
      }),
    [content.html],
  );

  // Apply highlights to DOM after render
  useEffect(() => {
    const root = articleRef.current;
    if (!root || !highlights) return;

    clearAllHighlightMarks(root);

    for (const hl of highlights) {
      const range = createHighlightRange(
        hl.start_path,
        hl.start_offset,
        hl.end_path,
        hl.end_offset,
        root,
      );
      if (!range) continue;
      applyHighlightMark(range, hl.id, hl.color, root);
    }
  }, [sanitizedHTML, highlights]);

  // Handle active highlight styling
  useEffect(() => {
    const root = articleRef.current;
    if (!root) return;

    root.querySelectorAll("mark.highlight-active").forEach((el) => {
      el.classList.remove("highlight-active");
    });

    if (activeHighlightId !== null) {
      root
        .querySelectorAll(`mark[data-highlight-id="${activeHighlightId}"]`)
        .forEach((el) => {
          el.classList.add("highlight-active");
        });
    }
  }, [activeHighlightId]);

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    const root = articleRef.current;
    if (!sel || sel.isCollapsed || !root || !sel.rangeCount) {
      return;
    }

    const range = sel.getRangeAt(0);
    if (
      !root.contains(range.startContainer) ||
      !root.contains(range.endContainer)
    ) {
      return;
    }

    const text = sel.toString().trim();
    if (!text || text.length > 4096) return;

    const start = computeAnchor(range.startContainer, range.startOffset, root);
    const end = computeAnchor(range.endContainer, range.endOffset, root);
    const rect = range.getBoundingClientRect();

    setSelection({
      text,
      startPath: start.path,
      startOffset: start.offset,
      endPath: end.path,
      endOffset: end.offset,
      rect,
    });
  }, []);

  const handleHighlightCreate = useCallback(
    (color: HighlightColor) => {
      if (!selection) return;

      createHighlight.mutate({
        bookmark_id: bookmarkId,
        text: selection.text,
        note: "",
        color,
        start_path: selection.startPath,
        start_offset: selection.startOffset,
        end_path: selection.endPath,
        end_offset: selection.endOffset,
      });

      window.getSelection()?.removeAllRanges();
      setSelection(null);
    },
    [selection, bookmarkId, createHighlight],
  );

  const dismissSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  // Click on a highlight mark in the article
  const handleArticleClick = useCallback(
    (e: React.MouseEvent) => {
      const mark = (e.target as HTMLElement).closest("mark[data-highlight-id]");
      if (!mark) return;

      const hlId = Number(mark.getAttribute("data-highlight-id"));
      const hl = highlights?.find((h) => h.id === hlId);
      if (!hl) return;

      setActiveHighlightId(hlId);
      setEditingHighlight(hl);
      setEditNote(hl.note);
      setEditColor(hl.color);
      setSidebarOpen(true);
    },
    [highlights],
  );

  // Scroll to a highlight in the article
  const scrollToHighlight = useCallback((hlId: number) => {
    const root = articleRef.current;
    if (!root) return;

    const mark = root.querySelector(`mark[data-highlight-id="${hlId}"]`);
    if (mark) {
      mark.scrollIntoView({ behavior: "smooth", block: "center" });
      setActiveHighlightId(hlId);
    }
  }, []);

  const handleSaveNote = useCallback(() => {
    if (!editingHighlight) return;
    updateHighlight.mutate({
      id: editingHighlight.id,
      bookmark_id: bookmarkId,
      note: editNote,
      color: editColor,
    });
    setEditingHighlight(null);
    setActiveHighlightId(null);
  }, [editingHighlight, editNote, editColor, bookmarkId, updateHighlight]);

  const handleDeleteHighlight = useCallback(
    (hl: Highlight) => {
      deleteHighlight.mutate({ id: hl.id, bookmark_id: bookmarkId });
      if (editingHighlight?.id === hl.id) {
        setEditingHighlight(null);
        setActiveHighlightId(null);
      }
    },
    [bookmarkId, deleteHighlight, editingHighlight],
  );

  // Close sidebar on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (selection) {
          dismissSelection();
        } else if (sidebarOpen) {
          setSidebarOpen(false);
          setEditingHighlight(null);
          setActiveHighlightId(null);
        } else {
          onClose();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selection, sidebarOpen, onClose, dismissSelection]);

  // Dismiss selection when clicking outside toolbar
  useEffect(() => {
    if (!selection) return;
    function handleClickOutside(e: MouseEvent) {
      const toolbar = document.getElementById("highlight-toolbar");
      if (toolbar && !toolbar.contains(e.target as Node)) {
        setSelection(null);
      }
    }
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [selection]);

  return (
    <div className="reader-bg fixed inset-0 z-50 flex">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-14 shrink-0 items-center justify-between px-8">
          <button
            type="button"
            onClick={onClose}
            className="text-muted2/45 hover:text-muted2/80 inline-flex items-center gap-1.5 text-xs uppercase tracking-wider transition-colors duration-300"
          >
            <ChevronLeftIcon className="size-3" strokeWidth={1.5} />
            Back
          </button>
          <div className="flex items-center gap-3">
            {content.source_url && (
              <a
                href={content.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted2/45 hover:text-muted2/80 text-xs uppercase tracking-wider transition-colors duration-300"
              >
                Source
              </a>
            )}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={cn(
                "inline-flex items-center gap-1.5 text-xs uppercase tracking-wider transition-colors duration-300",
                sidebarOpen
                  ? "text-primary/70"
                  : "text-muted2/45 hover:text-muted2/80",
              )}
            >
              <HighlighterIcon className="size-3" />
              Highlights{highlights?.length ? ` (${highlights.length})` : ""}
            </button>
          </div>
        </div>

        <div className="thin-scrollbar reader-scroll-mist flex-1 overflow-y-auto py-12">
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

      {sidebarOpen && (
        <aside className="bg-surface reader-sidebar-enter paper-grain sidebar-edge flex w-80 shrink-0 flex-col overflow-hidden shadow-[-1px_0_0_oklch(0.80_0.01_80/0.1)]">
          <div className="flex h-14 shrink-0 items-center justify-between px-5">
            <button
              type="button"
              onClick={() => {
                setSidebarOpen(false);
                setEditingHighlight(null);
                setActiveHighlightId(null);
              }}
              className="text-muted2/30 hover:text-muted2/70 ml-auto p-1 transition-colors duration-300"
            >
              <CloseIcon className="size-3.5" />
            </button>
          </div>

          <div className="thin-scrollbar content-scroll-mist flex-1 overflow-y-auto">
            {!highlights?.length && (
              <p className="text-muted-foreground px-5 py-10 text-center text-sm leading-relaxed">
                Select text to highlight
              </p>
            )}

            {highlights?.map((hl) => {
              const isActive = activeHighlightId === hl.id;
              const hlColor = getHighlightColor(hl.color);
              return (
                <div
                  key={hl.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 px-5 py-3.5 transition-colors duration-200",
                    isActive ? "bg-surface2" : "hover:bg-surface2/50",
                  )}
                  onClick={() => {
                    scrollToHighlight(hl.id);
                    setEditingHighlight(hl);
                    setEditNote(hl.note);
                    setEditColor(hl.color);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2.5">
                      <span
                        className="mt-0.5 h-4 w-[3px] shrink-0 rounded-[1px] opacity-50"
                        style={{ backgroundColor: hlColor }}
                      />
                      <p
                        className={cn(
                          "line-clamp-3 text-xs leading-[1.85] transition-colors",
                          isActive ? "text-foreground" : "text-text2",
                        )}
                      >
                        {hl.text}
                      </p>
                    </div>
                    {hl.note && (
                      <p className="text-text2 mt-4 line-clamp-2 text-xs leading-relaxed italic">
                        {hl.note}
                      </p>
                    )}

                    <span className="text-text2/30 mt-3 block font-mono text-[10px]">
                      {formatRelativeTime(hl.created_at)}
                    </span>

                    {editingHighlight?.id === hl.id && (
                      <div
                        className="border-border-soft/50 mt-3 space-y-3 border-t pt-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <textarea
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder="Add a note..."
                          className="bg-background border-border-soft/50 focus:ring-ring placeholder:text-muted-foreground min-h-[64px] w-full resize-none rounded-sm border px-3 py-2 text-xs transition-colors duration-200 focus:ring-1 focus:outline-none"
                          rows={3}
                        />
                        <div className="flex items-center gap-2">
                          {HIGHLIGHT_COLORS.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setEditColor(c.value)}
                              className={cn(
                                "dot-glow size-3 rounded-full transition-all duration-200",
                                editColor === c.value
                                  ? "ring-offset-surface scale-110 ring-2 ring-offset-2"
                                  : "opacity-65 hover:opacity-80",
                              )}
                              style={{
                                backgroundColor: c.color,
                                color: c.color,
                                ...(editColor === c.value
                                  ? ({
                                      "--tw-ring-color": c.color,
                                    } as React.CSSProperties)
                                  : {}),
                              }}
                            />
                          ))}
                          <div className="flex-1" />
                          <button
                            type="button"
                            onClick={() => handleDeleteHighlight(hl)}
                            className="text-text2 hover:text-shu text-xs transition-colors duration-300"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveNote}
                            className="text-primary hover:text-accent-hover text-xs font-medium transition-colors duration-200"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {selection && (
        <FloatingToolbar
          rect={selection.rect}
          onSelect={handleHighlightCreate}
        />
      )}
    </div>
  );
}

function FloatingToolbar({
  rect,
  onSelect,
}: {
  rect: DOMRect;
  onSelect: (color: HighlightColor) => void;
}) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    const toolbarRect = toolbar.getBoundingClientRect();
    let top = rect.top - toolbarRect.height - 8;
    let left = rect.left + rect.width / 2 - toolbarRect.width / 2;

    // Keep within viewport
    if (top < 8) top = rect.bottom + 8;
    if (left < 8) left = 8;
    if (left + toolbarRect.width > window.innerWidth - 8) {
      left = window.innerWidth - toolbarRect.width - 8;
    }

    setPosition({ top, left });
  }, [rect]);

  return (
    <div
      id="highlight-toolbar"
      ref={toolbarRef}
      className="bg-surface/90 border-border-soft reader-toolbar-enter fixed z-[100] flex items-center gap-1.5 rounded-sm border px-2 py-1.5 shadow-sm backdrop-blur-sm"
      style={{ top: position.top, left: position.left }}
    >
      {HIGHLIGHT_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onSelect(c.value)}
          className="dot-glow ring-offset-surface size-4 rounded-full ring-2 ring-offset-2 transition-all duration-200 hover:scale-110"
          style={{ backgroundColor: c.color, color: c.color }}
          title={c.label}
        />
      ))}
    </div>
  );
}
