type BoneProps = {
  w?: string
  h?: string
  round?: boolean
  className?: string
}

export function Bone({ w, h = '12px', round, className }: BoneProps) {
  return (
    <span
      className={`bone${className ? ` ${className}` : ''}`}
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
    <div
      className="px-5 py-4 border-b border-border flex flex-col gap-1.5"
      style={{ '--delay': `${delay}s` } as React.CSSProperties}
    >
      <div className="flex items-center gap-2">
        <Bone w="20px" h="20px" />
        <Bone w="60%" h="14px" />
      </div>
      <Bone w="40%" h="14px" />
      <Bone w="40%" h="18px" />
      <div className="flex items-center gap-2 mt-1">
        <Bone w="48px" h="13px" />
        <Bone w="36px" h="13px" />
        <Bone w="60px" h="13px" />
      </div>
      <div className="flex items-center gap-1.5 -ml-1.5">
        <Bone w="42px" h="18px" />
        <Bone w="56px" h="18px" />
      </div>
    </div>
  )
}

export function TagSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded-md"
      style={{ '--delay': `${delay}s` } as React.CSSProperties}
    >
      <Bone w="4px" h="4px" round />
      <Bone w="70%" h="14px" />
    </div>
  )
}
