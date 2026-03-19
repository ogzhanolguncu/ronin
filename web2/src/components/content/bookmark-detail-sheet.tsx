import { DialogTitle } from "@/components/ui/dialog";
import { ExternalLinkIcon, ReaderModeIcon, NotesIcon } from "@/components/ui/icons";
import type { Bookmark } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BookmarkDetailSheet({ bookmark }: { bookmark: Bookmark }) {
  return (
    <div className="px-7 pt-6 pb-8 flex flex-col max-h-[70vh] overflow-y-auto">
      {/* Header: favicon + title + url + archive link */}
      <div className="flex items-start gap-3">
        <img
          src={`https://www.google.com/s2/favicons?domain=${bookmark.hostname}&sz=64`}
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
          {(bookmark.reader_mode_url || bookmark.web_archive_url) && (
            <div className="flex items-center gap-2 mt-2">
              {bookmark.reader_mode_url && (
                <a
                  href={bookmark.reader_mode_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-muted2/70 hover:text-muted2 inline-flex items-center gap-1"
                >
                  <ReaderModeIcon className="w-3 h-3" />
                  Reader mode
                </a>
              )}
              {bookmark.reader_mode_url && bookmark.web_archive_url && (
                <span className="text-[11px] text-muted2/30">·</span>
              )}
              {bookmark.web_archive_url && (
                <a
                  href={bookmark.web_archive_url}
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
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mt-6 mb-5" />
          <p className="text-sm text-foreground/80 leading-[1.8]">
            {bookmark.description}
          </p>
        </>
      )}

      {bookmark.notes && (
        <div className="pl-3 pr-3 py-2.5 border-l border-border/40 bg-foreground/[0.025] rounded-r-sm mt-7">
          <p className="text-[12px] text-foreground/70 leading-[1.75]">
            {bookmark.notes}
          </p>
        </div>
      )}

      {bookmark.assets && bookmark.assets.length > 0 && (
        <div className="flex flex-col gap-2 mt-7">
          {bookmark.assets.map((asset) => (
            <div key={asset.id} className="flex items-center gap-2">
              <NotesIcon className="w-3.5 h-3.5 text-muted2/60 shrink-0" />
              <span className="text-[11px] text-foreground/60 flex-1 truncate">
                {asset.name}
              </span>
              {asset.size && (
                <span className="font-mono text-[11px] text-muted2/50">
                  {asset.size}
                </span>
              )}
              <a
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] text-muted2 hover:text-primary"
              >
                View
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Status badges — only when present */}
      {(bookmark.is_archived || bookmark.is_unread) && (
        <div className="flex items-center gap-2 mt-7">
          {bookmark.is_archived && (
            <span className="font-mono text-[11px] text-muted2 ring-1 ring-border rounded-sm px-1.5 py-0.5">
              archived
            </span>
          )}
          {bookmark.is_unread && (
            <span className="font-mono text-[11px] text-muted2 ring-1 ring-border rounded-sm px-1.5 py-0.5">
              unread
            </span>
          )}
        </div>
      )}

      {/* Tags + date */}
      <div className={cn("flex items-center gap-2.5 flex-wrap", bookmark.is_archived || bookmark.is_unread ? "mt-4" : "mt-7")}>
        {bookmark.tags.map((tag) => (
          <span key={tag} className="font-mono text-[11px] text-muted2/70">
            #{tag}
          </span>
        ))}
        <span className="font-mono text-[11px] text-muted2 ml-auto">
          {bookmark.date}
        </span>
      </div>
    </div>
  );
}
