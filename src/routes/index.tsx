import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { AddToPlaylistButton } from '#/components/AddToPlaylistButton'
import { FavoriteStarButton } from '#/components/FavoriteStarButton'
import { PlaylistCard } from '#/components/PlaylistCard'
import { SongListSkeleton } from '#/components/loading'
import { APP_NAME } from '#/lib/brand'
import {
  HOME_PLAYLIST_PREVIEW_LIMIT,
  listPlaylists,
} from '#/lib/songbook/playlists'
import { matchesSongSearch } from '#/lib/songbook/search'
import { createClient } from '#/lib/supabase/client'
import {
  loadHomeExtrasClient,
  loadPublishedSongsClient,
} from '#/lib/songbook/song-client'
import {
  loadHomeExtras,
  loadPublishedSongs,
  type HomeExtras,
} from '#/lib/songbook/song-server'
import type { SongListItem } from '#/lib/songbook/types'

const NO_EXTRAS: HomeExtras = { playlists: [], favoriteSongIds: [] }

export const Route = createFileRoute('/')({
  loader: async ({ context }) => {
    // SSR / first load: server function. Client navigations: direct to Supabase.
    const onServer = typeof window === 'undefined'
    const signedIn = Boolean(context.user)
    const [songs, extras] = await Promise.all([
      onServer ? loadPublishedSongs() : loadPublishedSongsClient(),
      !signedIn
        ? NO_EXTRAS
        : onServer
          ? loadHomeExtras()
          : loadHomeExtrasClient(),
    ])
    return { songs, extras }
  },
  pendingComponent: () => <SongListSkeleton variant="catalog" />,
  component: SongIndex,
  head: () => ({
    meta: [{ title: APP_NAME }],
  }),
})

const LETTERS = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  '#',
] as const

type LetterFilter = (typeof LETTERS)[number] | 'all'

function titleFirstLetter(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) return '#'
  const first = trimmed[0]!.toUpperCase()
  return /^[A-Z]$/.test(first) ? first : '#'
}

function matchesLetter(song: SongListItem, letter: LetterFilter): boolean {
  if (letter === 'all') return true
  return titleFirstLetter(song.title) === letter
}

function SongIndex() {
  const { songs, extras } = Route.useLoaderData()
  const { user } = Route.useRouteContext()
  const [query, setQuery] = useState('')
  const [letter, setLetter] = useState<LetterFilter>('all')
  const [favoriteIds, setFavoriteIds] = useState(
    () => new Set(extras.favoriteSongIds),
  )
  const [rowError, setRowError] = useState<string | null>(null)
  const [previewPlaylists, setPreviewPlaylists] = useState(extras.playlists)

  useEffect(() => {
    setFavoriteIds(new Set(extras.favoriteSongIds))
    setPreviewPlaylists(extras.playlists)
  }, [extras])

  const refreshPreview = () => {
    if (!user) return
    void listPlaylists(createClient(), user.userId, {
      limit: HOME_PLAYLIST_PREVIEW_LIMIT,
    })
      .then(setPreviewPlaylists)
      .catch(() => {})
  }

  const filtered = useMemo(() => {
    const trimmed = query.trim()
    return songs.filter(
      (song) => matchesSongSearch(song, trimmed) && matchesLetter(song, letter),
    )
  }, [songs, query, letter])

  const setFavorite = (songId: string, favorited: boolean) => {
    setRowError(null)
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (favorited) next.add(songId)
      else next.delete(songId)
      return next
    })
  }

  const hasFilters = query.trim().length > 0 || letter !== 'all'

  return (
    <main className="song-index">
      <header className="song-index__header">
        <div className="song-index__heading">
          <h1>Discover</h1>
          <p className="lede">
            Chord sheets made for stage and mobile: swipe pages, change key,
            resize text, print.
          </p>
        </div>
        {user ? (
          <div className="song-index__actions">
            <Link to="/songs/new" className="btn btn--primary">
              Add new song
            </Link>
          </div>
        ) : null}
      </header>

      {user ? <PlaylistPreview playlists={previewPlaylists} /> : null}

      {rowError ? (
        <p className="song-form__error" role="alert">
          {rowError}
        </p>
      ) : null}

      {songs.length === 0 ? (
        <p className="empty-state">
          No published songs yet. Sign in and publish one to see it here.
        </p>
      ) : (
        <>
          <div className="song-index__filters">
            <label className="song-index__search">
              <span className="visually-hidden">Search songs</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, artist, or @username"
                autoComplete="off"
              />
            </label>
            <div
              className="letter-chips"
              role="group"
              aria-label="Filter by title first letter"
            >
              <button
                type="button"
                className={
                  letter === 'all'
                    ? 'letter-chip letter-chip--active'
                    : 'letter-chip'
                }
                aria-pressed={letter === 'all'}
                onClick={() => setLetter('all')}
              >
                All
              </button>
              {LETTERS.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  className={
                    letter === ch
                      ? 'letter-chip letter-chip--active'
                      : 'letter-chip'
                  }
                  aria-pressed={letter === ch}
                  onClick={() => setLetter(ch)}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="empty-state">
              {hasFilters
                ? 'No songs match your search or letter filter.'
                : 'No published songs yet.'}
            </p>
          ) : (
            <ul className="song-list">
              {filtered.map((song) => {
                const details = (
                  <>
                    <span className="song-list__title">{song.title}</span>
                    <span className="song-list__meta">
                      {song.artist || 'Unknown artist'}
                      <span className="song-list__author">
                        {' '}
                        · @{song.username}
                      </span>
                      <span className="song-list__key">
                        {' '}
                        · {song.originalKey}
                      </span>
                    </span>
                  </>
                )
                if (!user) {
                  return (
                    <li key={song.id}>
                      <Link
                        to="/songs/$username/$slug"
                        params={{ username: song.username, slug: song.slug }}
                        className="song-list__link"
                      >
                        {details}
                      </Link>
                    </li>
                  )
                }
                return (
                  <li key={song.id} className="song-list__item">
                    <article className="song-list__card song-list__card--row">
                      <Link
                        to="/songs/$username/$slug"
                        params={{ username: song.username, slug: song.slug }}
                        className="song-list__main"
                      >
                        {details}
                      </Link>
                      <div
                        className="song-list__quick-actions"
                        role="group"
                        aria-label={`Actions for ${song.title}`}
                      >
                        <FavoriteStarButton
                          userId={user.userId}
                          songId={song.id}
                          songTitle={song.title}
                          favorited={favoriteIds.has(song.id)}
                          onChange={(fav) => setFavorite(song.id, fav)}
                          onError={setRowError}
                        />
                        <AddToPlaylistButton
                          userId={user.userId}
                          songId={song.id}
                          songTitle={song.title}
                          onChange={refreshPreview}
                        />
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </main>
  )
}

function PlaylistPreview({
  playlists,
}: {
  playlists: HomeExtras['playlists']
}) {
  return (
    <section
      className="playlist-preview"
      aria-labelledby="playlist-preview-title"
    >
      <div className="playlist-preview__head">
        <h2 id="playlist-preview-title">Your playlists</h2>
        {playlists.length > 0 ? (
          <Link to="/playlists" className="playlist-preview__all">
            See all
          </Link>
        ) : null}
      </div>
      {playlists.length === 0 ? (
        <Link to="/playlists" className="playlist-preview__empty">
          <span className="playlist-preview__empty-plus" aria-hidden="true">
            +
          </span>
          Create your first playlist
        </Link>
      ) : (
        <ul className="playlist-preview__list">
          {playlists.map((playlist) => (
            <li key={playlist.id}>
              <PlaylistCard playlist={playlist} compact />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
