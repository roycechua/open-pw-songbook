import { SkeletonBlock } from './SkeletonBlock'

export function SongEditorSkeleton() {
  return (
    <main
      className="song-index song-index--pending"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="visually-hidden">Loading editor</span>
      <header className="song-index__header" aria-hidden="true">
        <SkeletonBlock className="skeleton--heading" />
        <SkeletonBlock className="skeleton--text skeleton--lede" />
        <div className="song-index__nav">
          <SkeletonBlock className="skeleton--chip" />
          <SkeletonBlock className="skeleton--chip" />
        </div>
      </header>
      <div className="song-form song-form--skeleton" aria-hidden="true">
        <div className="song-form__grid">
          <SkeletonBlock className="skeleton--field" />
          <SkeletonBlock className="skeleton--field" />
          <SkeletonBlock className="skeleton--field" />
          <SkeletonBlock className="skeleton--field" />
        </div>
        <SkeletonBlock className="skeleton--textarea" />
        <div className="song-form__actions">
          <SkeletonBlock className="skeleton--chip skeleton--chip-wide" />
          <SkeletonBlock className="skeleton--chip" />
        </div>
      </div>
    </main>
  )
}
