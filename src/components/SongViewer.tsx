import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addFavorite,
  clampTextScale,
  collectChords,
  linesPerPageForHeight,
  loadResolvedViewerPrefs,
  loadSwipeDirection,
  loadTextScale,
  loadViewerColors,
  saveSwipeDirection,
  saveTextScale,
  saveViewerColors,
  sheetColorStyle,
  tidyBlocks,
  updateUserSettings,
  upsertSongSettings,
  SWIPE_DIRECTION_DEFAULT,
  TEXT_SCALE_DEFAULT,
  getPlaylistWithSongs,
  listFavorites,
  paginateBlocks,
  removeFavorite,
  sheetColumnCount,
  transposeParsedSong,
  type ChartInstrument,
  type ParsedSong,
  type PlaylistDetail,
  type PlaylistFavorite,
  type SheetColors,
  type SongStatus,
  type SwipeDirection,
  type UserSettingsRow,
  type ViewMode,
} from '#/lib/songbook'
import { useFullscreen } from '#/lib/fullscreen'
import { createClient } from '#/lib/supabase/client'
import { AddToPlaylistButton } from './AddToPlaylistButton'
import { ChordChartsStrip } from './ChordChartsStrip'
import { FullscreenExitButton } from './FullscreenControls'
import {
  PlaylistSidebar,
  useCoarsePointer,
  type SidebarSong,
} from './PlaylistSidebar'
import { SongSheet } from './SongSheet'
import { ViewerToolbar } from './ViewerToolbar'

type Props = {
  title: string
  artist: string
  originalKey: string
  parsed: ParsedSong
  /** When set with userId, enables favorites sidebar + (if published) star control. */
  songId?: string
  songStatus?: SongStatus
  userId?: string | null
  /** When set, the sidebar shows this playlist instead of favorites. */
  playlistId?: string | null
}

