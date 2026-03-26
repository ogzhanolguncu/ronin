import { useState } from "react";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ExternalLinkIcon, ReaderModeIcon, ArchiveIcon, RefreshIcon, EditIcon } from "@/components/ui/icons";
import { BookmarkEditForm } from "./bookmark-edit-form";
import { formatRelativeTime } from "@/lib/format";
import { useRegenerateAssets } from "@/lib/queries/bookmarks";
import type { Bookmark } from "@/lib/types";
import { getHostname } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BookmarkDetails({ bookmark }: { bookmark: Bookmark }) {
  const [editing, setEditing] = useState(false);
  const regenerate = useRegenerateAssets();
  const isRegenerating = regenerate.isPending;

  const readerReady = !isRegenerating && bookmark.readable_status === "ready";
  const snapshotReady = !isRegenerating && bookmark.snapshot_status === "ready";
  const snapshotPending = isRegenerating || bookmark.snapshot_status === "pending";
  const readablePending = isRegenerating || bookmark.readable_status === "pending";
  const snapshotFailed = !isRegenerating && bookmark.snapshot_status === "failed";
  const readableFailed = !isRegenerating && bookmark.readable_status === "failed";
  const canRegenerate = snapshotFailed || readableFailed || snapshotReady || readerReady;

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
    <div className="px-8 pt-9 pb-9 flex flex-col max-h-[70vh] overflow-y-auto bg-surface">
      {/* Header: favicon + title + url + archive links */}
      <div className="flex items-start gap-3">
        <img
          src={`/api/v1/favicons/${getHostname(bookmark.url)}`}
          alt=""
          className="w-7 h-7 rounded-sm shrink-0 mt-px"
        />
        <div className="flex-1 min-w-0">
          <DialogTitle className="text-[17px] font-semibold text-foreground leading-[1.5]">
            {bookmark.title}
          </DialogTitle>
          <DialogDescription className="sr-only">Bookmark details</DialogDescription>
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-muted2 mt-1 block hover:text-primary truncate"
          >
            {bookmark.url}
          </a>
          <div className="flex items-center gap-2.5 mt-3">
            {readerReady && (
              <a
                href={`/api/v1/assets/${bookmark.id}/readable`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted2/70 hover:text-muted2 inline-flex items-center gap-1"
              >
                <ReaderModeIcon className="w-3.5 h-3.5" />
                Reader mode
              </a>
            )}
            {readablePending && (
              <span className="text-xs text-muted2/50 inline-flex items-center gap-1">
                <ReaderModeIcon className="w-3.5 h-3.5" />
                Extracting...
              </span>
            )}
            {(readerReady || readablePending) && bookmark.wayback_url && (
              <span className="text-xs text-muted2/30">&middot;</span>
            )}
            {bookmark.wayback_url && (
              <a
                href={bookmark.wayback_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted2/70 hover:text-muted2 inline-flex items-center gap-1"
              >
                <ExternalLinkIcon className="w-3.5 h-3.5" />
                Internet Archive
              </a>
            )}
            {(readerReady || readablePending || bookmark.wayback_url) && (
              <span className="text-xs text-muted2/30">&middot;</span>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs text-muted2/70 hover:text-muted2 inline-flex items-center gap-1 transition-colors duration-300"
            >
              <EditIcon className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>
        </div>
      </div>

      {bookmark.description && (
        <>
          <div className="h-px bg-gradient-to-r from-transparent via-border dark:via-primary/10 to-transparent mt-9 mb-7" />
          <p className="text-sm text-foreground/80 leading-[1.8]">
            {bookmark.description}
          </p>
        </>
      )}

      {bookmark.notes && (
        <div className="pl-3 pr-3 py-2.5 border-l border-border/40 dark:border-border/60 bg-foreground/[0.025] dark:bg-foreground/[0.05] rounded-r-sm mt-9">
          <p className="text-[12px] text-foreground/70 leading-[1.75]">
            {bookmark.notes}
          </p>
        </div>
      )}

      {/* Snapshot + regenerate */}
      {(snapshotReady || snapshotPending || snapshotFailed || canRegenerate) && (
        <div className="flex items-center gap-2.5 mt-9">
          <ArchiveIcon className="w-3.5 h-3.5 text-muted2/60 shrink-0" />
          {snapshotReady && (
            <a
              href={`/api/v1/assets/${bookmark.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted2/70 hover:text-muted2"
            >
              View snapshot
            </a>
          )}
          {snapshotPending && (
            <span className="text-xs text-muted2/50">
              Creating snapshot...
            </span>
          )}
          {snapshotFailed && (
            <span className="text-xs text-muted2/50">
              Snapshot failed
            </span>
          )}
          {canRegenerate && !snapshotPending && (
            <>
              <span className="text-xs text-muted2/30">&middot;</span>
              <button
                type="button"
                onClick={() => regenerate.mutate(bookmark.id)}
                disabled={regenerate.isPending}
                className="text-xs text-muted2/70 hover:text-muted2 inline-flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshIcon className={cn("w-3.5 h-3.5", regenerate.isPending && "animate-spin")} />
                {regenerate.isPending ? "Regenerating..." : "Regenerate"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Status badges */}
      {(bookmark.archived || !bookmark.read) && (
        <div className="flex items-center gap-2 mt-9">
          {bookmark.archived && (
            <span className="font-mono text-[11px] text-muted2 ring-1 ring-border rounded-sm px-1.5 py-0.5">
              archived
            </span>
          )}
          {!bookmark.read && (
            <span className="font-mono text-[11px] text-muted2 ring-1 ring-border rounded-sm px-1.5 py-0.5">
              unread
            </span>
          )}
        </div>
      )}

      {/* Tags + date */}
      <div className={cn("flex items-center gap-2.5 flex-wrap", bookmark.archived || !bookmark.read ? "mt-6" : "mt-9")}>
        {bookmark.tags.map((tag) => (
          <span key={tag} className="font-mono text-[11px] text-muted2/70">
            #{tag}
          </span>
        ))}
        <span className="font-mono text-[11px] text-muted2 ml-auto">
          {formatRelativeTime(bookmark.created_at)}
        </span>
      </div>
    </div>
  );
}
