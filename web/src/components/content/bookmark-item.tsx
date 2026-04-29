import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ArchiveIcon,
  DeleteIcon,
  NotesIcon,
  StarIcon,
  ViewIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { type Bookmark, getHostname } from "@/lib/types";
import { formatRelativeTime, formatCount } from "@/lib/format";

export function BookmarkItem({
  bookmark,
  onTagClick,
  onViewClick,
  onFavoriteClick,
  onDeleteClick,
  onArchiveClick,
  onReadClick,
}: {
  bookmark: Bookmark;
  onTagClick?: (tag: string) => void;
  onViewClick?: (bookmark: Bookmark) => void;
  onFavoriteClick?: (bookmark: Bookmark) => void;
  onDeleteClick?: (bookmark: Bookmark) => void;
  onArchiveClick?: (bookmark: Bookmark) => void;
  onReadClick?: (bookmark: Bookmark) => void;
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
      onDeleteClick?.(bookmark);
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
      onArchiveClick?.(bookmark);
    } else {
      setConfirmingArchive(true);
      archiveTimeoutRef.current = setTimeout(() => {
        setConfirmingArchive(false);
      }, 3000);
    }
  }

  return (
    <div className="group hover:bg-surface relative px-6 py-6 transition-colors duration-200 first:border-t-0">
      {/* Action cluster — revealed on hover */}
      <div
        className={cn(
          "absolute top-3 right-4 flex items-center gap-0.5 transition-opacity duration-200 ease-out",
          confirmingDelete || confirmingArchive
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100",
        )}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            "transition-colors duration-300 ease-out",
            bookmark.favorite
              ? "text-kitsune hover:text-kitsune/70"
              : "text-muted2/60 hover:text-kitsune",
          )}
          onClick={() => onFavoriteClick?.(bookmark)}
        >
          <StarIcon className={cn(bookmark.favorite && "fill-current")} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted2/60 hover:text-foreground transition-colors duration-300 ease-out"
          onClick={() => onViewClick?.(bookmark)}
        >
          <ViewIcon />
        </Button>
        <Button
          variant="ghost"
          size={confirmingArchive ? "sm" : "icon-sm"}
          className={cn(
            "transition-all duration-300 ease-out",
            confirmingArchive
              ? "bg-yellow-dim text-kitsune hover:bg-kitsune/15"
              : "text-muted2/60 hover:text-kitsune",
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
          size={confirmingDelete ? "sm" : "icon-sm"}
          className={cn(
            "transition-all duration-300 ease-out",
            confirmingDelete
              ? "bg-red-dim text-shu hover:bg-shu/15"
              : "text-muted2/60 hover:text-shu",
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
            size="icon-sm"
            className="text-muted2/60 hover:text-foreground transition-colors duration-300 ease-out"
            onClick={() => setNotesOpen((o) => !o)}
          >
            <NotesIcon />
          </Button>
        )}
      </div>

      {/* Row 1: Favicon + Title */}
      <div className="flex min-w-0 items-center gap-2 pr-28">
        {bookmark.favorite && (
          <span className="bg-kitsune size-1 shrink-0 rounded-full" />
        )}
        <Favicon url={bookmark.url} />
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onReadClick?.(bookmark)}
          className="text-foreground hover:text-primary truncate text-sm leading-snug font-medium tracking-tight transition-colors"
          {...(bookmark.title_snippet
            ? { dangerouslySetInnerHTML: { __html: bookmark.title_snippet } }
            : { children: bookmark.title })}
        />
      </div>

      {/* Row 2: Hostname */}
      <p className="text-muted2 mt-1 truncate font-mono text-[11px]">
        {getHostname(bookmark.url)}
      </p>

      {/* Row 3: Description */}
      {(bookmark.description_snippet || bookmark.description) && (
        <p
          className="text-muted2 mt-4 line-clamp-2 max-w-130 text-xs leading-relaxed font-light"
          {...(bookmark.description_snippet
            ? {
              dangerouslySetInnerHTML: {
                __html: bookmark.description_snippet,
              },
            }
            : { children: bookmark.description })}
        />
      )}

      {/* Row 4: Tags + Date */}
      <div className="text-muted2 mt-3 flex items-center gap-2.5 font-mono text-[11px]">
        {bookmark.tags.slice(0, 6).map((tag) => (
          <button
            key={tag}
            type="button"
            className="hover:text-primary transition-colors"
            onClick={() => onTagClick?.(tag)}
          >
            #{tag}
          </button>
        ))}
        {bookmark.tags.length > 6 && (
          <span className="text-muted2/70 font-mono font-medium tabular-nums select-none">
            +{formatCount(bookmark.tags.length - 6)}
          </span>
        )}
        <span className="ml-auto">
          {formatRelativeTime(bookmark.created_at)}
        </span>
      </div>

      {/* Notes expansion */}
      {hasNotes && (
        <div
          className="grid ease-out"
          style={{
            gridTemplateRows: notesOpen ? "1fr" : "0fr",
            opacity: notesOpen ? 1 : 0,
            marginTop: notesOpen ? 16 : 0,
            transition:
              "grid-template-rows 250ms ease-out, opacity 200ms ease-out, margin-top 250ms ease-out",
          }}
        >
          <div className="overflow-hidden">
            <div className="border-border-soft/50 group-hover:border-border-soft bg-surface/50 group-hover:bg-surface2 rounded-r border-l-2 py-2 pr-3 pl-3 transition-colors duration-200">
              <p className="text-foreground/60 text-[11px] leading-relaxed font-light">
                {bookmark.notes}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Favicon({ url }: { url: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );
  const hostname = getHostname(url);

  return (
    <div className="relative h-4 w-4 shrink-0">
      {status === "loading" && (
        <div className="bg-border-soft absolute inset-0 animate-pulse rounded-sm" />
      )}
      {status === "error" && (
        <div className="bg-surface2 absolute inset-0 flex items-center justify-center rounded-sm">
          <span className="text-muted2 text-[8px] leading-none font-medium uppercase">
            {hostname.charAt(0)}
          </span>
        </div>
      )}
      <img
        src={`/api/v1/favicons/${hostname}`}
        alt=""
        className={cn("h-4 w-4 rounded-sm", status !== "loaded" && "invisible")}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
    </div>
  );
}
