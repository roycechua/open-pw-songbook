import { SkeletonBlock } from './SkeletonBlock'

/** Fallback pending shell for routes without a custom skeleton. */
export function RoutePending() {
  return (
    <main
      className="song-index song-index--pending"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="visually-hidden">Loading</span>
      <header className="song-index__header" aria-hidden="true">
        <SkeletonBlock className="skeleton--heading" />
        <SkeletonBlock className="skeleton--text skeleton--lede" />
      </header>
      <div className="route-pending__body" aria-hidden="true">
        <SkeletonBlock className="skeleton--block" />
        <SkeletonBlock className="skeleton--block" />
        <SkeletonBlock className="skeleton--block skeleton--block-short" />
      </div>
    </main>
  )
}
