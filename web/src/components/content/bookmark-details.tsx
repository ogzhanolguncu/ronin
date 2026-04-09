import { useState } from "react";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ExternalLinkIcon,
  ReaderModeIcon,
  ArchiveIcon,
  RefreshIcon,
  EditIcon,
} from "@/components/ui/icons";
import { BookmarkEditForm } from "./bookmark-edit-form";
import { formatRelativeTime } from "@/lib/format";
import { useRegenerateAssets } from "@/lib/queries/bookmarks";
import type { Bookmark } from "@/lib/types";
import { getHostname } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BookmarkDetails({
  bookmark,
  onOpenReader,
}: {
  bookmark: Bookmark;
  onOpenReader: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const regenerate = useRegenerateAssets();
  const isRegenerating = regenerate.isPending;

  const readerReady = !isRegenerating && bookmark.readable_status === "ready";
  const snapshotReady = !isRegenerating && bookmark.snapshot_status === "ready";
  const snapshotPending =
    isRegenerating || bookmark.snapshot_status === "pending";
  const readablePending =
    isRegenerating || bookmark.readable_status === "pending";
  const snapshotFailed =
    !isRegenerating && bookmark.snapshot_status === "failed";
  const readableFailed =
    !isRegenerating && bookmark.readable_status === "failed";
  const canRegenerate =
    snapshotFailed || readableFailed || snapshotReady || readerReady;

  if (editing) {
    return (
      <BookmarkEditForm
        bookmark={bookmark}
        onCancel={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="bg-surface flex max-h-[70vh] flex-col overflow-y-auto px-8 pt-9 pb-9">
      {/* Header: favicon + title + url + archive links */}
      <div className="flex items-start gap-3">
        <img
          src={`/api/v1/favicons/${getHostname(bookmark.url)}`}
          alt=""
          className="mt-px h-7 w-7 shrink-0 rounded-sm"
        />
        <div className="min-w-0 flex-1">
          <DialogTitle className="text-foreground text-[17px] leading-[1.5] font-semibold">
            {bookmark.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Bookmark details
          </DialogDescription>
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted2 hover:text-primary mt-1 block truncate font-mono text-[11px]"
          >
            {bookmark.url}
          </a>
          <div className="mt-3 flex items-center gap-2.5">
            {readerReady && (
              <button
                type="button"
                onClick={() => onOpenReader(bookmark.id)}
                className="text-muted2/70 hover:text-muted2 inline-flex items-center gap-1 text-xs"
              >
                <ReaderModeIcon className="h-3.5 w-3.5" />
                Reader mode
              </button>
            )}
            {readablePending && (
              <span className="text-muted2/50 inline-flex items-center gap-1 text-xs">
                <ReaderModeIcon className="h-3.5 w-3.5" />
                Extracting...
              </span>
            )}
            {(readerReady || readablePending) && bookmark.wayback_url && (
              <span className="text-muted2/30 text-xs">&middot;</span>
            )}
            {bookmark.wayback_url && (
              <a
                href={bookmark.wayback_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted2/70 hover:text-muted2 inline-flex items-center gap-1 text-xs"
              >
                <ExternalLinkIcon className="h-3.5 w-3.5" />
                Internet Archive
              </a>
            )}
            {(readerReady || readablePending || bookmark.wayback_url) && (
              <span className="text-muted2/30 text-xs">&middot;</span>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-muted2/70 hover:text-muted2 inline-flex items-center gap-1 text-xs transition-colors duration-300"
            >
              <EditIcon className="h-3.5 w-3.5" />
              Edit
            </button>
          </div>
        </div>
      </div>

      {bookmark.description && (
        <>
          <div className="via-border dark:via-primary/10 mt-9 mb-7 h-px bg-gradient-to-r from-transparent to-transparent" />
          <p className="text-foreground/80 text-sm leading-[1.8]">
            {bookmark.description}
          </p>
        </>
      )}

      {bookmark.notes && (
        <div className="border-border/40 dark:border-border/60 bg-foreground/[0.025] dark:bg-foreground/[0.05] mt-9 rounded-r-sm border-l py-2.5 pr-3 pl-3">
          <p className="text-foreground/70 text-[12px] leading-[1.75]">
            {bookmark.notes}
          </p>
        </div>
      )}

      {/* Snapshot + regenerate */}
      {(snapshotReady ||
        snapshotPending ||
        snapshotFailed ||
        canRegenerate) && (
        <div className="mt-9 flex items-center gap-2.5">
          <ArchiveIcon className="text-muted2/60 h-3.5 w-3.5 shrink-0" />
          {snapshotReady && (
            <a
              href={`/api/v1/assets/${bookmark.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted2/70 hover:text-muted2 text-xs"
            >
              View snapshot
            </a>
          )}
          {snapshotPending && (
            <span className="text-muted2/50 text-xs">Creating snapshot...</span>
          )}
          {snapshotFailed && (
            <span className="text-muted2/50 text-xs">Snapshot failed</span>
          )}
          {canRegenerate && !snapshotPending && (
            <>
              <span className="text-muted2/30 text-xs">&middot;</span>
              <button
                type="button"
                onClick={() => regenerate.mutate(bookmark.id)}
                disabled={regenerate.isPending}
                className="text-muted2/70 hover:text-muted2 inline-flex items-center gap-1 text-xs disabled:opacity-50"
              >
                <RefreshIcon
                  className={cn(
                    "h-3.5 w-3.5",
                    regenerate.isPending && "animate-spin",
                  )}
                />
                {regenerate.isPending ? "Regenerating..." : "Regenerate"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Status badges */}
      {(bookmark.archived || !bookmark.read) && (
        <div className="mt-9 flex items-center gap-2">
          {bookmark.archived && (
            <span className="text-muted2 ring-border rounded-sm px-1.5 py-0.5 font-mono text-[11px] ring-1">
              archived
            </span>
          )}
          {!bookmark.read && (
            <span className="text-muted2 ring-border rounded-sm px-1.5 py-0.5 font-mono text-[11px] ring-1">
              unread
            </span>
          )}
        </div>
      )}

      {/* Tags + date */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-2.5",
          bookmark.archived || !bookmark.read ? "mt-6" : "mt-9",
        )}
      >
        {bookmark.tags.map((tag) => (
          <span key={tag} className="text-muted2/70 font-mono text-[11px]">
            #{tag}
          </span>
        ))}
        <span className="text-muted2 ml-auto font-mono text-[11px]">
          {formatRelativeTime(bookmark.created_at)}
        </span>
      </div>
    </div>
  );
}
