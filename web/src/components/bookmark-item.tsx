import { useState } from 'react'
import { Tooltip } from '@ark-ui/react/tooltip'
import { useQueryClient } from '@tanstack/react-query'
import { formatDate } from '../lib/format'
import { deleteBookmark, updateBookmark, archiveBookmarks } from '../lib/api'
import { ConfirmDialog } from './confirm-dialog'
import { BookmarkDialog } from './bookmark-dialog'
import type { Bookmark, CreateBookmarkData } from '../lib/types'
import s from './bookmark-item.module.css'

type Props = {
  bookmark: Bookmark
  onTagClick: (tag: string) => void
}

export function BookmarkItem({ bookmark: b, onTagClick }: Props) {
  const queryClient = useQueryClient()
  const [notesOpen, setNotesOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  let hostname = b.url
  try {
    hostname = new URL(b.url).hostname
  } catch {
    // malformed URL — display as-is
  }

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
    <div className={s.bmItem}>
      <div className={s.bmHeader}>
        <img
          className={s.bmFavicon}
          src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
          alt=""
        />
        <a className={s.bmTitle} href={b.url} target="_blank" rel="noopener noreferrer">
          {b.title}
        </a>
      </div>
      <span className={s.bmUrl}>{hostname}</span>
      {b.description && <div className={s.bmDesc}>{b.description}</div>}
      <div className={s.bmMeta}>
        {b.tags.length > 0 && (
          <>
            {b.tags.map((tag) => (
              <button key={tag} className={s.bmTag} onClick={() => onTagClick(tag)}>
                #{tag}
              </button>
            ))}
            <span className={s.bmSep}>·</span>
          </>
        )}
        <span className={s.bmDate}>{formatDate(b.created_at)}</span>
      </div>
      <div className={s.bmActions}>
        <Tooltip.Root openDelay={400} closeDelay={0}>
          <Tooltip.Trigger asChild>
            <button className={s.bmTextAction} onClick={() => setEditOpen(true)}>Edit</button>
          </Tooltip.Trigger>
          <Tooltip.Positioner>
            <Tooltip.Content className={s.bmTooltip}>Edit bookmark</Tooltip.Content>
          </Tooltip.Positioner>
        </Tooltip.Root>
        <Tooltip.Root openDelay={400} closeDelay={0}>
          <Tooltip.Trigger asChild>
            <button className={s.bmTextAction} onClick={handleArchive}>
              {b.archived ? 'Unarchive' : 'Archive'}
            </button>
          </Tooltip.Trigger>
          <Tooltip.Positioner>
            <Tooltip.Content className={s.bmTooltip}>
              {b.archived ? 'Move back to library' : 'Move to archive'}
            </Tooltip.Content>
          </Tooltip.Positioner>
        </Tooltip.Root>
        <Tooltip.Root openDelay={400} closeDelay={0}>
          <Tooltip.Trigger asChild>
            <button
              className={`${s.bmTextAction} ${s.bmTextActionDanger}`}
              onClick={() => setConfirmOpen(true)}
            >
              Remove
            </button>
          </Tooltip.Trigger>
          <Tooltip.Positioner>
            <Tooltip.Content className={s.bmTooltip}>Delete permanently</Tooltip.Content>
          </Tooltip.Positioner>
        </Tooltip.Root>

        {b.notes && (
          <>
            <span className={s.bmSep}>|</span>
            <button className={s.bmTextAction} onClick={() => setNotesOpen(o => !o)}>
              Notes
            </button>
          </>
        )}
      </div>
      {notesOpen && b.notes && <div className={s.bmNotes}>{b.notes}</div>}

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
}
