import { Link } from '@tanstack/react-router'
import { useEffect, useId, useState } from 'react'
import { PlaylistShimmer } from '#/components/loading'

/** Song row shown in the viewer sidebar (favorites or a custom playlist). */
export type SidebarSong = {
  key: string
  songId: string
  title: string
  artist: string
  username: string
  slug: string
}

type PeekStack = 'solo' | 'above' | 'below'

type Props = {
  /** Heading, e.g. "Favorites" or the playlist name. */
  title: string
  items: SidebarSong[]
  emptyText: string
  /** Glyph on the collapsed hover rail. */
  peekIcon: string
  /** Stacked peeks when both favorites and a playlist are available. */
  peekStack?: PeekStack
  /** Panel id for toolbar `aria-controls`. */
  panelId?: string
  /** Set to keep `?playlist=` on sidebar links. */
  playlistId?: string | null
  /** Optional link under the heading (e.g. to manage the playlist). */
  manageLink?: { playlistId: string; label: string }
  currentSongId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When true, hover does not open — only the explicit toggle. */
  coarsePointer: boolean
  loading?: boolean
}

export function PlaylistSidebar({
  title,
  items,
  emptyText,
  peekIcon,
  peekStack = 'solo',
  panelId = 'playlist-sidebar-panel',
  playlistId = null,
  manageLink,
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
    peekStack === 'above' ? 'playlist-sidebar--stack-above' : '',
    peekStack === 'below' ? 'playlist-sidebar--stack-below' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <aside className={className} aria-labelledby={titleId}>
      {!coarsePointer ? (
        <button
          type="button"
          className="playlist-sidebar__peek"
          aria-label={`${title} (hover or focus to open)`}
          aria-expanded={open}
          aria-controls={panelId}
        >
          <span className="playlist-sidebar__peek-label" aria-hidden="true">
            {peekIcon}
          </span>
        </button>
      ) : null}

      <div className="playlist-sidebar__panel" id={panelId}>
        <div className="playlist-sidebar__header">
          <div className="playlist-sidebar__heading">
            <h2 id={titleId} className="playlist-sidebar__title">
              {title}
            </h2>
            {manageLink ? (
              <Link
                to="/playlists/$playlistId"
                params={{ playlistId: manageLink.playlistId }}
                className="playlist-sidebar__manage"
              >
                {manageLink.label}
              </Link>
            ) : null}
          </div>
          {coarsePointer ? (
            <button
              type="button"
              className="playlist-sidebar__close"
              onClick={() => onOpenChange(false)}
              aria-label={`Close ${title}`}
            >
              Close
            </button>
          ) : null}
        </div>

        {loading ? (
          <div aria-busy="true" aria-live="polite">
            <span className="visually-hidden">Loading {title}</span>
            <PlaylistShimmer rows={5} />
          </div>
        ) : items.length === 0 ? (
          <p className="playlist-sidebar__empty">{emptyText}</p>
        ) : (
          <nav aria-label={`${title} songs`}>
            <ul className="playlist-sidebar__list">
              {items.map((item, index) => {
                const active = item.songId === currentSongId
                return (
                  <li key={item.key}>
                    <Link
                      to="/songs/$username/$slug"
                      params={{ username: item.username, slug: item.slug }}
                      search={playlistId ? { playlist: playlistId } : {}}
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
                        {playlistId ? (
                          <span className="playlist-sidebar__index">
                            {index + 1}.
                          </span>
                        ) : null}
                        {item.title}
                      </span>
                      <span className="playlist-sidebar__song-meta">
                        @{item.username}
                        {item.artist ? ` · ${item.artist}` : ''}
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
  // Start false on both server and client so hydration matches; the effect
  // switches to the real value right after mount.
  const [coarse, setCoarse] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(hover: none), (pointer: coarse)')
    const update = () => setCoarse(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return coarse
}
