import { SkeletonBlock } from './SkeletonBlock'

type PlaylistShimmerProps = {
  rows?: number
}

export function PlaylistShimmer({ rows = 5 }: PlaylistShimmerProps) {
  return (
    <ul className="playlist-sidebar__list playlist-sidebar__list--skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="playlist-sidebar__skel-item">
          <SkeletonBlock className="skeleton--text" />
          <SkeletonBlock className="skeleton--text skeleton--text-narrow" />
        </li>
      ))}
    </ul>
  )
}
