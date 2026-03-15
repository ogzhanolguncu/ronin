import { useState, useEffect, type KeyboardEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Bookmark, CreateBookmarkData } from '../lib/types'

type Props = {
  open: boolean
  bookmark?: Bookmark
  onClose: () => void
  onSave: (data: CreateBookmarkData) => void
}

export function BookmarkDialog({ open, bookmark, onClose, onSave }: Props) {
  const [url, setUrl] = useState(bookmark?.url ?? '')
  const [title, setTitle] = useState(bookmark?.title ?? '')
  const [notes, setNotes] = useState(bookmark?.notes ?? '')
  const [tags, setTags] = useState<string[]>(bookmark?.tags ?? [])
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    setUrl(bookmark?.url ?? '')
    setTitle(bookmark?.title ?? '')
    setNotes(bookmark?.notes ?? '')
    setTags(bookmark?.tags ?? [])
    setTagInput('')
  }, [bookmark])

  const handleSave = () => {
    if (!url.trim() || !title.trim()) return
    onSave({ url: url.trim(), title: title.trim(), notes: notes.trim(), tags })
  }

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const value = tagInput.trim()
    if (e.key === 'Enter' && value) {
      e.preventDefault()
      if (!tags.includes(value)) {
        setTags([...tags, value])
      }
      setTagInput('')
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1))
    }
  }

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index))
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{bookmark ? 'Edit bookmark' : 'New bookmark'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground" htmlFor="f-url">URL</label>
            <Input
              id="f-url"
              type="url"
              placeholder="https://"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground" htmlFor="f-title">Title</label>
            <Input
              id="f-title"
              type="text"
              placeholder="Page title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground" htmlFor="f-notes">Notes</label>
            <Textarea
              id="f-notes"
              placeholder="Why you saved this..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[68px]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Tags</label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-input/20 px-2.5 py-1.5 min-h-[38px] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 transition-colors">
              {tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="gap-1 font-mono text-[10px] text-primary border-primary/30 bg-primary/5"
                >
                  {tag}
                  <button
                    type="button"
                    className="opacity-60 hover:opacity-100 ml-0.5 text-[0.9em] leading-none"
                    onClick={() => removeTag(index)}
                  >
                    ×
                  </button>
                </Badge>
              ))}
              <input
                className="flex-1 min-w-[80px] bg-transparent border-none outline-none text-foreground text-xs font-light placeholder:text-muted-foreground"
                placeholder="tag, press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-3.5 mt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
