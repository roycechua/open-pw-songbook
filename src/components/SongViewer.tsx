import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  addFavorite,
  clampTextScale,
  collectChords,
  fitScaleForOverflow,
  loadFitToPage,
  loadKeepSections,
  loadLayoutDensity,
  loadResolvedViewerPrefs,
  loadSheetColumnsPref,
  loadSwipeDirection,
  loadTextScale,
  loadViewerColors,
  packMeasuredBlocks,
  resolveSheetColumns,
  saveFitToPage,
  saveKeepSections,
  saveLayoutDensity,
  saveSheetColumnsPref,
  saveSwipeDirection,
  saveTextScale,
  saveViewerColors,
  sheetColorStyle,
  tidyBlocks,
  trimLeadingEmptyBlocks,
  updateUserSettings,
  upsertSongSettings,
  FIT_TO_PAGE_DEFAULT,
  KEEP_SECTIONS_DEFAULT,
  LAYOUT_DENSITY_DEFAULT,
  SHEET_COLUMNS_DEFAULT,
  SWIPE_DIRECTION_DEFAULT,
  TEXT_SCALE_DEFAULT,
  getPlaylistWithSongs,
  listFavorites,
  removeFavorite,
  transposeParsedSong,
  type ChartInstrument,
  type LayoutDensity,
  type ParsedBlock,
  type ParsedSong,
  type PlaylistDetail,
  type PlaylistFavorite,
  type SheetColors,
  type SheetColumnsPref,
  type SongStatus,
  type SwipeDirection,
  type UserSettingsPatch,
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
  const [layoutDensity, setLayoutDensity] = useState<LayoutDensity>(
    LAYOUT_DENSITY_DEFAULT,
  )
  const [sheetColumns, setSheetColumns] = useState<SheetColumnsPref>(
    SHEET_COLUMNS_DEFAULT,
  )
  const [keepSections, setKeepSections] = useState(KEEP_SECTIONS_DEFAULT)
  const [fitToPage, setFitToPage] = useState(FIT_TO_PAGE_DEFAULT)
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>(
    SWIPE_DIRECTION_DEFAULT,
  )
  const [colorOverride, setColorOverride] = useState<SheetColors>({})
  const [scrollerSize, setScrollerSize] = useState({ width: 390, height: 560 })
  const [measured, setMeasured] = useState<MeasuredLayout | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const probeRef = useRef<HTMLDivElement>(null)
  const layoutSigRef = useRef('')
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

  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const update = () => {
      const width = el.clientWidth
      const height = el.clientHeight
      setScrollerSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      )
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
      setLayoutDensity(loadLayoutDensity())
      setSheetColumns(loadSheetColumnsPref())
      setKeepSections(loadKeepSections())
      setFitToPage(loadFitToPage())
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
        setLayoutDensity(resolved.effective.layoutDensity)
        setSheetColumns(resolved.effective.sheetColumns)
        setKeepSections(resolved.effective.keepSections)
        setFitToPage(resolved.effective.fitToPage)
      } catch (err) {
        if (cancelled) return
        setPrefsError(
          err instanceof Error ? err.message : 'Could not load viewer settings',
        )
        setTextScale(loadTextScale())
        setSwipeDirection(loadSwipeDirection())
        setLayoutDensity(loadLayoutDensity())
        setSheetColumns(loadSheetColumnsPref())
        setKeepSections(loadKeepSections())
        setFitToPage(loadFitToPage())
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

  const persistLayoutPref = async (
    patch: Pick<
      UserSettingsPatch,
      'layoutDensity' | 'sheetColumns' | 'keepSections' | 'fitToPage'
    >,
  ) => {
    if (patch.layoutDensity != null) saveLayoutDensity(patch.layoutDensity)
    if (patch.sheetColumns != null) saveSheetColumnsPref(patch.sheetColumns)
    if (patch.keepSections != null) saveKeepSections(patch.keepSections)
    if (patch.fitToPage != null) saveFitToPage(patch.fitToPage)
    if (!userId) return

    setPrefsError(null)
    try {
      const supabase = createClient()
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

  const prepared = useMemo(
    () => trimLeadingEmptyBlocks(transposed.blocks),
    [transposed.blocks],
  )

  const columns = resolveSheetColumns(sheetColumns, scrollerSize.width)
  const displayScale = measured?.scale ?? textScale

  const pages = useMemo(() => {
    const source = measured?.pages
    if (!source) return [[prepared]]
    return source.map((page) =>
      page.map((column) =>
        column
          .map((index) => prepared[index])
          .filter((block): block is ParsedBlock => block != null),
      ),
    )
  }, [measured, prepared])

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    const probe = probeRef.current
    if (!scroller || !probe) return

    const width = scroller.clientWidth
    const height = scroller.clientHeight
    setScrollerSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    )

    const desired = resolveSheetColumns(sheetColumns, width)
    const rendered = Number(scroller.dataset.columns)
    if (rendered !== desired) return

    let cancelled = false
    const run = () => {
      if (cancelled) return
      const next = measureSheetLayout({
        scroller,
        probe,
        blocks: prepared,
        columns: desired,
        textScale,
        keepSectionsTogether: keepSections,
        fitToPage,
      })
      if (!next) return
      const sig = layoutSignature(next)
      if (layoutSigRef.current === sig) return
      layoutSigRef.current = sig
      setMeasured(next)
    }

    run()
    const fonts = document.fonts
    if (fonts && fonts.status !== 'loaded') {
      void fonts.ready.then(() => {
        if (!cancelled) run()
      })
    }

    return () => {
      cancelled = true
    }
  }, [
    prepared,
    mode,
    layoutDensity,
    sheetColumns,
    keepSections,
    fitToPage,
    textScale,
    scrollerSize.width,
    scrollerSize.height,
  ])

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

  const onLayoutDensityChange = (next: LayoutDensity) => {
    if (next === layoutDensity) return
    setLayoutDensity(next)
    goToPage(0, 'instant')
    void persistLayoutPref({ layoutDensity: next })
  }

  const onSheetColumnsChange = (next: SheetColumnsPref) => {
    if (next === sheetColumns) return
    setSheetColumns(next)
    goToPage(0, 'instant')
    void persistLayoutPref({ sheetColumns: next })
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
    const columnsOnPage = pages[page] ?? []
    return collectChords(columnsOnPage.flat())
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
      style={{
        ...sheetColorStyle(effectiveColors),
        ['--sheet-scale' as string]: String(textScale),
      }}
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
        layoutDensity={layoutDensity}
        sheetColumns={sheetColumns}
        onTextScaleChange={onTextScaleChange}
        onLayoutDensityChange={onLayoutDensityChange}
        onSheetColumnsChange={onSheetColumnsChange}
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
        style={{ ['--sheet-scale' as string]: String(displayScale) }}
      >
        <div
          ref={scrollerRef}
          className={
            verticalSwipe ? 'page-scroller page-scroller--vertical' : 'page-scroller'
          }
          data-columns={columns}
          aria-label="Song pages"
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
                <div
                  className={
                    columns === 2
                      ? 'song-columns song-columns--two'
                      : 'song-columns'
                  }
                >
                  {blocks.map((column, ci) => (
                    <div key={ci} className="song-column">
                      <SongSheet
                        blocks={column}
                        mode={mode}
                        density={layoutDensity}
                        prepared
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
        <div ref={probeRef} className="song-sheet-probe" aria-hidden="true">
          <SongSheet
            blocks={prepared}
            mode={mode}
            density={layoutDensity}
            prepared
          />
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
        <SongSheet
          blocks={prepared}
          mode={mode}
          columns={2}
          density={layoutDensity}
          prepared
        />
      </div>
    </div>
  )
}

type MeasuredLayout = {
  pages: number[][][]
  columns: 1 | 2
  scale: number
}

function cssLengthToPx(raw: string, el: HTMLElement): number {
  const value = raw.trim()
  if (!value) return 0
  if (value.endsWith('px')) return parseFloat(value) || 0
  if (value.endsWith('rem')) {
    const rem =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    return (parseFloat(value) || 0) * rem
  }
  if (value.endsWith('em')) {
    const em = parseFloat(getComputedStyle(el).fontSize) || 16
    return (parseFloat(value) || 0) * em
  }
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

function readBlockHeights(root: HTMLElement, count: number): number[] {
  const heights = new Array<number>(count).fill(0)
  const ordered = [...root.querySelectorAll<HTMLElement>('[data-block-index]')]
    .map((node) => {
      const index = Number(node.dataset.blockIndex)
      const rect = node.getBoundingClientRect()
      const marginBottom = parseFloat(getComputedStyle(node).marginBottom) || 0
      return { index, top: rect.top, height: rect.height, marginBottom }
    })
    .filter(
      (node) =>
        Number.isInteger(node.index) &&
        node.index >= 0 &&
        node.index < count,
    )
    .sort((a, b) => a.index - b.index)

  for (let i = 0; i < ordered.length; i += 1) {
    const current = ordered[i]!
    const next = ordered[i + 1]
    heights[current.index] = next
      ? Math.max(0, next.top - current.top)
      : current.height + current.marginBottom
  }
  return heights
}

function layoutSignature(layout: MeasuredLayout): string {
  const body = layout.pages
    .map((page) => page.map((column) => column.join('.')).join('|'))
    .join('/')
  return `${layout.columns}:${layout.scale}:${body}`
}

function measureBlockHeights(
  probe: HTMLElement,
  scale: number,
  width: number,
  count: number,
): number[] {
  probe.style.width = `${Math.round(width)}px`
  probe.style.setProperty('--sheet-scale', String(scale))
  void probe.offsetHeight
  return readBlockHeights(probe, count)
}

function measureSheetLayout(input: {
  scroller: HTMLElement
  probe: HTMLElement
  blocks: ParsedBlock[]
  columns: 1 | 2
  textScale: number
  keepSectionsTogether: boolean
  fitToPage: boolean
}): MeasuredLayout | null {
  const inner = input.scroller.querySelector<HTMLElement>('.song-page__inner')
  const columnEl = input.scroller.querySelector<HTMLElement>('.song-column')
  if (!inner || !columnEl) return null

  const colWidth = columnEl.clientWidth
  if (colWidth < 40) return null

  const style = getComputedStyle(inner)
  const padBottom = parseFloat(style.paddingBottom) || 0
  const continuedTop = cssLengthToPx(
    style.getPropertyValue('--inner-pad-continued'),
    inner,
  )
  // One pixel of slack so subpixel rounding does not clip the last line.
  const columnHeight = Math.floor(
    inner.clientHeight - continuedTop - padBottom - 1,
  )
  if (columnHeight < 40) return null

  const pack = (heights: number[]) =>
    packMeasuredBlocks(input.blocks, heights, {
      columnHeight,
      columns: input.columns,
      keepSectionsTogether: input.keepSectionsTogether,
    })

  const heights = measureBlockHeights(
    input.probe,
    input.textScale,
    colWidth,
    input.blocks.length,
  )
  let pages = pack(heights)
  let scale = input.textScale

  if (input.fitToPage && pages.length > 1) {
    const total = heights.reduce((sum, height) => sum + height, 0)
    const target = fitScaleForOverflow(
      input.textScale,
      total,
      columnHeight * input.columns,
    )
    if (target != null) {
      const fitted = pack(
        measureBlockHeights(
          input.probe,
          target,
          colWidth,
          input.blocks.length,
        ),
      )
      if (fitted.length <= 1) {
        pages = fitted
        scale = target
      }
    }
  }

  return { pages, columns: input.columns, scale }
}
