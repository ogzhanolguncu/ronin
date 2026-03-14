import { GridIcon, ClockIcon, PlusIcon } from '../lib/icons'
import s from './sidebar.module.css'

type Props = {
  tags: string[]
  activeTag: string | null
  onTagClick: (tag: string | null) => void
  totalCount?: number
  onAddClick?: () => void
}

export function Sidebar({ tags, activeTag, onTagClick, totalCount = 0, onAddClick }: Props) {
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
          className={[s.navItem, activeTag === null ? s.active : ''].filter(Boolean).join(' ')}
          onClick={() => onTagClick(null)}
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
              onClick={() => onTagClick(tag)}
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
