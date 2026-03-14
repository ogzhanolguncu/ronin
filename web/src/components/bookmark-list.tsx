import { useState, useEffect } from 'react'
import { Select, createListCollection } from '@ark-ui/react/select'
import { SearchIcon, ChevronDownIcon } from '../lib/icons'
import { BookmarkItem } from './bookmark-item'
import { ConfirmDialog } from './confirm-dialog'
import { BookmarkDialog } from './bookmark-dialog'
import { useFilterContext } from '../lib/filter-context'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getBookmarks, searchBookmarks, deleteBookmark, archiveBookmarks, updateBookmark } from '../lib/api'
import type { Bookmark, CreateBookmarkData } from '../lib/types'
import s from './bookmark-list.module.css'

const sortCollection = createListCollection({
  items: [
    { label: 'Newest', value: 'newest' },
    { label: 'Oldest', value: 'oldest' },
    { label: 'Title A–Z', value: 'az' },
  ],
})

export function BookmarkList() {
  const queryClient = useQueryClient()
  const { activeTag, onTagClick } = useFilterContext()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest' | 'az'>('newest')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Bookmark | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Bookmark | undefined>(undefined)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['bookmarks', debouncedQuery],
    queryFn: () => debouncedQuery ? searchBookmarks(debouncedQuery) : getBookmarks(),
  })

  const items = (data?.bookmarks ?? [])
    .filter((b) => !activeTag || b.tags.includes(activeTag))
    .sort((a, b) => {
      if (sort === 'oldest') return a.created_at - b.created_at
      if (sort === 'az') return a.title.localeCompare(b.title)
      return b.created_at - a.created_at
    })

  const handleEdit = (b: Bookmark) => {
    setEditTarget(b)
    setEditOpen(true)
  }

  const handleDelete = (id: number) => {
    const target = data?.bookmarks.find((b) => b.id === id)
    if (target) {
      setDeleteTarget(target)
      setConfirmOpen(true)
    }
  }

  const handleArchive = async (id: number, archived: boolean) => {
    await archiveBookmarks([{ id, archived }])
    queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
  }

  const handleTagClick = (tag: string) => {
    onTagClick(tag)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    await deleteBookmark(deleteTarget.id)
    queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
    setConfirmOpen(false)
    setDeleteTarget(null)
  }

  const handleEditSave = async (formData: CreateBookmarkData) => {
    if (!editTarget) return
    await updateBookmark({
      id: editTarget.id,
      url: formData.url,
      title: formData.title,
      description: editTarget.description,
      notes: formData.notes,
      tags: formData.tags.join(' '),
    })
    queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
    setEditOpen(false)
  }

  const label = activeTag ? `#${activeTag}` : 'All bookmarks'

  return (
    <main className={s.main}>
      <div className={s.topbar}>
        <div className={s.searchWrap}>
          <SearchIcon className={s.searchIcon} />
          <input
            className={s.searchInput}
            type="text"
            placeholder="Search bookmarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select.Root
          collection={sortCollection}
          value={[sort]}
          onValueChange={(e) => setSort(e.value[0] as typeof sort)}
          positioning={{ placement: 'bottom-end' }}
        >
          <Select.Trigger className={s.sortSelect}>
            <Select.ValueText />
            <ChevronDownIcon className={s.sortChevron} />
          </Select.Trigger>
          <Select.Positioner>
            <Select.Content className={s.sortDropdown}>
              {sortCollection.items.map((item) => (
                <Select.Item key={item.value} item={item} className={s.sortOption}>
                  <Select.ItemText>{item.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Select.Root>
      </div>

      <div className={s.bmList}>
        <div className={s.listHeader}>
          {label} · {items.length}
        </div>
        <div className={s.bmListViewport}>
          {isLoading ? (
            <div className={s.empty}>
              <div className={s.emptyTitle}>Loading…</div>
            </div>
          ) : isError ? (
            <div className={s.empty}>
              <div className={s.emptyTitle}>Failed to load bookmarks</div>
              <div className={s.emptySub}>Check that the server is running</div>
            </div>
          ) : items.length === 0 ? (
            <div className={s.empty}>
              <div className={s.emptyGlyph}>◈</div>
              <div className={s.emptyTitle}>
                {searchQuery ? 'No results' : 'No bookmarks yet'}
              </div>
              <div className={s.emptySub}>
                {searchQuery ? 'Try a different search term' : 'Press N or click Add bookmark'}
              </div>
            </div>
          ) : (
            items.map((bm) => (
              <BookmarkItem
                key={bm.id}
                bookmark={bm}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onArchive={handleArchive}
                onTagClick={handleTagClick}
              />
            ))
          )}

        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={deleteTarget?.title ?? ''}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />

      <BookmarkDialog
        open={editOpen}
        bookmark={editTarget}
        onClose={() => setEditOpen(false)}
        onSave={handleEditSave}
      />
    </main>
  )
}
