import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { BusyButton, SongListSkeleton } from '#/components/loading'
import { PlaylistCard } from '#/components/PlaylistCard'
import { APP_NAME } from '#/lib/brand'
import {
  PLAYLIST_DESCRIPTION_MAX,
  PLAYLIST_NAME_MAX,
  createPlaylist,
} from '#/lib/songbook'
import { loadPlaylistsClient } from '#/lib/songbook/song-client'
import { loadPlaylists } from '#/lib/songbook/song-server'
import { createClient } from '#/lib/supabase/client'

export const Route = createFileRoute('/playlists/')({
  loader: async () => {
    // SSR / first load: server function. Client navigations: direct to Supabase.
    const data =
      typeof window === 'undefined'
        ? await loadPlaylists()
        : await loadPlaylistsClient()
    if (!data.userId) {
      throw redirect({ to: '/login' })
    }
    return { userId: data.userId, playlists: data.playlists }
  },
  pendingComponent: () => <SongListSkeleton variant="mine" />,
  component: PlaylistsPage,
  head: () => ({
    meta: [{ title: `Playlists · ${APP_NAME}` }],
  }),
})

function PlaylistsPage() {
  const { userId, playlists } = Route.useLoaderData()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onCreate = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await createPlaylist(createClient(), userId, {
        name,
        description,
      })
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Could not create playlist')
        return
      }
      await navigate({
        to: '/playlists/$playlistId',
        params: { playlistId: result.data.id },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create playlist')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="song-index song-index--playlists">
      <header className="song-index__header">
        <div className="song-index__heading">
          <h1>Playlists</h1>
          <p className="lede">
            Line up songs for a service or rehearsal, then flip between them
            from the viewer sidebar.
          </p>
        </div>
        {!creating ? (
          <div className="song-index__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setCreating(true)}
            >
              New playlist
            </button>
          </div>
        ) : null}
      </header>

      {creating ? (
        <form className="playlist-form" onSubmit={(e) => void onCreate(e)}>
          <label className="song-form__field">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={PLAYLIST_NAME_MAX}
              placeholder="Sunday service"
              required
              autoFocus
            />
          </label>
          <label className="song-form__field">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={PLAYLIST_DESCRIPTION_MAX}
              rows={2}
              placeholder="Optional"
            />
          </label>
          {error ? (
            <p className="song-form__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="playlist-form__actions">
            <BusyButton
              type="submit"
              className="btn btn--primary"
              busy={busy}
              busyLabel="Creating…"
              disabled={!name.trim()}
            >
              Create playlist
            </BusyButton>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => {
                setCreating(false)
                setError(null)
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {playlists.length === 0 ? (
        <p className="empty-state">
          No playlists yet. Create one, then add songs from search, the song
          viewer, or any song list.
        </p>
      ) : (
        <ul className="playlist-grid">
          {playlists.map((playlist) => (
            <li key={playlist.id}>
              <PlaylistCard playlist={playlist} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
