import type { CSSProperties } from 'react'

type SkeletonBlockProps = {
  className?: string
  style?: CSSProperties
}

export function SkeletonBlock({ className = '', style }: SkeletonBlockProps) {
  return (
    <span
      className={`skeleton shimmer ${className}`.trim()}
      style={style}
      aria-hidden="true"
    />
  )
}
