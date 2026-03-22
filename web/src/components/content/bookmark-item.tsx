import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArchiveIcon, DeleteIcon, NotesIcon, ViewIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { type Bookmark, getHostname } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format-time";

export function BookmarkItem({
  bookmark,
  onTagClick,
  onViewClick,
}: {
  bookmark: Bookmark;
  onTagClick?: (tag: string) => void;
  onViewClick?: (bookmark: Bookmark) => void;
}) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const archiveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasNotes = Boolean(bookmark.notes);

  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
      if (archiveTimeoutRef.current) clearTimeout(archiveTimeoutRef.current);
    };
  }, []);

  function handleDeleteClick() {
    if (confirmingDelete) {
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
      setConfirmingDelete(false);
      console.log("delete", bookmark.id);
    } else {
      setConfirmingDelete(true);
      deleteTimeoutRef.current = setTimeout(() => {
        setConfirmingDelete(false);
      }, 3000);
    }
  }

  function handleArchiveClick() {
    if (confirmingArchive) {
      if (archiveTimeoutRef.current) clearTimeout(archiveTimeoutRef.current);
      setConfirmingArchive(false);
      console.log("archive", bookmark.id);
    } else {
      setConfirmingArchive(true);
      archiveTimeoutRef.current = setTimeout(() => {
        setConfirmingArchive(false);
      }, 3000);
    }
  }

  return (
    <div className="group relative px-6 py-6 first:border-t-0 transition-colors duration-200 hover:bg-surface">
      {/* Action cluster — revealed on hover */}
      <div className={cn(
        "absolute top-3 right-4 flex items-center gap-0.5 transition-opacity duration-200 ease-out",
        confirmingDelete || confirmingArchive
          ? "opacity-100"
          : "opacity-0 group-hover:opacity-100",
      )}>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted2/60 hover:text-foreground transition-colors duration-300 ease-out"
          onClick={() => onViewClick?.(bookmark)}
        >
          <ViewIcon />
        </Button>
        <Button
          variant="ghost"
          size={confirmingArchive ? "xs" : "icon-xs"}
          className={cn(
            "transition-all duration-300 ease-out",
            confirmingArchive
              ? "bg-yellow-dim text-kitsune hover:bg-kitsune/15"
              : "text-muted2/60 hover:text-kitsune"
          )}
          onClick={handleArchiveClick}
        >
          <ArchiveIcon />
          {confirmingArchive && (
            <span className="text-[11px] font-medium">archive?</span>
          )}
        </Button>
        <Button
          variant="ghost"
          size={confirmingDelete ? "xs" : "icon-xs"}
          className={cn(
            "transition-all duration-300 ease-out",
            confirmingDelete
              ? "bg-red-dim text-shu hover:bg-shu/15"
              : "text-muted2/60 hover:text-shu"
          )}
          onClick={handleDeleteClick}
        >
          <DeleteIcon />
          {confirmingDelete && (
            <span className="text-[11px] font-medium">delete?</span>
          )}
        </Button>
        {hasNotes && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted2/60 hover:text-foreground transition-colors duration-300 ease-out"
            onClick={() => setNotesOpen((o) => !o)}
          >
            <NotesIcon />
          </Button>
        )}
      </div>

      {/* Row 1: Favicon + Title */}
      <div className="flex items-center gap-2 min-w-0 pr-28">
        <img
          src={`/api/v1/favicons/${getHostname(bookmark.url)}`}
          alt=""
          className="w-4 h-4 rounded-sm shrink-0"
        />
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-foreground leading-snug tracking-tight truncate transition-colors hover:text-primary"
        >
          {bookmark.title}
        </a>
      </div>

      {/* Row 2: Hostname */}
      <p className="font-mono text-[11px] text-muted2 mt-1 truncate">
        {getHostname(bookmark.url)}
      </p>

      {/* Row 3: Description */}
      {bookmark.description && (
        <p className="text-xs text-muted2 font-light leading-relaxed mt-4 line-clamp-2 max-w-130">
          {bookmark.description}
        </p>
      )}

      {/* Row 4: Tags + Date */}
      <div className="flex items-center gap-2.5 mt-3 font-mono text-[11px] text-muted2">
        {bookmark.tags.slice(0, 6).map((tag) => (
          <button
            key={tag}
            type="button"
            className="transition-colors hover:text-primary"
            onClick={() => onTagClick?.(tag)}
          >
            #{tag}
          </button>
        ))}
        {bookmark.tags.length > 6 && (
          <span className="text-muted2/70 font-medium tabular-nums font-mono select-none">+{bookmark.tags.length - 6}</span>
        )}
        <span className="ml-auto">{formatRelativeTime(bookmark.created_at)}</span>
      </div>

      {/* Notes expansion */}
      {hasNotes && (
        <div
          className="grid ease-out"
          style={{
            gridTemplateRows: notesOpen ? "1fr" : "0fr",
            opacity: notesOpen ? 1 : 0,
            marginTop: notesOpen ? 16 : 0,
            transition: "grid-template-rows 250ms ease-out, opacity 200ms ease-out, margin-top 250ms ease-out",
          }}
        >
          <div className="overflow-hidden">
            <div className="pl-3 border-l-2 border-border-soft/50 group-hover:border-border-soft bg-surface/50 group-hover:bg-surface2 rounded-r py-2 pr-3 transition-colors duration-200">
              <p className="text-[11px] text-foreground/60 font-light leading-relaxed">
                {bookmark.notes}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
