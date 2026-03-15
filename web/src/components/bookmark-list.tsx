import { useState, useRef, useMemo, useCallback } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchIcon } from '../lib/icons'
import { BookmarkItem } from './bookmark-item'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getBookmarks, searchBookmarks } from '../lib/api'
import { BookmarkSkeleton } from './skeleton'

const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Title A–Z', value: 'az' },
] as const

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
    <main className="flex flex-col overflow-hidden bg-background">
      <div className="px-5 h-[68px] border-b border-border flex items-center gap-2.5 shrink-0 bg-surface">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            className="w-full h-8 bg-background border border-border rounded-md pl-8 pr-3 text-foreground text-xs font-light outline-none transition-all placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
            type="text"
            placeholder="Search bookmarks..."
            onChange={handleSearch}
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)} >
          <SelectTrigger >
            <SelectValue />
          </SelectTrigger>
          <SelectContent position='popper'>
            {sortOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="px-5 pt-3.5 pb-1.5 font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground">
          {label} · {items.length}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar">
          {isLoading ? (
            <>
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <BookmarkSkeleton key={i} delay={i * 0.1} />
              ))}
            </>
          ) : isError ? (
            <div className="flex-1 min-h-full flex flex-col items-center justify-center p-10 text-center">
              <div className="text-[13px] font-medium text-muted2">Failed to load bookmarks</div>
              <div className="text-[11px] text-muted-foreground font-light">Check that the server is running</div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex-1 min-h-full flex flex-col items-center justify-center px-10 py-15 text-center">
              <div className="text-[34px] text-muted-foreground mb-3.5 leading-none">◈</div>
              <div className="text-[13px] font-medium text-muted2">
                {debouncedQuery ? 'No results' : 'No bookmarks yet'}
              </div>
              <div className="text-[11px] text-muted-foreground font-light">
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
