import { useState, useRef, useMemo, useCallback } from 'react'
import { Select, createListCollection } from '@ark-ui/react/select'
import { SearchIcon, ChevronDownIcon } from '../lib/icons'
import { BookmarkItem } from './bookmark-item'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getBookmarks, searchBookmarks } from '../lib/api'
import s from './bookmark-list.module.css'

const sortCollection = createListCollection({
  items: [
    { label: 'Newest', value: 'newest' },
    { label: 'Oldest', value: 'oldest' },
    { label: 'Title A–Z', value: 'az' },
  ],
})

export function BookmarkList() {
  const { tag: activeTag } = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest' | 'az'>('newest')
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebouncedQuery(value), 300)
  }, [])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['bookmarks', debouncedQuery],
    queryFn: () => debouncedQuery ? searchBookmarks(debouncedQuery) : getBookmarks(),
  })

  const items = useMemo(() =>
    (data?.bookmarks ?? [])
      .filter((b) => !activeTag || b.tags.includes(activeTag))
      .sort((a, b) => {
        if (sort === 'oldest') return a.created_at - b.created_at
        if (sort === 'az') return a.title.localeCompare(b.title)
        return b.created_at - a.created_at
      }),
    [data, activeTag, sort]
  )

  const handleTagClick = useCallback(
    (tag: string) => navigate({ search: (prev) => ({ ...prev, tag }) }),
    [navigate]
  )

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
            onChange={handleSearch}
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
                {debouncedQuery ? 'No results' : 'No bookmarks yet'}
              </div>
              <div className={s.emptySub}>
                {debouncedQuery ? 'Try a different search term' : 'Press N or click Add bookmark'}
              </div>
            </div>
          ) : (
            items.map((bm) => (
              <BookmarkItem
                key={bm.id}
                bookmark={bm}
                onTagClick={handleTagClick}
              />
            ))
          )}

        </div>
      </div>
    </main>
  )
}
