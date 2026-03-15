import { memo, useState, useMemo } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { useQueryClient } from '@tanstack/react-query'
import { formatDate } from '../lib/format'
import { deleteBookmark, updateBookmark, archiveBookmarks } from '../lib/api'
import { ConfirmDialog } from './confirm-dialog'
import { BookmarkDialog } from './bookmark-dialog'
import type { Bookmark, CreateBookmarkData } from '../lib/types'

type Props = {
  bookmark: Bookmark
  onTagClick: (tag: string) => void
}

export const BookmarkItem = memo(function BookmarkItem({ bookmark: b, onTagClick }: Props) {
  const queryClient = useQueryClient()
  const [notesOpen, setNotesOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const hostname = useMemo(() => {
    try {
      return new URL(b.url).hostname
    } catch {
      return b.url
    }
  }, [b.url])

  const handleArchive = async () => {
    await archiveBookmarks([{ id: b.id, archived: !b.archived }])
    queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
  }

  const handleConfirmDelete = async () => {
    await deleteBookmark(b.id)
    queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
    setConfirmOpen(false)
  }

  const handleEditSave = async (formData: CreateBookmarkData) => {
    await updateBookmark({
      id: b.id,
      url: formData.url,
      title: formData.title,
      description: b.description,
      notes: formData.notes,
      tags: formData.tags.join(' '),
    })
    queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
    setEditOpen(false)
  }

  return (
    <div className="px-5 py-4 border-b border-border flex flex-col gap-1.5 transition-colors hover:bg-surface relative">
      <div className="flex items-center gap-2">
        <img
          className="w-5 h-5 rounded shrink-0"
          src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
          alt=""
        />
        <a
          className="text-sm font-medium text-foreground no-underline transition-colors leading-snug tracking-tight truncate hover:text-primary"
          href={b.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {b.title}
        </a>
      </div>

      <span className="font-mono text-[11px] text-muted-foreground font-light truncate block">
        {hostname}
      </span>

      {b.description && (
        <div className="text-xs text-text2 font-light leading-relaxed truncate">
          {b.description}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap mt-1">
        {b.tags.length > 0 && (
          <>
            {b.tags.map((tag) => (
              <button
                key={tag}
                className="font-mono text-[10px] text-primary bg-transparent border-none p-0 cursor-pointer transition-colors tracking-wide hover:text-accent-hover"
                onClick={() => onTagClick(tag)}
              >
                #{tag}
              </button>
            ))}
            <span className="text-border2 text-[10px] select-none">·</span>
          </>
        )}
        <span className="font-mono text-[10px] text-muted-foreground font-light">
          {formatDate(b.created_at)}
        </span>
      </div>

      <div className="flex items-center gap-1.5 -ml-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto px-1.5 py-0.5 text-xs text-muted-foreground" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit bookmark</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto px-1.5 py-0.5 text-xs text-muted-foreground" onClick={handleArchive}>
              {b.archived ? 'Unarchive' : 'Archive'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {b.archived ? 'Move back to library' : 'Move to archive'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-1.5 py-0.5 text-xs text-muted-foreground hover:text-destructive hover:bg-red-dim"
              onClick={() => setConfirmOpen(true)}
            >
              Remove
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete permanently</TooltipContent>
        </Tooltip>

        {b.notes && (
          <>
            <span className="text-border2 text-[10px] select-none">|</span>
            <Button variant="ghost" size="sm" className="h-auto px-1.5 py-0.5 text-xs text-muted-foreground" onClick={() => setNotesOpen(o => !o)}>
              Notes
            </Button>
          </>
        )}
      </div>

      {notesOpen && b.notes && (
        <div className="text-xs text-text2 font-light italic leading-relaxed pt-2 border-t border-border mt-0.5">
          {b.notes}
        </div>
      )}

      {confirmOpen && (
        <ConfirmDialog
          open={confirmOpen}
          title={b.title}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleConfirmDelete}
        />
      )}
      {editOpen && (
        <BookmarkDialog
          open={editOpen}
          bookmark={b}
          onClose={() => setEditOpen(false)}
          onSave={handleEditSave}
        />
      )}
    </div>
  )
})
