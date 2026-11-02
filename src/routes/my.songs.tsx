import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { BusyButton, SongListSkeleton } from '#/components/loading'
import { APP_NAME } from '#/lib/brand'
import {
  downloadChordPro,
  type SongListItem,
} from '#/lib/songbook'
import { createClient } from '#/lib/supabase/client'
import { deleteSong, getSongByUsernameSlug } from '#/lib/songbook/songs'
import { loadMySongs } from '#/lib/songbook/song-server'

export const Route = createFileRoute('/my/songs')({
  loader: async () => {
    const data = await loadMySongs()
    if (!data.session) {
      throw redirect({ to: '/login' })
    }
    return { session: data.session, songs: data.songs }
  },
  pendingComponent: () => <SongListSkeleton variant="mine" />,
  component: MySongsPage,
  head: () => ({
    meta: [{ title: `My songs · ${APP_NAME}` }],
  }),
})

function IconEdit() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25zm14.71-9.04a1 1 0 0 0 0-1.41l-1.51-1.51a1 1 0 0 0-1.41 0l-1.18 1.18 2.75 2.75 1.35-1.01z"
      />
    </svg>
  )
}

function IconExport() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5 20h14v-2H5v2zM12 2 6.5 8h3.5v6h4V8h3.5L12 2z"
      />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
      />
    </svg>
  )
}

function MySongsPage() {
  const { session, songs: initialSongs } = Route.useLoaderData()
  const [songs, setSongs] = useState(initialSongs)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onExport = async (song: SongListItem) => {
    setError(null)
    setBusyKey(`export:${song.id}`)
    try {
      const supabase = createClient()
      const full = await getSongByUsernameSlug(
        supabase,
        song.username,
        song.slug,
      )
      if (!full) {
        setError('Could not load song for export')
        return
      }
      downloadChordPro(full.slug, full.chordPro)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setBusyKey(null)
    }
  }

  const onDelete = async (song: SongListItem) => {
    if (!window.confirm(`Delete “${song.title}”? This cannot be undone.`)) {
      return
    }
    setError(null)
    setBusyKey(`delete:${song.id}`)
    try {
      const supabase = createClient()
      const result = await deleteSong(supabase, song.id)
      if (result.error) {
        setError(result.error.message)
        return
      }
      setSongs((prev) => prev.filter((s) => s.id !== song.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <main className="song-index">
      <header className="song-index__header">
        <h1>My songs</h1>
        <p className="lede">
          Drafts and published songs for @{session.username}.
        </p>
        <p className="song-index__nav">
          <Link to="/songs/new" className="back-link">
            Add New Song
          </Link>
          <Link to="/" className="back-link">
            Catalog
          </Link>
        </p>
      </header>

      {error ? (
        <p className="song-form__error" role="alert">
          {error}
        </p>
      ) : null}

      {songs.length === 0 ? (
        <p className="empty-state">
          You have no songs yet.{' '}
          <Link to="/songs/new">Add a new song</Link> or import a previously
          exported .chordpro file.
        </p>
      ) : (
        <ul className="song-list">
          {songs.map((song) => {
            const rowBusy = busyKey?.endsWith(`:${song.id}`) ?? false
            return (
              <li key={song.id} className="song-list__item">
                <article className="song-list__card">
                  <Link
                    to="/songs/$username/$slug"
                    params={{ username: song.username, slug: song.slug }}
                    className="song-list__main"
                  >
                    <span className="song-list__title-row">
                      <span className="song-list__title">{song.title}</span>
                      <span
                        className={
                          song.status === 'published'
                            ? 'song-status song-status--published'
                            : 'song-status'
                        }
                      >
                        {song.status}
                      </span>
                    </span>
                    <span className="song-list__meta">
                      {song.artist || 'Unknown artist'}
                      <span className="song-list__key">
                        {' '}
                        · {song.originalKey}
                      </span>
                    </span>
                  </Link>
                  <div className="song-list__icon-actions">
                    <Link
                      to="/songs/$username/$slug/edit"
                      params={{ username: song.username, slug: song.slug }}
                      className="icon-btn icon-btn--edit"
                      aria-label={`Edit ${song.title}`}
                      title="Edit"
                    >
                      <IconEdit />
                    </Link>
                    <BusyButton
                      type="button"
                      className="icon-btn"
                      iconOnly
                      busy={busyKey === `export:${song.id}`}
                      busyLabel="Exporting"
                      disabled={rowBusy}
                      aria-label={`Export ${song.title}`}
                      title="Export ChordPro"
                      onClick={() => void onExport(song)}
                    >
                      <IconExport />
                    </BusyButton>
                    <BusyButton
                      type="button"
                      className="icon-btn icon-btn--danger"
                      iconOnly
                      busy={busyKey === `delete:${song.id}`}
                      busyLabel="Deleting"
                      disabled={rowBusy}
                      aria-label={`Delete ${song.title}`}
                      title="Delete"
                      onClick={() => void onDelete(song)}
                    >
                      <IconTrash />
                    </BusyButton>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
