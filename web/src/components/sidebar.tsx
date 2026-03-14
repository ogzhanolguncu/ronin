import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { GridIcon, ClockIcon, PlusIcon } from '../lib/icons'
import { getBookmarks } from '../lib/api'
import s from './sidebar.module.css'

type Props = {
  onAddClick?: () => void
}

export function Sidebar({ onAddClick }: Props) {
  const { tag: activeTag } = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })
  const { data } = useQuery({ queryKey: ['bookmarks'], queryFn: () => getBookmarks() })
  const tags = [...new Set((data?.bookmarks ?? []).flatMap((b) => b.tags))].sort()
  const totalCount = data?.bookmarks.length ?? 0

  const handleTagClick = (tag: string | undefined) =>
    navigate({ search: (prev) => ({ ...prev, tag }) })

  return (
    <aside className={s.sidebar}>
      <div className={s.logoWrap}>
        <div className={s.logoRow}>
          <span className={s.logoText}>Safha</span>
          <span className={s.logoDot}></span>
        </div>
        <div className={s.logoSub}>صفحة</div>
      </div>

      <div className={s.navSection}>
        <div className={s.navLabel}>Library</div>
        <div
          className={[s.navItem, !activeTag ? s.active : ''].filter(Boolean).join(' ')}
          onClick={() => handleTagClick(undefined)}
        >
          <GridIcon />
          All bookmarks
          <span className={s.navCount}>{totalCount}</span>
        </div>
        <div className={s.navItem}>
          <ClockIcon />
          Recent
        </div>
      </div>

      <div className={s.tagsSection}>
        <div className={s.navLabel} style={{ marginBottom: '8px' }}>Tags</div>
        <div className={s.tagsInner}>
          {tags.map((tag) => (
            <div
              key={tag}
              className={[s.tagItem, activeTag === tag ? s.active : ''].filter(Boolean).join(' ')}
              onClick={() => handleTagClick(tag)}
            >
              <span className={s.tagPip}></span>
              {tag}
            </div>
          ))}
        </div>
      </div>

      <div className={s.sidebarFoot}>
        <button className={s.addBtn} onClick={onAddClick}>
          <PlusIcon />
          Add bookmark
        </button>
      </div>
    </aside>
  )
}
