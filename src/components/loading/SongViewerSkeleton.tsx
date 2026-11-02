import { SkeletonBlock } from './SkeletonBlock'

export function SongViewerSkeleton() {
  return (
    <div
      className="song-page-shell song-page-shell--pending"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="visually-hidden">Loading song</span>
      <header className="viewer-toolbar no-print" aria-hidden="true">
        <div className="viewer-toolbar__top">
          <SkeletonBlock className="skeleton--chip" />
          <div className="viewer-toolbar__titles">
            <SkeletonBlock className="skeleton--heading" />
            <SkeletonBlock className="skeleton--text" />
          </div>
          <div className="viewer-toolbar__actions">
            <SkeletonBlock className="skeleton--chip" />
            <SkeletonBlock className="skeleton--chip" />
          </div>
        </div>
        <div className="viewer-toolbar__controls">
          <SkeletonBlock className="skeleton--chip" />
          <SkeletonBlock className="skeleton--chip" />
          <SkeletonBlock className="skeleton--chip" />
        </div>
      </header>
      <div className="song-sheet song-sheet--skeleton" aria-hidden="true">
        <SkeletonBlock className="skeleton--section" />
        <SkeletonBlock className="skeleton--line" />
        <SkeletonBlock className="skeleton--line skeleton--line-short" />
        <SkeletonBlock className="skeleton--line" />
        <SkeletonBlock className="skeleton--section" />
        <SkeletonBlock className="skeleton--line" />
        <SkeletonBlock className="skeleton--line skeleton--line-short" />
        <SkeletonBlock className="skeleton--line" />
        <SkeletonBlock className="skeleton--line" />
      </div>
    </div>
  )
}
