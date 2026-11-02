import { Link } from '@tanstack/react-router'
import { useEffect, useId, useState } from 'react'
import { PlaylistShimmer } from '#/components/loading'
import type { PlaylistFavorite } from '#/lib/songbook'

type Props = {
  favorites: PlaylistFavorite[]
  currentSongId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When true, hover does not open — only the explicit toggle. */
  coarsePointer: boolean
  loading?: boolean
}

export function PlaylistSidebar({
  favorites,
  currentSongId,
  open,
  onOpenChange,
  coarsePointer,
  loading = false,
}: Props) {
  const titleId = useId()
  const className = [
    'playlist-sidebar',
    'no-print',
    open ? 'is-open' : '',
    coarsePointer ? 'playlist-sidebar--touch' : 'playlist-sidebar--hover',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <aside className={className} aria-labelledby={titleId}>
      {!coarsePointer ? (
        <button
          type="button"
          className="playlist-sidebar__peek"
          aria-label="Favorites playlist (hover or focus to open)"
        >
          <span className="playlist-sidebar__peek-label" aria-hidden="true">
            ★
          </span>
        </button>
      ) : null}

      <div className="playlist-sidebar__panel" id="playlist-sidebar-panel">
        <div className="playlist-sidebar__header">
          <h2 id={titleId} className="playlist-sidebar__title">
            Favorites
          </h2>
          {coarsePointer ? (
            <button
              type="button"
              className="playlist-sidebar__close"
              onClick={() => onOpenChange(false)}
              aria-label="Close favorites"
            >
              Close
            </button>
          ) : null}
        </div>

        {loading ? (
          <div aria-busy="true" aria-live="polite">
            <span className="visually-hidden">Loading favorites</span>
            <PlaylistShimmer rows={5} />
          </div>
        ) : favorites.length === 0 ? (
          <p className="playlist-sidebar__empty">
            No favorites yet. Add a published song with the star control.
          </p>
        ) : (
          <nav aria-label="Favorite songs">
            <ul className="playlist-sidebar__list">
              {favorites.map((fav) => {
                const active = fav.songId === currentSongId
                return (
                  <li key={fav.id}>
                    <Link
                      to="/songs/$username/$slug"
                      params={{ username: fav.username, slug: fav.slug }}
                      className={
                        active
                          ? 'playlist-sidebar__link is-active'
                          : 'playlist-sidebar__link'
                      }
                      aria-current={active ? 'page' : undefined}
                      onClick={() => {
                        if (coarsePointer) onOpenChange(false)
                      }}
                    >
                      <span className="playlist-sidebar__song-title">
                        {fav.title}
                      </span>
                      <span className="playlist-sidebar__song-meta">
                        @{fav.username}
                        {fav.artist ? ` · ${fav.artist}` : ''}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        )}
      </div>
    </aside>
  )
}

/** Match media for coarse / no-hover pointers (phones, tablets). */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(hover: none), (pointer: coarse)').matches
      : false,
  )

  useEffect(() => {
    const mq = window.matchMedia('(hover: none), (pointer: coarse)')
    const update = () => setCoarse(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return coarse
}
