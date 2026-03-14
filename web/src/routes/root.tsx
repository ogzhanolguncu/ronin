import { Outlet } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FilterContext } from '../lib/filter-context'
import { Sidebar } from '../components/sidebar'
import { BookmarkDialog } from '../components/bookmark-dialog'
import { getBookmarks, createBookmark } from '../lib/api'
import type { Bookmark, CreateBookmarkData } from '../lib/types'

export function RootLayout() {
  const queryClient = useQueryClient()
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editBookmark, setEditBookmark] = useState<Bookmark | undefined>(undefined)

  const { data } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => getBookmarks(),
  })
  console.log({ data })

  const tags = [...new Set((data?.bookmarks ?? []).flatMap((b) => b.tags))].sort()
  const totalCount = data?.bookmarks.length ?? 0

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
    <FilterContext.Provider value={{ activeTag, onTagClick: setActiveTag }}>
      <div className="app">
        <Sidebar
          tags={tags}
          activeTag={activeTag}
          onTagClick={setActiveTag}
          totalCount={totalCount}
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
    </FilterContext.Provider>
  )
}
