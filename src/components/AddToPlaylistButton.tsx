import { Link } from '@tanstack/react-router'
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { Spinner } from '#/components/loading'
import {
  PLAYLIST_NAME_MAX,
  addSongToPlaylist,
  createPlaylist,
  listPlaylistIdsContainingSong,
  listPlaylists,
  removeSongFromPlaylist,
  type PlaylistSummary,
} from '#/lib/songbook'
import { createClient } from '#/lib/supabase/client'

type Props = {
  userId: string
  songId: string
  songTitle: string
  /** `toolbar`: text button for the viewer; `icon`: compact list-row button. */
  variant?: 'toolbar' | 'icon'
  /** Called after the song is added to / removed from a playlist. */
  onChange?: (playlistId: string, contains: boolean) => void
}

const POPOVER_WIDTH = 288

export function AddToPlaylistButton({
  userId,
  songId,
  songTitle,
  variant = 'icon',
  onChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const [playlists, setPlaylists] = useState<PlaylistSummary[] | null>(null)
  const [containing, setContaining] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [position, setPosition] = useState<CSSProperties>({})
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const supabase = createClient()
        const [rows, ids] = await Promise.all([
          listPlaylists(supabase, userId),
          listPlaylistIdsContainingSong(supabase, userId, songId),
        ])
        if (cancelled) return
        setPlaylists(rows)
        setContaining(new Set(ids))
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Could not load playlists',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, userId, songId])

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      const left = Math.min(
        Math.max(8, rect.right - POPOVER_WIDTH),
        window.innerWidth - POPOVER_WIDTH - 8,
      )
      const spaceBelow = window.innerHeight - rect.bottom
      setPosition(
        spaceBelow < 260 && rect.top > spaceBelow
          ? { left, bottom: window.innerHeight - rect.top + 6 }
          : { left, top: rect.bottom + 6 },
      )
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (
        popoverRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return
      }
      close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const close = () => {
    setOpen(false)
    setCreating(false)
    setNewName('')
  }

  const onToggle = async (playlist: PlaylistSummary) => {
    const has = containing.has(playlist.id)
    setBusyId(playlist.id)
    setError(null)
    try {
      const supabase = createClient()
      const result = has
        ? await removeSongFromPlaylist(supabase, playlist.id, songId)
        : await addSongToPlaylist(supabase, playlist.id, songId)
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Could not update playlist')
        return
      }
      const count = result.data.length
      setContaining((prev) => {
        const next = new Set(prev)
        if (has) next.delete(playlist.id)
        else next.add(playlist.id)
        return next
      })
      setPlaylists((prev) =>
        prev?.map((p) =>
          p.id === playlist.id ? { ...p, songCount: count } : p,
        ) ?? prev,
      )
      onChange?.(playlist.id, !has)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update playlist')
    } finally {
      setBusyId(null)
    }
  }

  const onCreate = async (e: FormEvent) => {
    e.preventDefault()
    setBusyId('new')
    setError(null)
    try {
      const result = await createPlaylist(
        createClient(),
        userId,
        { name: newName, description: '' },
        [songId],
      )
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Could not create playlist')
        return
      }
      const created = result.data
      setPlaylists((prev) => [created, ...(prev ?? [])])
      setContaining((prev) => new Set(prev).add(created.id))
      setCreating(false)
      setNewName('')
      onChange?.(created.id, true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create playlist')
    } finally {
      setBusyId(null)
    }
  }

  const inAny = containing.size > 0

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={
          variant === 'toolbar'
            ? `toolbar-btn add-to-playlist__trigger${open ? ' is-active' : ''}`
            : `icon-btn add-to-playlist__trigger${open ? ' is-active' : ''}`
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Add ${songTitle} to a playlist`}
        title="Add to playlist"
        onClick={() => (open ? close() : setOpen(true))}
      >
        <PlaylistAddIcon />
        {variant === 'toolbar' ? <span>Playlist</span> : null}
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <>
            <div className="add-to-playlist-backdrop" aria-hidden="true" />
            <div
              ref={popoverRef}
              className="add-to-playlist"
              style={position}
              role="dialog"
              aria-labelledby={titleId}
            >
              <div className="add-to-playlist__header">
                <h3 id={titleId} className="add-to-playlist__title">
                  Add to playlist
                </h3>
                <button
                  type="button"
                  className="add-to-playlist__close"
                  onClick={close}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              {loading ? (
                <p className="add-to-playlist__hint">
                  <Spinner size="sm" label="" /> Loading playlists…
                </p>
              ) : (
                <ul className="add-to-playlist__list">
                  {(playlists ?? []).map((playlist) => {
                    const checked = containing.has(playlist.id)
                    const busy = busyId === playlist.id
                    return (
                      <li key={playlist.id}>
                        <button
                          type="button"
                          role="menuitemcheckbox"
                          aria-checked={checked}
                          className={
                            checked
                              ? 'add-to-playlist__row is-checked'
                              : 'add-to-playlist__row'
                          }
                          disabled={busyId != null}
                          onClick={() => void onToggle(playlist)}
                        >
                          <span
                            className="add-to-playlist__check"
                            aria-hidden="true"
                          >
                            {busy ? <Spinner size="sm" label="" /> : checked ? '✓' : ''}
                          </span>
                          <span className="add-to-playlist__name">
                            {playlist.name}
                          </span>
                          <span className="add-to-playlist__count">
                            {playlist.songCount}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                  {playlists?.length === 0 && !creating ? (
                    <li className="add-to-playlist__hint">
                      No playlists yet.
                    </li>
                  ) : null}
                </ul>
              )}
              {creating ? (
                <form
                  className="add-to-playlist__create"
                  onSubmit={(e) => void onCreate(e)}
                >
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    maxLength={PLAYLIST_NAME_MAX}
                    placeholder="Playlist name"
                    aria-label="New playlist name"
                    autoFocus
                    required
                  />
                  <button
                    type="submit"
                    className="toolbar-btn toolbar-btn--primary"
                    disabled={!newName.trim() || busyId != null}
                  >
                    {busyId === 'new' ? <Spinner size="sm" label="" /> : null}
                    Create
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className="add-to-playlist__new"
                  disabled={loading}
                  onClick={() => setCreating(true)}
                >
                  + New playlist…
                </button>
              )}
              {error ? (
                <p className="add-to-playlist__error" role="alert">
                  {error}
                </p>
              ) : null}
              <Link
                to="/playlists"
                className="add-to-playlist__manage"
                onClick={close}
              >
                Manage playlists
              </Link>
              <span className="visually-hidden" aria-live="polite">
                {inAny
                  ? `${songTitle} is in ${containing.size} ${
                      containing.size === 1 ? 'playlist' : 'playlists'
                    }`
                  : ''}
              </span>
            </div>
            </>,
            document.body,
          )
        : null}
    </>
  )
}

function PlaylistAddIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 6h12v2H3V6zm0 5h12v2H3v-2zm0 5h8v2H3v-2zm14-2V11h2v3h3v2h-3v3h-2v-3h-3v-2h3z"
      />
    </svg>
  )
}