export function SongViewer({
  title,
  artist,
  originalKey,
  parsed,
  songId,
  songStatus,
  userId = null,
  playlistId = null,
}: Props) {
  const fullscreen = useFullscreen()
  const [currentKey, setCurrentKey] = useState(parsed.key || originalKey)
  const [mode, setMode] = useState<ViewMode>('chords')
  const [charts, setCharts] = useState<ChartInstrument>('off')
  const [page, setPage] = useState(0)
  const [textScale, setTextScale] = useState(TEXT_SCALE_DEFAULT)
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>(
    SWIPE_DIRECTION_DEFAULT,
  )
  const [colorOverride, setColorOverride] = useState<SheetColors>({})
  const [scrollerSize, setScrollerSize] = useState({ width: 390, height: 560 })
  const scrollerRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef(0)
  const swipeDirectionRef = useRef(swipeDirection)
  const ignoreScrollRef = useRef(false)
  const ignoreScrollTimer = useRef<number | null>(null)
  const verticalSwipe = swipeDirection === 'vertical'
  swipeDirectionRef.current = swipeDirection

  const showPlaylist = Boolean(userId && songId)
  const canFavorite = Boolean(
    showPlaylist && songStatus === 'published',
  )
  const coarsePointer = useCoarsePointer()
  const [openSidebar, setOpenSidebar] = useState<
    'favorites' | 'playlist' | null
  >(null)
  const [favorites, setFavorites] = useState<PlaylistFavorite[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(showPlaylist)
  const [favoriteBusy, setFavoriteBusy] = useState(false)
  const [favoriteError, setFavoriteError] = useState<string | null>(null)
  const [prefsError, setPrefsError] = useState<string | null>(null)
  const [userSettings, setUserSettings] = useState<UserSettingsRow | null>(null)
  const userSettingsRef = useRef<UserSettingsRow | null>(null)

  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null)
  const [playlistLoading, setPlaylistLoading] = useState(
    Boolean(userId && playlistId),
  )
  const [playlistNotice, setPlaylistNotice] = useState<string | null>(null)
  const [playlistReload, setPlaylistReload] = useState(0)

  const isFavorited = Boolean(
    songId && favorites.some((f) => f.songId === songId),
  )

  pageRef.current = page
  userSettingsRef.current = userSettings

  useEffect(() => {
    if (!userId || !songId) {
      setFavorites([])
      setFavoritesLoading(false)
      return
    }

    let cancelled = false
    setFavoritesLoading(true)
    setFavoriteError(null)

    void (async () => {
      try {
        const supabase = createClient()
        const rows = await listFavorites(supabase, userId)
        if (!cancelled) setFavorites(rows)
      } catch (err) {
        if (!cancelled) {
          setFavoriteError(
            err instanceof Error ? err.message : 'Could not load favorites',
          )
          setFavorites([])
        }
      } finally {
        if (!cancelled) setFavoritesLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userId, songId])

  useEffect(() => {
    if (!userId || !playlistId) {
      setPlaylist(null)
      setPlaylistLoading(false)
      setPlaylistNotice(null)
      return
    }

    let cancelled = false
    setPlaylistLoading(true)

    void (async () => {
      try {
        const row = await getPlaylistWithSongs(createClient(), playlistId)
        if (cancelled) return
        setPlaylist(row)
        setPlaylistNotice(
          row ? null : 'That playlist is unavailable — showing favorites.',
        )
      } catch {
        if (!cancelled) {
          setPlaylist(null)
          setPlaylistNotice('Could not load playlist — showing favorites.')
        }
      } finally {
        if (!cancelled) setPlaylistLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userId, playlistId, playlistReload])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const update = () => {
      setScrollerSize({ width: el.clientWidth, height: el.clientHeight })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Colors stay local. Swipe/text: guests use localStorage; signed-in users
  // load from Supabase (global or per-song when enabled).
  useEffect(() => {
    setColorOverride(loadViewerColors())
  }, [])

  useEffect(() => {
    let cancelled = false
    setPrefsError(null)

    if (!userId) {
      setUserSettings(null)
      setTextScale(loadTextScale())
      setSwipeDirection(loadSwipeDirection())
      return
    }

    void (async () => {
      try {
        const supabase = createClient()
        const resolved = await loadResolvedViewerPrefs(supabase, userId, songId)
        if (cancelled) return
        setUserSettings(resolved.global)
        setTextScale(resolved.effective.textScale)
        setSwipeDirection(resolved.effective.swipeDirection)
      } catch (err) {
        if (cancelled) return
        setPrefsError(
          err instanceof Error ? err.message : 'Could not load viewer settings',
        )
        setTextScale(loadTextScale())
        setSwipeDirection(loadSwipeDirection())
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userId, songId])

  const persistViewerPref = async (patch: {
    textScale?: number
    swipeDirection?: SwipeDirection
  }) => {
    if (!userId) {
      if (patch.textScale != null) saveTextScale(patch.textScale)
      if (patch.swipeDirection != null) saveSwipeDirection(patch.swipeDirection)
      return
    }

    const settings = userSettingsRef.current
    const rememberPerSong = settings?.rememberPerSong ?? false
    setPrefsError(null)

    try {
      const supabase = createClient()
      if (rememberPerSong && songId) {
        const result = await upsertSongSettings(supabase, userId, songId, patch)
        if (result.error) {
          setPrefsError(result.error.message)
        }
        return
      }

      const result = await updateUserSettings(supabase, userId, patch)
      if (result.error) {
        setPrefsError(result.error.message)
        return
      }
      if (result.data) setUserSettings(result.data)
    } catch (err) {
      setPrefsError(
        err instanceof Error ? err.message : 'Could not save viewer settings',
      )
    }
  }

  const onTextScaleChange = (next: number) => {
    const clamped = clampTextScale(next)
    setTextScale(clamped)
    goToPage(0, 'instant')
    void persistViewerPref({ textScale: clamped })
  }

  const onSwipeDirectionChange = (next: SwipeDirection) => {
    if (next === swipeDirection) return
    setSwipeDirection(next)
    void persistViewerPref({ swipeDirection: next })
  }

  const updateColorOverride = (next: SheetColors) => {
    setColorOverride(next)
    saveViewerColors(next)
  }

  const authorColors: SheetColors = {
    chord: parsed.chordColor,
    label: parsed.labelColor,
  }
  const effectiveColors: SheetColors = {
    chord: colorOverride.chord ?? authorColors.chord,
    label: colorOverride.label ?? authorColors.label,
  }

  const transposed = useMemo(() => {
    const song = transposeParsedSong(parsed, currentKey)
    return { ...song, blocks: tidyBlocks(song.blocks) }
  }, [parsed, currentKey])

  const columns = useMemo(
    () => sheetColumnCount(scrollerSize.width),
    [scrollerSize.width],
  )

  const pageBudget = useMemo(
    () =>
      linesPerPageForHeight({
        scrollerHeightPx: scrollerSize.height,
        scrollerWidthPx: scrollerSize.width,
        mode,
        columns,
        fontScale: textScale,
      }),
    [scrollerSize.height, scrollerSize.width, mode, columns, textScale],
  )

  const pages = useMemo(
    () => paginateBlocks(transposed.blocks, pageBudget),
    [transposed.blocks, pageBudget],
  )

  const clearIgnoreScroll = () => {
    if (ignoreScrollTimer.current != null) {
      window.clearTimeout(ignoreScrollTimer.current)
      ignoreScrollTimer.current = null
    }
    ignoreScrollRef.current = false
  }

  const goToPage = (
    nextPage: number,
    behavior: ScrollBehavior = 'smooth',
  ) => {
    const el = scrollerRef.current
    const clamped = Math.max(0, Math.min(nextPage, Math.max(0, pages.length - 1)))
    pageRef.current = clamped
    setPage(clamped)
    if (!el) return

    const vertical = swipeDirectionRef.current === 'vertical'
    const pageSize = vertical ? el.clientHeight : el.clientWidth
    const current = vertical ? el.scrollTop : el.scrollLeft
    const target = clamped * pageSize
    if (Math.abs(current - target) < 1) return

    ignoreScrollRef.current = true
    if (ignoreScrollTimer.current != null) {
      window.clearTimeout(ignoreScrollTimer.current)
    }
    el.scrollTo(
      vertical
        ? { top: target, left: 0, behavior }
        : { left: target, top: 0, behavior },
    )

    const release = () => {
      // Snap final position without another smooth animation
      const pos = vertical ? el.scrollTop : el.scrollLeft
      if (Math.abs(pos - target) > 0.5) {
        el.scrollTo(
          vertical
            ? { top: target, left: 0, behavior: 'instant' }
            : { left: target, top: 0, behavior: 'instant' },
        )
      }
      clearIgnoreScroll()
      el.removeEventListener('scrollend', release)
    }
    el.addEventListener('scrollend', release, { once: true })
    ignoreScrollTimer.current = window.setTimeout(
      release,
      behavior === 'smooth' ? 450 : 32,
    )
  }

  useEffect(() => {
    setPage((p) => {
      const next = Math.min(p, Math.max(0, pages.length - 1))
      pageRef.current = next
      return next
    })
  }, [pages.length])

  // Only correct scroll when page count/layout/direction changes — never after swipe settle
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const pageSize = verticalSwipe ? el.clientHeight : el.clientWidth
    const target = pageRef.current * pageSize
    ignoreScrollRef.current = true
    // Zero the unused axis so a direction switch doesn't leave residual scroll.
    el.scrollTo(
      verticalSwipe
        ? { top: target, left: 0, behavior: 'instant' }
        : { left: target, top: 0, behavior: 'instant' },
    )
    ignoreScrollTimer.current = window.setTimeout(clearIgnoreScroll, 32)
  }, [pages.length, scrollerSize.width, scrollerSize.height, verticalSwipe])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const onScroll = () => {
      if (ignoreScrollRef.current) return
      const vertical = swipeDirectionRef.current === 'vertical'
      const pageSize = (vertical ? el.clientHeight : el.clientWidth) || 1
      const offset = vertical ? el.scrollTop : el.scrollLeft
      const next = Math.round(offset / pageSize)
      if (next === pageRef.current) return
      pageRef.current = next
      setPage(next)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      clearIgnoreScroll()
    }
  }, [])

  const pageChords = useMemo(() => {
    const block = pages[page] ?? []
    return collectChords(block)
  }, [pages, page])

  const onPrint = () => {
    window.print()
  }

  const onToggleFavorite = async () => {
    if (!userId || !songId || !canFavorite || favoriteBusy) return
    setFavoriteBusy(true)
    setFavoriteError(null)
    try {
      const supabase = createClient()
      if (isFavorited) {
        const result = await removeFavorite(supabase, userId, songId)
        if (result.error) {
          setFavoriteError(result.error.message)
          return
        }
        setFavorites((prev) => prev.filter((f) => f.songId !== songId))
      } else {
        const result = await addFavorite(supabase, userId, songId)
        if (result.error) {
          setFavoriteError(result.error.message)
          return
        }
        if (result.data) {
          const added = result.data
          setFavorites((prev) => [...prev, added])
        }
      }
    } catch (err) {
      setFavoriteError(
        err instanceof Error ? err.message : 'Favorite update failed',
      )
    } finally {
      setFavoriteBusy(false)
    }
  }

  const hasPrev = page > 0
  const hasNext = page < pages.length - 1

  // Playlist rail is shown while a requested playlist loads; fall back to
  // favorites-only once it is known to be unavailable.
  const usePlaylistSidebar = Boolean(
    playlistId && (playlist || playlistLoading),
  )
  const favoriteItems: SidebarSong[] = favorites.map((f) => ({
    key: f.id,
    songId: f.songId,
    title: f.title,
    artist: f.artist,
    username: f.username,
    slug: f.slug,
  }))
  const playlistItems: SidebarSong[] = (playlist?.songs ?? []).map((s) => ({
    key: s.songId,
    songId: s.songId,
    title: s.title,
    artist: s.artist,
    username: s.username,
    slug: s.slug,
  }))
  const playlistTitle = playlist?.name ?? 'Playlist'
  const stackedPeeks = usePlaylistSidebar
  const toggleSidebar = (which: 'favorites' | 'playlist') => {
    setOpenSidebar((current) => (current === which ? null : which))
  }

  useEffect(() => {
    if (!usePlaylistSidebar && openSidebar === 'playlist') {
      setOpenSidebar(null)
    }
  }, [usePlaylistSidebar, openSidebar])

  return (
    <div
      className="song-viewer"
      data-fullscreen={fullscreen || undefined}
      style={sheetColorStyle(effectiveColors)}
    >
      {fullscreen ? <FullscreenExitButton /> : null}
      {showPlaylist && songId ? (
        <PlaylistSidebar
          title="Favorites"
          items={favoriteItems}
          emptyText="No favorites yet. Add a published song with the star control."
          peekIcon="★"
          peekStack={stackedPeeks ? 'above' : 'solo'}
          panelId="playlist-sidebar-panel-favorites"
          currentSongId={songId}
          open={openSidebar === 'favorites'}
          onOpenChange={(open) =>
            setOpenSidebar(open ? 'favorites' : null)
          }
          coarsePointer={coarsePointer}
          loading={favoritesLoading}
        />
      ) : null}
      {showPlaylist && songId && usePlaylistSidebar ? (
        <PlaylistSidebar
          title={playlistTitle}
          items={playlistItems}
          emptyText="This playlist has no songs yet."
          peekIcon="≡"
          peekStack="below"
          panelId="playlist-sidebar-panel-playlist"
          playlistId={playlistId}
          manageLink={
            playlistId
              ? { playlistId, label: 'Edit playlist' }
              : undefined
          }
          currentSongId={songId}
          open={openSidebar === 'playlist'}
          onOpenChange={(open) =>
            setOpenSidebar(open ? 'playlist' : null)
          }
          coarsePointer={coarsePointer}
          loading={playlistLoading}
        />
      ) : null}

      <ViewerToolbar
        title={title}
        artist={artist}
        currentKey={currentKey}
        originalKey={originalKey}
        mode={mode}
        charts={charts}
        page={page}
        pageCount={pages.length}
        textScale={textScale}
        onTextScaleChange={onTextScaleChange}
        colors={{
          author: authorColors,
          override: colorOverride,
          onChange: (field, hex) =>
            updateColorOverride({ ...colorOverride, [field]: hex }),
          onReset: (field) =>
            updateColorOverride({ ...colorOverride, [field]: undefined }),
          onResetAll: () => updateColorOverride({}),
        }}
        onKeyChange={(k) => {
          setCurrentKey(k)
          goToPage(0, 'instant')
        }}
        onModeChange={setMode}
        onChartsChange={setCharts}
        swipeDirection={swipeDirection}
        onSwipeDirectionChange={onSwipeDirectionChange}
        onPageChange={(p) => goToPage(p, 'smooth')}
        onPrint={onPrint}
        favorites={
          showPlaylist
            ? {
                canFavorite,
                isFavorited,
                busy: favoriteBusy,
                onToggleFavorite: () => void onToggleFavorite(),
                showFavoritesToggle: coarsePointer,
                favoritesOpen: openSidebar === 'favorites',
                onToggleFavorites: () => toggleSidebar('favorites'),
                showPlaylistToggle: coarsePointer && usePlaylistSidebar,
                playlistToggleLabel: playlistTitle,
                playlistOpen: openSidebar === 'playlist',
                onTogglePlaylist: () => toggleSidebar('playlist'),
              }
            : undefined
        }
        addToPlaylist={
          userId && songId ? (
            <AddToPlaylistButton
              userId={userId}
              songId={songId}
              songTitle={title}
              variant="toolbar"
              onChange={(changedId) => {
                if (changedId === playlistId) {
                  setPlaylistReload((n) => n + 1)
                }
              }}
            />
          ) : null
        }
        backTo={
          usePlaylistSidebar && playlistId
            ? { playlistId, label: playlist?.name ?? 'Playlist' }
            : undefined
        }
      />

      {playlistNotice ? (
        <p className="playlist-error no-print" role="status">
          {playlistNotice}
        </p>
      ) : null}

      {favoriteError ? (
        <p className="playlist-error no-print" role="status">
          {favoriteError}
        </p>
      ) : null}

      {prefsError ? (
        <p className="playlist-error no-print" role="status">
          {prefsError}
        </p>
      ) : null}

      <ChordChartsStrip chords={pageChords} instrument={charts} />

      <div
        className={[
          'page-stage',
          verticalSwipe ? 'page-stage--vertical' : '',
          hasPrev ? 'has-prev' : '',
          hasNext ? 'has-next' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div
          ref={scrollerRef}
          className={
            verticalSwipe ? 'page-scroller page-scroller--vertical' : 'page-scroller'
          }
          aria-label="Song pages"
          style={{ ['--sheet-scale' as string]: String(textScale) }}
        >
          {pages.map((blocks, i) => (
            <section
              key={i}
              className={
                i === 0 ? 'song-page' : 'song-page song-page--continued'
              }
              aria-label={`Page ${i + 1} of ${pages.length}`}
            >
              <div
                className={
                  columns === 2
                    ? 'song-page__inner print-page song-page__inner--columns'
                    : 'song-page__inner print-page'
                }
              >
                {i === 0 && (
                  <div className="print-only print-header">
                    <h1>{title}</h1>
                    <p>
                      {artist} · Key: {currentKey}
                    </p>
                  </div>
                )}
                <SongSheet blocks={blocks} mode={mode} columns={columns} />
              </div>
            </section>
          ))}
        </div>
        <div
          className={
            hasPrev
              ? 'page-edge page-edge--prev is-visible'
              : 'page-edge page-edge--prev'
          }
          aria-hidden="true"
        />
        <div
          className={
            hasNext
              ? 'page-edge page-edge--next is-visible'
              : 'page-edge page-edge--next'
          }
          aria-hidden="true"
        />
      </div>

      {/* Full song for print (all pages stacked) */}
      <div className="print-only print-full-song" aria-hidden="true">
        <div className="print-header">
          <h1>{title}</h1>
          <p>
            {artist} · Key: {currentKey}
          </p>
        </div>
        {charts !== 'off' && (
          <ChordChartsStrip
            chords={collectChords(transposed.blocks)}
            instrument={charts}
          />
        )}
        <SongSheet blocks={transposed.blocks} mode={mode} columns={2} />
      </div>
    </div>
  )
}
