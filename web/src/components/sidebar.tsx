import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { GridIcon, ClockIcon, PlusIcon } from '../lib/icons'
import { getBookmarks } from '../lib/api'
import { TagSkeleton } from './skeleton'
import { Button } from '@/components/ui/button'

type Props = {
  onAddClick?: () => void
}

export function Sidebar({ onAddClick }: Props) {
  const { tag: activeTag } = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })
  const { data, isLoading } = useQuery({ queryKey: ['bookmarks'], queryFn: () => getBookmarks() })
  const tags = [...new Set((data?.bookmarks ?? []).flatMap((b) => b.tags))].sort()
  const totalCount = data?.bookmarks.length ?? 0

  const handleTagClick = (tag: string | undefined) =>
    navigate({ search: (prev) => ({ ...prev, tag }) })

  return (
    <aside className="bg-surface border-r border-border flex flex-col h-full overflow-hidden">
      <div className="px-[18px] h-[68px] flex flex-col justify-center border-b border-border shrink-0">
        <div className="flex items-center">
          <span className="text-base font-semibold text-foreground tracking-tight">Safha</span>
          <span className="w-[5px] h-[5px] rounded-full bg-primary ml-0.5 mb-1.5 shrink-0 inline-block" />
        </div>
        <div className="font-mono text-xs text-muted-foreground font-light tracking-wide mt-0.5">صفحة</div>
      </div>

      <div className="pt-4 pb-1.5 shrink-0">
        <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground px-[18px] mb-1">Library</div>
        <div
          className={`flex items-center gap-2 px-[18px] py-1.5 text-xs cursor-pointer border-l-2 transition-all select-none ${
            !activeTag
              ? 'text-primary border-l-primary bg-accent-dim font-medium'
              : 'text-muted2 border-l-transparent hover:text-text2 hover:bg-surface2'
          } [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:shrink-0`}
          onClick={() => handleTagClick(undefined)}
        >
          <GridIcon />
          All bookmarks
          <span className="ml-auto font-mono text-[10px] text-muted-foreground bg-surface2 border border-border px-1 py-px rounded-sm">
            {totalCount}
          </span>
        </div>
        <div className="flex items-center gap-2 px-[18px] py-1.5 text-xs text-muted2 cursor-pointer border-l-2 border-l-transparent transition-all select-none hover:text-text2 hover:bg-surface2 [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:shrink-0">
          <ClockIcon />
          Recent
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pt-3.5 pb-1.5 thin-scrollbar">
        <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground px-[18px] mb-2">Tags</div>
        <div className="px-2.5 flex flex-col gap-px">
          {isLoading ? (
            [0, 1, 2, 3, 4, 5].map((i) => (
              <TagSkeleton key={i} delay={i * 0.1} />
            ))
          ) : (
            tags.map((tag) => (
              <div
                key={tag}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-all ${
                  activeTag === tag
                    ? 'bg-accent-dim text-primary font-medium'
                    : 'text-muted2 hover:bg-surface2 hover:text-text2'
                }`}
                onClick={() => handleTagClick(tag)}
              >
                <span className={`w-1 h-1 rounded-full shrink-0 transition-colors ${
                  activeTag === tag ? 'bg-primary' : 'bg-border2'
                }`} />
                {tag}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-3.5 border-t border-border shrink-0 bg-surface">
        <Button
          className="w-full gap-1.5"
          onClick={onAddClick}
        >
          <PlusIcon className="w-3 h-3" />
          Add bookmark
        </Button>
      </div>
    </aside>
  )
}
