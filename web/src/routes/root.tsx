import { Outlet } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Sidebar } from '../components/sidebar'
import { BookmarkDialog } from '../components/bookmark-dialog'
import { createBookmark } from '../lib/api'
import type { Bookmark, CreateBookmarkData } from '../lib/types'

export function RootLayout() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editBookmark, setEditBookmark] = useState<Bookmark | undefined>(undefined)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toUpperCase()
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      if (e.key === 'Escape') {
        setDialogOpen(false)
        return
      }

      if (inInput) return

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setEditBookmark(undefined)
        setDialogOpen(true)
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleSave = async (data: CreateBookmarkData) => {
    await createBookmark({
      url: data.url,
      title: data.title,
      description: '',
      notes: data.notes,
      tags: data.tags.join(' '),
    })
    queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
    setDialogOpen(false)
  }

  return (
    <>
      <div className="app">
        <Sidebar
          onAddClick={() => {
            setEditBookmark(undefined)
            setDialogOpen(true)
          }}
        />
        <Outlet />
      </div>
      <BookmarkDialog
        open={dialogOpen}
        bookmark={editBookmark}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
    </>
  )
}
