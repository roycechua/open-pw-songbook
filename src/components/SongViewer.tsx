import { useEffect, useMemo, useRef, useState } from 'react'
import {
  collectChords,
  linesPerPageForHeight,
  paginateBlocks,
  sheetColumnCount,
  transposeParsedSong,
  type ChartInstrument,
  type ParsedSong,
  type ViewMode,
} from '#/lib/songbook'
import { ChordChartsStrip } from './ChordChartsStrip'
import { SongSheet } from './SongSheet'
import { ViewerToolbar } from './ViewerToolbar'

type Props = {
  title: string
  artist: string
  originalKey: string
  parsed: ParsedSong
}

export function SongViewer({ title, artist, originalKey, parsed }: Props) {
  const [currentKey, setCurrentKey] = useState(parsed.key || originalKey)
  const [mode, setMode] = useState<ViewMode>('chords')
  const [charts, setCharts] = useState<ChartInstrument>('off')
  const [page, setPage] = useState(0)
  const [scrollerSize, setScrollerSize] = useState({ width: 390, height: 560 })
  const scrollerRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef(0)
  const ignoreScrollRef = useRef(false)
  const ignoreScrollTimer = useRef<number | null>(null)

  pageRef.current = page

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

  const transposed = useMemo(
    () => transposeParsedSong(parsed, currentKey),
    [parsed, currentKey],
  )

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
      }),
    [scrollerSize.height, scrollerSize.width, mode, columns],
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

  const hasPrev = page > 0
  const hasNext = page < pages.length - 1

  return (
    <div className="song-viewer">
      <ViewerToolbar
        title={title}
        artist={artist}
        currentKey={currentKey}
        originalKey={originalKey}
        mode={mode}
        charts={charts}
        page={page}
        pageCount={pages.length}
        onKeyChange={(k) => {
          setCurrentKey(k)
          goToPage(0, 'instant')
        }}
        onModeChange={setMode}
        onChartsChange={setCharts}
        onPageChange={(p) => goToPage(p, 'smooth')}
        onPrint={onPrint}
      />

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
