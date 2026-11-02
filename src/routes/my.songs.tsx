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
            New song
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
          <Link to="/songs/new">Create your first song</Link>.
        </p>
      ) : (
        <ul className="song-list">
          {songs.map((song) => (
            <li key={song.id} className="song-list__item">
              <Link
                to="/songs/$username/$slug"
                params={{ username: song.username, slug: song.slug }}
                className="song-list__link"
              >
                <span className="song-list__title">
                  {song.title}
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
              <div className="song-list__actions">
                <Link
                  to="/songs/$username/$slug/edit"
                  params={{ username: song.username, slug: song.slug }}
                  className="toolbar-btn"
                >
                  Edit
                </Link>
                <BusyButton
                  type="button"
                  className="toolbar-btn"
                  busy={busyKey === `export:${song.id}`}
                  busyLabel="Export"
                  disabled={busyKey?.endsWith(`:${song.id}`) ?? false}
                  onClick={() => void onExport(song)}
                >
                  Export
                </BusyButton>
                <BusyButton
                  type="button"
                  className="toolbar-btn"
                  busy={busyKey === `delete:${song.id}`}
                  busyLabel="Delete"
                  disabled={busyKey?.endsWith(`:${song.id}`) ?? false}
                  onClick={() => void onDelete(song)}
                >
                  Delete
                </BusyButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
