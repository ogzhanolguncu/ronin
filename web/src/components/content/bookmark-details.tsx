import { DialogTitle } from "@/components/ui/dialog";
import { ExternalLinkIcon, ReaderModeIcon, ArchiveIcon } from "@/components/ui/icons";
import { formatRelativeTime } from "@/lib/format";
import type { Bookmark } from "@/lib/types";
import { getHostname } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BookmarkDetails({ bookmark }: { bookmark: Bookmark }) {
  const readerReady = bookmark.readable_status === "ready";
  const snapshotReady = bookmark.snapshot_status === "ready";
  const snapshotPending = bookmark.snapshot_status === "pending";
  const readablePending = bookmark.readable_status === "pending";

  return (
    <div className="px-7 pt-6 pb-8 flex flex-col max-h-[70vh] overflow-y-auto bg-surface">
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
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-muted2 mt-1 block hover:text-primary truncate"
          >
            {bookmark.url}
          </a>
          {(readerReady || readablePending || bookmark.wayback_url) && (
            <div className="flex items-center gap-2 mt-2">
              {readerReady && (
                <a
                  href={`/api/v1/assets/${bookmark.id}/read`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-muted2/70 hover:text-muted2 inline-flex items-center gap-1"
                >
                  <ReaderModeIcon className="w-3 h-3" />
                  Reader mode
                </a>
              )}
              {readablePending && (
                <span className="text-[11px] text-muted2/50 inline-flex items-center gap-1">
                  <ReaderModeIcon className="w-3 h-3" />
                  Extracting...
                </span>
              )}
              {(readerReady || readablePending) && bookmark.wayback_url && (
                <span className="text-[11px] text-muted2/30">&middot;</span>
              )}
              {bookmark.wayback_url && (
                <a
                  href={bookmark.wayback_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-muted2/70 hover:text-muted2 inline-flex items-center gap-1"
                >
                  <ExternalLinkIcon className="w-3 h-3" />
                  Internet Archive
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {bookmark.description && (
        <>
          <div className="h-px bg-gradient-to-r from-transparent via-border dark:via-primary/10 to-transparent mt-6 mb-5" />
          <p className="text-sm text-foreground/80 leading-[1.8]">
            {bookmark.description}
          </p>
        </>
      )}

      {bookmark.notes && (
        <div className="pl-3 pr-3 py-2.5 border-l border-border/40 dark:border-border/60 bg-foreground/[0.025] dark:bg-foreground/[0.05] rounded-r-sm mt-7">
          <p className="text-[12px] text-foreground/70 leading-[1.75]">
            {bookmark.notes}
          </p>
        </div>
      )}

      {/* Snapshot link */}
      {(snapshotReady || snapshotPending) && (
        <div className="flex items-center gap-2 mt-7">
          <ArchiveIcon className="w-3.5 h-3.5 text-muted2/60 shrink-0" />
          {snapshotReady ? (
            <a
              href={`/api/v1/assets/${bookmark.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-muted2/70 hover:text-muted2"
            >
              View snapshot
            </a>
          ) : (
            <span className="text-[11px] text-muted2/50">
              Creating snapshot...
            </span>
          )}
        </div>
      )}

      {/* Status badges */}
      {(bookmark.archived || !bookmark.read) && (
        <div className="flex items-center gap-2 mt-7">
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
      <div className={cn("flex items-center gap-2.5 flex-wrap", bookmark.archived || !bookmark.read ? "mt-4" : "mt-7")}>
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
