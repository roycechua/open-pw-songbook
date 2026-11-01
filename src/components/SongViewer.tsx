import { useEffect, useMemo, useRef, useState } from 'react'
import {
  collectChords,
  linesPerPageForHeight,
  paginateBlocks,
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
  const [viewportH, setViewportH] = useState(720)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const scrollingFromUi = useRef(false)

  useEffect(() => {
    const update = () => setViewportH(window.innerHeight)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const transposed = useMemo(
    () => transposeParsedSong(parsed, currentKey),
    [parsed, currentKey],
  )

  const linesPerPage = useMemo(() => {
    const chartAllowance = charts === 'off' ? 0 : charts === 'both' ? 140 : 100
    return linesPerPageForHeight(viewportH - chartAllowance)
  }, [viewportH, charts])

  const pages = useMemo(
    () => paginateBlocks(transposed.blocks, linesPerPage),
    [transposed.blocks, linesPerPage],
  )

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, pages.length - 1)))
  }, [pages.length])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const onScroll = () => {
      if (scrollingFromUi.current) return
      const w = el.clientWidth || 1
      const next = Math.round(el.scrollLeft / w)
      setPage(next)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const w = el.clientWidth
    const target = page * w
    if (Math.abs(el.scrollLeft - target) < 2) return
    scrollingFromUi.current = true
    el.scrollTo({ left: target, behavior: 'smooth' })
    const t = window.setTimeout(() => {
      scrollingFromUi.current = false
    }, 350)
    return () => window.clearTimeout(t)
  }, [page, pages.length])

  const pageChords = useMemo(() => {
    const block = pages[page] ?? []
    return collectChords(block)
  }, [pages, page])

  const onPrint = () => {
    window.print()
  }

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
          setPage(0)
        }}
        onModeChange={setMode}
        onChartsChange={setCharts}
        onPrint={onPrint}
      />

      <ChordChartsStrip chords={pageChords} instrument={charts} />

      <div
        ref={scrollerRef}
        className="page-scroller"
        aria-label="Song pages"
      >
        {pages.map((blocks, i) => (
          <section
            key={i}
            className="song-page"
            aria-label={`Page ${i + 1} of ${pages.length}`}
          >
            <div className="song-page__inner print-page">
              {i === 0 && (
                <div className="print-only print-header">
                  <h1>{title}</h1>
                  <p>
                    {artist} · Key: {currentKey}
                  </p>
                </div>
              )}
              <SongSheet blocks={blocks} mode={mode} />
            </div>
          </section>
        ))}
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
        <SongSheet blocks={transposed.blocks} mode={mode} />
      </div>
    </div>
  )
}
