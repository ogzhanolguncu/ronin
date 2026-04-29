import { useState } from "react";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ExternalLinkIcon,
  ReaderModeIcon,
  ArchiveIcon,
  RefreshIcon,
  EditIcon,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { BookmarkEditForm } from "./bookmark-edit-form";
import { formatRelativeTime } from "@/lib/format";
import { useRegenerateAssets } from "@/lib/queries/bookmarks";
import type { Bookmark } from "@/lib/types";
import { getHostname } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BookmarkDetails({
  bookmark,
  onOpenReader,
  onReadClick,
}: {
  bookmark: Bookmark;
  onOpenReader: (id: number) => void;
  onReadClick?: (bookmark: Bookmark) => void;
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
      <BookmarkEditForm bookmark={bookmark} onSaved={() => setEditing(false)} />
    );
  }

  return (
    <div className="bg-surface relative max-h-[70vh] overflow-y-auto">
      {/* Content */}
      <div className="px-8 pr-24 pt-9 pb-9">
        {/* Header: favicon + title + url */}
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
              onClick={() => onReadClick?.(bookmark)}
            >
              {bookmark.url}
            </a>
          </div>
        </div>

        {bookmark.description && (
          <p className="text-foreground/80 mt-5 text-sm leading-[1.8]">
            {bookmark.description}
          </p>
        )}

        {bookmark.notes && (
          <div className="border-border/40 dark:border-border/60 bg-foreground/[0.025] dark:bg-foreground/[0.05] mt-4 rounded-r-sm border-l py-2.5 pr-3 pl-3">
            <p className="text-foreground/70 text-[12px] leading-[1.75]">
              {bookmark.notes}
            </p>
          </div>
        )}

        {/* Tags + status badges + date */}
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          {bookmark.tags.map((tag) => (
            <span key={tag} className="text-muted2/70 font-mono text-[11px]">
              #{tag}
            </span>
          ))}
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
          <span className="text-muted2 ml-auto font-mono text-[11px]">
            {formatRelativeTime(bookmark.created_at)}
          </span>
        </div>
      </div>

      {/* Floating action strip */}
      <TooltipProvider>
        <div className="absolute top-1/2 right-3 -translate-y-1/2">
          <div className="bg-surface/60 dark:bg-surface/90 dark:border-border-soft/50 flex flex-col items-center gap-3 rounded-lg p-1.5 shadow-sm backdrop-blur-md dark:border dark:shadow-none">
            {/* Reader mode */}
            {(readerReady || readablePending || readableFailed) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted2/60 hover:text-primary transition-colors duration-300 ease-out"
                      onClick={() => onOpenReader(bookmark.id)}
                      disabled={!readerReady}
                    >
                      <ReaderModeIcon className="size-3.5" />
                    </Button>
                    {readablePending && (
                      <span className="bg-kitsune absolute -top-0.5 -right-0.5 size-1.5 animate-pulse rounded-full" />
                    )}
                    {readableFailed && (
                      <span className="bg-shu absolute -top-0.5 -right-0.5 size-1.5 rounded-full" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {readablePending
                    ? "Extracting..."
                    : readableFailed
                      ? "Extraction failed"
                      : "Reader mode"}
                </TooltipContent>
              </Tooltip>
            )}

            {/* View snapshot */}
            {(snapshotReady || snapshotPending || snapshotFailed) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    {snapshotReady ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted2/60 hover:text-primary transition-colors duration-300 ease-out"
                        asChild
                      >
                        <a
                          href={`/api/v1/assets/${bookmark.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ArchiveIcon className="size-3.5" />
                        </a>
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted2/60 transition-colors duration-300 ease-out"
                        disabled
                      >
                        <ArchiveIcon className="size-3.5" />
                      </Button>
                    )}
                    {snapshotPending && (
                      <span className="bg-kitsune absolute -top-0.5 -right-0.5 size-1.5 animate-pulse rounded-full" />
                    )}
                    {snapshotFailed && (
                      <span className="bg-shu absolute -top-0.5 -right-0.5 size-1.5 rounded-full" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {snapshotPending
                    ? "Creating snapshot..."
                    : snapshotFailed
                      ? "Snapshot failed"
                      : "View snapshot"}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Internet Archive */}
            {bookmark.wayback_url && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted2/60 hover:text-primary transition-colors duration-300 ease-out"
                    asChild
                  >
                    <a
                      href={bookmark.wayback_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLinkIcon className="size-3.5" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Internet Archive</TooltipContent>
              </Tooltip>
            )}

            {/* Divider */}
            <div className="bg-border-soft/50 my-2.5 h-px w-5" />

            {/* Edit */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted2/60 hover:text-foreground transition-colors duration-300 ease-out"
                  onClick={() => setEditing(true)}
                >
                  <EditIcon className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>

            {/* Regenerate */}
            {canRegenerate && !snapshotPending && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted2/60 hover:text-foreground transition-colors duration-300 ease-out"
                    onClick={() => regenerate.mutate(bookmark.id)}
                    disabled={regenerate.isPending}
                  >
                    <RefreshIcon
                      className={cn(
                        "size-3.5",
                        regenerate.isPending && "animate-spin",
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {regenerate.isPending ? "Regenerating..." : "Regenerate"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}
