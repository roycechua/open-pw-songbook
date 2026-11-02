import { SkeletonBlock } from './SkeletonBlock'
import { SongListShimmer } from './SongListRowSkeleton'

type SongListSkeletonProps = {
  /** My songs: action column placeholders on each row. */
  variant?: 'catalog' | 'mine'
}

export function SongListSkeleton({
  variant = 'catalog',
}: SongListSkeletonProps) {
  return (
    <main
      className="song-index song-index--pending"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="visually-hidden">Loading songs</span>
      <header className="song-index__header" aria-hidden="true">
        <SkeletonBlock className="skeleton--heading" />
        <SkeletonBlock className="skeleton--text skeleton--lede" />
        <div className="song-index__nav">
          <SkeletonBlock className="skeleton--chip" />
          <SkeletonBlock className="skeleton--chip" />
        </div>
      </header>

      {variant === 'catalog' ? (
        <div className="song-index__filters" aria-hidden="true">
          <SkeletonBlock className="skeleton--search" />
          <div className="letter-chips letter-chips--skeleton">
            {Array.from({ length: 10 }, (_, i) => (
              <SkeletonBlock key={i} className="skeleton--letter" />
            ))}
          </div>
        </div>
      ) : null}

      <SongListShimmer
        rows={variant === 'mine' ? 5 : 6}
        showActions={variant === 'mine'}
      />
    </main>
  )
}
