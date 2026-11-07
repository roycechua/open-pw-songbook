import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addFavorite,
  clampTextScale,
  collectChords,
  linesPerPageForHeight,
  loadTextScale,
  loadViewerColors,
  saveTextScale,
  saveViewerColors,
  sheetColorStyle,
  tidyBlocks,
  TEXT_SCALE_DEFAULT,
  listFavorites,
  paginateBlocks,
  removeFavorite,
  sheetColumnCount,
  transposeParsedSong,
  type ChartInstrument,
  type ParsedSong,
  type PlaylistFavorite,
  type SheetColors,
  type SongStatus,
  type ViewMode,
} from '#/lib/songbook'
import { createClient } from '#/lib/supabase/client'
import { ChordChartsStrip } from './ChordChartsStrip'
import {
  PlaylistSidebar,
  useCoarsePointer,
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
}

export function SongViewer({
  title,
  artist,
  originalKey,
  parsed,
  songId,
  songStatus,
  userId = null,
}: Props) {
  const [currentKey, setCurrentKey] = useState(parsed.key || originalKey)
  const [mode, setMode] = useState<ViewMode>('chords')
  const [charts, setCharts] = useState<ChartInstrument>('off')
  const [page, setPage] = useState(0)
  const [textScale, setTextScale] = useState(TEXT_SCALE_DEFAULT)
  const [colorOverride, setColorOverride] = useState<SheetColors>({})
  const [scrollerSize, setScrollerSize] = useState({ width: 390, height: 560 })
  const scrollerRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef(0)
  const ignoreScrollRef = useRef(false)
  const ignoreScrollTimer = useRef<number | null>(null)

  const showPlaylist = Boolean(userId && songId)
  const canFavorite = Boolean(
    showPlaylist && songStatus === 'published',
  )
  const coarsePointer = useCoarsePointer()
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const [favorites, setFavorites] = useState<PlaylistFavorite[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(showPlaylist)
  const [favoriteBusy, setFavoriteBusy] = useState(false)
  const [favoriteError, setFavoriteError] = useState<string | null>(null)

  const isFavorited = Boolean(
    songId && favorites.some((f) => f.songId === songId),
  )

  pageRef.current = page

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

  // Viewer preferences live in localStorage; read after mount so SSR and
  // first client render match.
  useEffect(() => {
    setTextScale(loadTextScale())
    setColorOverride(loadViewerColors())
  }, [])

  const onTextScaleChange = (next: number) => {
    const clamped = clampTextScale(next)
    setTextScale(clamped)
    saveTextScale(clamped)
    goToPage(0, 'instant')
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

    const target = clamped * el.clientWidth
    if (Math.abs(el.scrollLeft - target) < 1) return

    ignoreScrollRef.current = true
    if (ignoreScrollTimer.current != null) {
      window.clearTimeout(ignoreScrollTimer.current)
    }
    el.scrollTo({ left: target, behavior })

    const release = () => {
      // Snap final position without another smooth animation
      if (Math.abs(el.scrollLeft - target) > 0.5) {
        el.scrollTo({ left: target, behavior: 'instant' })
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

  // Only correct scroll when page count/layout changes — never after swipe settle
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const target = pageRef.current * el.clientWidth
    if (Math.abs(el.scrollLeft - target) <= 1) return
    ignoreScrollRef.current = true
    el.scrollTo({ left: target, behavior: 'instant' })
    ignoreScrollTimer.current = window.setTimeout(clearIgnoreScroll, 32)
  }, [pages.length, scrollerSize.width])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const onScroll = () => {
      if (ignoreScrollRef.current) return
      const w = el.clientWidth || 1
      const next = Math.round(el.scrollLeft / w)
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

  return (
    <div className="song-viewer" style={sheetColorStyle(effectiveColors)}>
      {showPlaylist && songId ? (
        <PlaylistSidebar
          favorites={favorites}
          currentSongId={songId}
          open={playlistOpen}
          onOpenChange={setPlaylistOpen}
          coarsePointer={coarsePointer}
          loading={favoritesLoading}
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
        onPageChange={(p) => goToPage(p, 'smooth')}
        onPrint={onPrint}
        favorites={
          showPlaylist
            ? {
                canFavorite,
                isFavorited,
                busy: favoriteBusy,
                onToggleFavorite: () => void onToggleFavorite(),
                showPlaylistToggle: coarsePointer,
                playlistOpen,
                onTogglePlaylist: () => setPlaylistOpen((v) => !v),
              }
            : undefined
        }
      />

      {favoriteError ? (
        <p className="playlist-error no-print" role="status">
          {favoriteError}
        </p>
      ) : null}

      <ChordChartsStrip chords={pageChords} instrument={charts} />

      <div
        className={[
          'page-stage',
          hasPrev ? 'has-prev' : '',
          hasNext ? 'has-next' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div
          ref={scrollerRef}
          className="page-scroller"
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
