import { SkeletonBlock } from './SkeletonBlock'

export function SongEditorSkeleton() {
  return (
    <main
      className="editor editor--pending"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="visually-hidden">Loading editor</span>
      <header className="editor__header" aria-hidden="true">
        <SkeletonBlock className="skeleton--icon" />
        <div className="editor__heading">
          <SkeletonBlock className="skeleton--heading" />
        </div>
      </header>
      <div className="editor__form" aria-hidden="true">
        <SkeletonBlock className="skeleton--field" />
        <div className="editor__workspace">
          <SkeletonBlock className="skeleton--textarea" />
        </div>
        <div className="editor__dock editor__dock--skeleton">
          <SkeletonBlock className="skeleton--chip skeleton--chip-wide" />
          <SkeletonBlock className="skeleton--chip skeleton--chip-wide" />
        </div>
      </div>
    </main>
  )
}
