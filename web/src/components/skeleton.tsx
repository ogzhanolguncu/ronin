import sk from './skeleton.module.css'
import bm from './bookmark-item.module.css'
import sb from './sidebar.module.css'

type BoneProps = {
  w?: string
  h?: string
  round?: boolean
  className?: string
}

export function Bone({ w, h = '12px', round, className }: BoneProps) {
  return (
    <span
      className={`${sk.bone}${className ? ` ${className}` : ''}`}
      style={{
        width: w,
        height: h,
        borderRadius: round ? '50%' : undefined,
      }}
    />
  )
}
export function BookmarkSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div className={bm.bmItem} style={{ '--delay': `${delay}s` } as React.CSSProperties}>
      {/* header: favicon + title — real: 20px tall (favicon) */}
      <div className={bm.bmHeader}>
        <Bone w="20px" h="20px" />
        <Bone w="60%" h="14px" />
      </div>
      <Bone w="40%" h="14px" />
      <Bone w="40%" h="18px" />
      <div className={bm.bmMeta}>
        <Bone w="48px" h="13px" />
        <Bone w="36px" h="13px" />
        <Bone w="60px" h="13px" />
      </div>
      <div className={bm.bmActions}>
        <Bone w="42px" h="18px" />
        <Bone w="56px" h="18px" />
      </div>
    </div>
  )
}

export function TagSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div className={sb.tagItem} style={{ '--delay': `${delay}s` } as React.CSSProperties}>
      <Bone w="4px" h="4px" round />
      <Bone w="70%" h="14px" />
    </div>
  )
}




