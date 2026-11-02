import { Link, createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { SongListSkeleton } from '#/components/loading'
import { APP_NAME } from '#/lib/brand'
import { loadPublishedSongs } from '#/lib/songbook/song-server'
import type { SongListItem } from '#/lib/songbook/types'

export const Route = createFileRoute('/')({
  loader: async () => {
    const songs = await loadPublishedSongs()
    return { songs }
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

function matchesSearch(song: SongListItem, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    song.title.toLowerCase().includes(q) ||
    song.artist.toLowerCase().includes(q) ||
    song.username.toLowerCase().includes(q)
  )
}

function matchesLetter(song: SongListItem, letter: LetterFilter): boolean {
  if (letter === 'all') return true
  return titleFirstLetter(song.title) === letter
}

function SongIndex() {
  const { songs } = Route.useLoaderData()
  const { user } = Route.useRouteContext()
  const [query, setQuery] = useState('')
  const [letter, setLetter] = useState<LetterFilter>('all')

  const filtered = useMemo(() => {
    const trimmed = query.trim()
    return songs.filter(
      (song) => matchesSearch(song, trimmed) && matchesLetter(song, letter),
    )
  }, [songs, query, letter])

  const hasFilters = query.trim().length > 0 || letter !== 'all'

  return (
    <main className="song-index">
      <header className="song-index__header">
        <h1>Songs</h1>
        <p className="lede">
          Chord sheets for mobile and tablet — swipe pages, change key, print.
        </p>
        <p className="song-index__nav">
          {user ? (
            <>
              <Link to="/my/songs" className="back-link">
                My songs
              </Link>
              <Link to="/songs/new" className="back-link">
                New song
              </Link>
            </>
          ) : (
            <Link to="/login" className="back-link">
              Log in
            </Link>
          )}
        </p>
      </header>

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
              {filtered.map((song) => (
                <li key={song.id}>
                  <Link
                    to="/songs/$username/$slug"
                    params={{ username: song.username, slug: song.slug }}
                    className="song-list__link"
                  >
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
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  )
}
