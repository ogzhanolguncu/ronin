import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArchiveIcon, DeleteIcon, NotesIcon } from "@/components/ui/icons";

interface Bookmark {
  id: number;
  url: string;
  title: string;
  hostname: string;
  description?: string;
  tags: string[];
  date: string;
  notes?: string;
}

export function BookmarkItem({ bookmark }: { bookmark: Bookmark }) {
  const [notesOpen, setNotesOpen] = useState(false);
  const hasNotes = !!bookmark.notes;

  return (
    <div className="relative px-6 py-[18px] border-b border-border-soft/40 first:border-t-0 transition-colors duration-200 hover:bg-surface">
      {/* Action cluster — always visible, top-right */}
      <div className="absolute top-3 right-4 flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted2/40 hover:text-foreground transition-colors"
          onClick={() => console.log("archive", bookmark.id)}
        >
          <ArchiveIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted2/40 hover:text-destructive transition-colors"
          onClick={() => console.log("delete", bookmark.id)}
        >
          <DeleteIcon />
        </Button>
        {hasNotes && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted2/40 hover:text-foreground transition-colors"
            onClick={() => setNotesOpen((o) => !o)}
          >
            <NotesIcon />
          </Button>
        )}
      </div>

      {/* Row 1: Favicon + Title */}
      <div className="flex items-center gap-2 min-w-0 pr-20">
        <img
          src={`https://www.google.com/s2/favicons?domain=${bookmark.hostname}&sz=32`}
          alt=""
          className="w-3.5 h-3.5 rounded-sm shrink-0 opacity-75"
        />
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] font-medium text-foreground leading-snug tracking-tight truncate transition-colors hover:text-primary"
        >
          {bookmark.title}
        </a>
      </div>

      {/* Row 2: Hostname */}
      <p className="font-mono text-[10px] text-muted2 mt-0.5 truncate">
        {bookmark.hostname}
      </p>

      {/* Row 3: Description */}
      {bookmark.description && (
        <p className="text-[11px] text-text2 font-light leading-relaxed mt-1.5 line-clamp-2">
          {bookmark.description}
        </p>
      )}

      {/* Row 4: Tags + Date */}
      <div className="flex items-center gap-1.5 mt-1.5 font-mono text-[10px] text-muted2/80">
        {bookmark.tags.map((tag) => (
          <span key={tag}>#{tag}</span>
        ))}
        {bookmark.tags.length > 0 && <span>·</span>}
        <span className="text-muted2/60">{bookmark.date}</span>
      </div>

      {/* Notes expansion */}
      {hasNotes && notesOpen && (
        <p className="text-[11px] text-text2/80 font-light italic leading-relaxed font-jp mt-2 pt-2 border-t border-border-soft/40">
          {bookmark.notes}
        </p>
      )}
    </div>
  );
}
