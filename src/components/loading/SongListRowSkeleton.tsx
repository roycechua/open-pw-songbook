import { SkeletonBlock } from './SkeletonBlock'

type SongListRowSkeletonProps = {
  showActions?: boolean
}

export function SongListRowSkeleton({
  showActions = false,
}: SongListRowSkeletonProps) {
  if (showActions) {
    return (
      <li className="song-list__item" aria-hidden="true">
        <div className="song-list__card song-list__card--skeleton">
          <div className="song-list__main">
            <SkeletonBlock className="skeleton--title" />
            <SkeletonBlock className="skeleton--text skeleton--text-wide" />
          </div>
          <div className="song-list__icon-actions">
            <SkeletonBlock className="skeleton--icon" />
            <SkeletonBlock className="skeleton--icon" />
            <SkeletonBlock className="skeleton--icon" />
          </div>
        </div>
      </li>
    )
  }

  return (
    <li className="song-list__item" aria-hidden="true">
      <div className="song-list__link song-list__link--skeleton">
        <SkeletonBlock className="skeleton--title" />
        <SkeletonBlock className="skeleton--text skeleton--text-wide" />
      </div>
    </li>
  )
}

type SongListShimmerProps = {
  rows?: number
  showActions?: boolean
  className?: string
}

export function SongListShimmer({
  rows = 6,
  showActions = false,
  className = '',
}: SongListShimmerProps) {
  return (
    <ul
      className={`song-list ${className}`.trim()}
      aria-hidden="true"
    >
      {Array.from({ length: rows }, (_, i) => (
        <SongListRowSkeleton key={i} showActions={showActions} />
      ))}
    </ul>
  )
}
