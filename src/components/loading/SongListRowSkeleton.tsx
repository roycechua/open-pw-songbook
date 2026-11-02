import { SkeletonBlock } from './SkeletonBlock'

type SongListRowSkeletonProps = {
  showActions?: boolean
}

export function SongListRowSkeleton({
  showActions = false,
}: SongListRowSkeletonProps) {
  return (
    <li className="song-list__item" aria-hidden="true">
      <div className="song-list__link song-list__link--skeleton">
        <SkeletonBlock className="skeleton--title" />
        <SkeletonBlock className="skeleton--text skeleton--text-wide" />
      </div>
      {showActions ? (
        <div className="song-list__actions">
          <SkeletonBlock className="skeleton--chip" />
          <SkeletonBlock className="skeleton--chip" />
        </div>
      ) : null}
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
