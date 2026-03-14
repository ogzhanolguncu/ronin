import { useState, useEffect } from 'react'
import { Dialog } from '@ark-ui/react/dialog'
import { TagsInput } from '@ark-ui/react/tags-input'
import { Portal } from '@ark-ui/react/portal'
import { CloseIcon } from '../lib/icons'
import type { Bookmark, CreateBookmarkData } from '../lib/types'
import s from './bookmark-dialog.module.css'

type Props = {
  open: boolean
  bookmark?: Bookmark // undefined = create mode
  onClose: () => void
  onSave: (data: CreateBookmarkData) => void
}

export function BookmarkDialog({ open, bookmark, onClose, onSave }: Props) {
  const [url, setUrl] = useState(bookmark?.url ?? '')
  const [title, setTitle] = useState(bookmark?.title ?? '')
  const [notes, setNotes] = useState(bookmark?.notes ?? '')
  const [tags, setTags] = useState<string[]>(bookmark?.tags ?? [])

  // Sync form state when bookmark changes (e.g. switching from create to edit)
  useEffect(() => {
    setUrl(bookmark?.url ?? '')
    setTitle(bookmark?.title ?? '')
    setNotes(bookmark?.notes ?? '')
    setTags(bookmark?.tags ?? [])
  }, [bookmark])

  const handleSave = () => {
    // Stage 2: add Zod validation here
    if (!url.trim() || !title.trim()) return
    onSave({ url: url.trim(), title: title.trim(), notes: notes.trim(), tags })
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={({ open: isOpen }) => !isOpen && onClose()}
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Positioner
          style={{
            position: 'fixed',
            inset: 0,
            background: '#18140faa',
            backdropFilter: 'blur(3px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Dialog.Content className={s.modal}>
            <div className={s.modalHeader}>
              <Dialog.Title className={s.modalTitle}>
                {bookmark ? 'Edit bookmark' : 'New bookmark'}
              </Dialog.Title>
              <Dialog.CloseTrigger className={s.modalClose}>
                <CloseIcon />
              </Dialog.CloseTrigger>
            </div>

            <div className={s.formGroup}>
              <label className={s.formLabel} htmlFor="f-url">URL</label>
              <input
                className={s.formInput}
                id="f-url"
                type="url"
                placeholder="https://"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
              />
            </div>

            <div className={s.formGroup}>
              <label className={s.formLabel} htmlFor="f-title">Title</label>
              <input
                className={s.formInput}
                id="f-title"
                type="text"
                placeholder="Page title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className={s.formGroup}>
              <label className={s.formLabel} htmlFor="f-notes">Notes</label>
              <textarea
                className={s.formTextarea}
                id="f-notes"
                placeholder="Why you saved this..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className={s.formGroup}>
              <label className={s.formLabel}>Tags</label>
              <TagsInput.Root
                value={tags}
                onValueChange={(e) => setTags(e.value)}
              >
                <TagsInput.Control className={s.tagsInputWrap}>
                  {tags.map((tag, index) => (
                    <TagsInput.Item key={index} index={index} value={tag} className={s.tagChip}>
                      <TagsInput.ItemText>{tag}</TagsInput.ItemText>
                      <TagsInput.ItemDeleteTrigger>×</TagsInput.ItemDeleteTrigger>
                    </TagsInput.Item>
                  ))}
                  <TagsInput.Input
                    className={s.tagsTextInput}
                    placeholder="tag, press Enter"
                  />
                </TagsInput.Control>
                <TagsInput.HiddenInput />
              </TagsInput.Root>
            </div>

            <div className={s.modalFooter}>
              <Dialog.CloseTrigger className={s.btnSecondary}>Cancel</Dialog.CloseTrigger>
              <button className={s.btnPrimary} onClick={handleSave}>Save</button>
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
