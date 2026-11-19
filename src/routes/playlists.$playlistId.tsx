import {
  Link,
  createFileRoute,
  notFound,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { BusyButton, SongListSkeleton, Spinner } from '#/components/loading'
import { songCountLabel } from '#/components/PlaylistCard'
import { SortableSongList } from '#/components/SortableSongList'
import { APP_NAME } from '#/lib/brand'
import {
  PLAYLIST_DESCRIPTION_MAX,
  PLAYLIST_NAME_MAX,
  addSongToPlaylist,
  deletePlaylist,
  matchesSongSearch,
  removeSongFromPlaylist,
  reorderPlaylistSongs,
  updatePlaylist,
  type PlaylistSong,
  type SongListItem,
} from '#/lib/songbook'
import {
  loadPlaylistClient,
  loadPublishedSongsClient,
} from '#/lib/songbook/song-client'
import { loadPlaylist } from '#/lib/songbook/song-server'
import { createClient } from '#/lib/supabase/client'

const REORDER_SAVE_DELAY_MS = 400
const SEARCH_RESULT_LIMIT = 25

export const Route = createFileRoute('/playlists/$playlistId')({
  loader: async ({ params }) => {
    // SSR / first load: server function. Client navigations: direct to Supabase.
    const result =
      typeof window === 'undefined'
        ? await loadPlaylist({ data: { playlistId: params.playlistId } })
        : await loadPlaylistClient(params.playlistId)
    if (result.kind === 'unauthenticated') throw redirect({ to: '/login' })
    if (result.kind === 'not_found') throw notFound()
    return { playlist: result.playlist }
  },
  pendingComponent: () => <SongListSkeleton variant="mine" />,
  component: PlaylistPage,
  notFoundComponent: PlaylistNotFound,
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.playlist.name} · ${APP_NAME}`
          : `Playlist · ${APP_NAME}`,
      },
    ],
  }),
})

type SaveState = 'idle' | 'saving' | 'saved'

function toPlaylistSong(song: SongListItem): PlaylistSong {
  return {
    songId: song.id,
    title: song.title,
    artist: song.artist,
    username: song.username,
    slug: song.slug,
    originalKey: song.originalKey,
    status: song.status,
  }
}

function PlaylistPage() {
  const { playlist } = Route.useLoaderData()
  const navigate = useNavigate()

  const [name, setName] = useState(playlist.name)
  const [description, setDescription] = useState(playlist.description)
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(playlist.name)
  const [draftDescription, setDraftDescription] = useState(
    playlist.description,
  )
  const [metaBusy, setMetaBusy] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const [songs, setSongs] = useState<PlaylistSong[]>(playlist.songs)
  const savedSongsRef = useRef<PlaylistSong[]>(playlist.songs)
  const saveTimerRef = useRef<number | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [busySongId, setBusySongId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(playlist.name)
    setDescription(playlist.description)
    setSongs(playlist.songs)
    savedSongsRef.current = playlist.songs
  }, [playlist])

  useEffect(
    () => () => {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current)
      }
    },
    [],
  )

  const songIds = useMemo(() => new Set(songs.map((s) => s.songId)), [songs])

  const onReorder = (next: PlaylistSong[]) => {
    setSongs(next)
    setError(null)
    setSaveState('saving')
    if (saveTimerRef.current != null) {
      window.clearTimeout(saveTimerRef.current)
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null
      void (async () => {
        try {
          const result = await reorderPlaylistSongs(
            createClient(),
            playlist.id,
            next.map((s) => s.songId),
          )
          if (result.error) throw new Error(result.error.message)
          savedSongsRef.current = next
          setSaveState('saved')
        } catch (err) {
          setSongs(savedSongsRef.current)
          setSaveState('idle')
          setError(
            err instanceof Error
              ? `Could not save order: ${err.message}`
              : 'Could not save order',
          )
        }
      })()
    }, REORDER_SAVE_DELAY_MS)
  }

  const onRemove = async (song: PlaylistSong) => {
    setBusySongId(song.songId)
    setError(null)
    try {
      const result = await removeSongFromPlaylist(
        createClient(),
        playlist.id,
        song.songId,
      )
      if (result.error) {
        setError(result.error.message)
        return
      }
      setSongs((prev) => prev.filter((s) => s.songId !== song.songId))
      savedSongsRef.current = savedSongsRef.current.filter(
        (s) => s.songId !== song.songId,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove song')
    } finally {
      setBusySongId(null)
    }
  }

  const onAdd = async (song: SongListItem) => {
    setBusySongId(song.id)
    setError(null)
    try {
      const result = await addSongToPlaylist(
        createClient(),
        playlist.id,
        song.id,
      )
      if (result.error) {
        setError(result.error.message)
        return
      }
      const added = toPlaylistSong(song)
      setSongs((prev) =>
        prev.some((s) => s.songId === song.id) ? prev : [...prev, added],
      )
      savedSongsRef.current = [...savedSongsRef.current, added]
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add song')
    } finally {
      setBusySongId(null)
    }
  }

  const onSaveMeta = async (e: FormEvent) => {
    e.preventDefault()
    setMetaBusy(true)
    setError(null)
    try {
      const result = await updatePlaylist(createClient(), playlist.id, {
        name: draftName,
        description: draftDescription,
      })
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Could not save playlist')
        return
      }
      setName(result.data.name)
      setDescription(result.data.description)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save playlist')
    } finally {
      setMetaBusy(false)
    }
  }

  const onDelete = async () => {
    if (!window.confirm(`Delete playlist “${name}”? Songs are not deleted.`)) {
      return
    }
    setDeleteBusy(true)
    setError(null)
    try {
      const result = await deletePlaylist(createClient(), playlist.id)
      if (result.error) {
        setError(result.error.message)
        return
      }
      await navigate({ to: '/playlists' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete playlist')
    } finally {
      setDeleteBusy(false)
    }
  }

  const first = songs[0]

  return (
    <main className="song-index song-index--playlist">
      <Link to="/playlists" className="back-link playlist-page__back">
        ← All playlists
      </Link>

      {editing ? (
        <form
          className="playlist-form playlist-form--inline"
          onSubmit={(e) => void onSaveMeta(e)}
        >
          <label className="song-form__field">
            Name
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              maxLength={PLAYLIST_NAME_MAX}
              required
              autoFocus
            />
          </label>
          <label className="song-form__field">
            Description
            <textarea
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              maxLength={PLAYLIST_DESCRIPTION_MAX}
              rows={2}
            />
          </label>
          <div className="playlist-form__actions">
            <BusyButton
              type="submit"
              className="btn btn--primary"
              busy={metaBusy}
              busyLabel="Saving…"
              disabled={!draftName.trim()}
            >
              Save
            </BusyButton>
            <button
              type="button"
              className="btn"
              disabled={metaBusy}
              onClick={() => {
                setEditing(false)
                setDraftName(name)
                setDraftDescription(description)
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <header className="song-index__header">
          <div className="song-index__heading">
            <h1>{name}</h1>
            {description ? <p className="lede">{description}</p> : null}
            <p className="playlist-page__count">
              {songCountLabel(songs.length)}
            </p>
          </div>
          <div className="song-index__actions">
            {first ? (
              <Link
                to="/songs/$username/$slug"
                params={{ username: first.username, slug: first.slug }}
                search={{ playlist: playlist.id }}
                className="btn btn--primary"
              >
                ▶ Play
              </Link>
            ) : null}
            <button
              type="button"
              className="btn"
              onClick={() => {
                setDraftName(name)
                setDraftDescription(description)
                setEditing(true)
              }}
            >
              Edit details
            </button>
            <BusyButton
              type="button"
              className="btn playlist-page__delete"
              busy={deleteBusy}
              busyLabel="Deleting…"
              onClick={() => void onDelete()}
            >
              Delete
            </BusyButton>
          </div>
        </header>
      )}

      {error ? (
        <p className="song-form__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="playlist-page__layout">
        <section
          className="playlist-page__songs"
          aria-labelledby="playlist-songs-title"
        >
          <div className="playlist-page__section-head">
            <h2 id="playlist-songs-title">Songs</h2>
            <span className="playlist-page__save" role="status">
              {saveState === 'saving' ? (
                <>
                  <Spinner size="sm" label="" /> Saving…
                </>
              ) : saveState === 'saved' ? (
                'Order saved'
              ) : songs.length > 1 ? (
                'Drag ⠿ to reorder'
              ) : null}
            </span>
          </div>
          {songs.length === 0 ? (
            <p className="empty-state">
              No songs yet. Search below, or use “Add to playlist” on any song.
            </p>
          ) : (
            <SortableSongList
              playlistId={playlist.id}
              songs={songs}
              busySongId={busySongId}
              onReorder={onReorder}
              onRemove={(song) => void onRemove(song)}
            />
          )}
        </section>

        <SongSearchPanel
          songIds={songIds}
          busySongId={busySongId}
          onAdd={(song) => void onAdd(song)}
          onRemove={(song) => void onRemove(toPlaylistSong(song))}
        />
      </div>
    </main>
  )
}

function SongSearchPanel({
  songIds,
  busySongId,
  onAdd,
  onRemove,
}: {
  songIds: Set<string>
  busySongId: string | null
  onAdd: (song: SongListItem) => void
  onRemove: (song: SongListItem) => void
}) {
  const [query, setQuery] = useState('')
  const [catalog, setCatalog] = useState<SongListItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const loadStartedRef = useRef(false)

  const ensureCatalog = () => {
    if (loadStartedRef.current) return
    loadStartedRef.current = true
    setLoading(true)
    void loadPublishedSongsClient()
      .then(setCatalog)
      .finally(() => setLoading(false))
  }

  const trimmed = query.trim()
  const results = useMemo(() => {
    if (!catalog || !trimmed) return []
    return catalog
      .filter((song) => matchesSongSearch(song, trimmed))
      .slice(0, SEARCH_RESULT_LIMIT)
  }, [catalog, trimmed])

  return (
    <section
      className="playlist-page__search"
      aria-labelledby="playlist-search-title"
    >
      <h2 id="playlist-search-title">Add songs</h2>
      <label className="song-index__search">
        <span className="visually-hidden">Search songs to add</span>
        <input
          type="search"
          value={query}
          onFocus={ensureCatalog}
          onChange={(e) => {
            ensureCatalog()
            setQuery(e.target.value)
          }}
          placeholder="Search title, artist, or @username"
          autoComplete="off"
        />
      </label>

      {loading ? (
        <p className="playlist-search__hint">
          <Spinner size="sm" label="" /> Loading songs…
        </p>
      ) : !trimmed ? (
        <p className="playlist-search__hint">
          Type to find published songs.
        </p>
      ) : results.length === 0 ? (
        <p className="playlist-search__hint">No songs match “{trimmed}”.</p>
      ) : (
        <ul className="playlist-search__results">
          {results.map((song) => {
            const added = songIds.has(song.id)
            const busy = busySongId === song.id
            return (
              <li key={song.id} className="playlist-search__row">
                <span className="playlist-search__text">
                  <span className="song-list__title">{song.title}</span>
                  <span className="song-list__meta">
                    {song.artist || 'Unknown artist'}
                    <span className="song-list__author">
                      {' '}
                      · @{song.username}
                    </span>
                  </span>
                </span>
                <BusyButton
                  type="button"
                  className={
                    added
                      ? 'toolbar-btn is-active playlist-search__toggle'
                      : 'toolbar-btn playlist-search__toggle'
                  }
                  busy={busy}
                  busyLabel={added ? 'Removing…' : 'Adding…'}
                  disabled={busySongId != null && !busy}
                  aria-pressed={added}
                  aria-label={
                    added
                      ? `Remove ${song.title} from playlist`
                      : `Add ${song.title} to playlist`
                  }
                  onClick={() => (added ? onRemove(song) : onAdd(song))}
                >
                  {added ? '✓ Added' : '+ Add'}
                </BusyButton>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function PlaylistNotFound() {
  return (
    <main className="song-index">
      <header className="song-index__header">
        <div className="song-index__heading">
          <h1>Playlist not found</h1>
          <p className="lede">
            This playlist was deleted, or it belongs to another account.
          </p>
        </div>
      </header>
      <Link to="/playlists" className="back-link">
        Back to playlists
      </Link>
    </main>
  )
}
