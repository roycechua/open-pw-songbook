import { Link } from '@tanstack/react-router'
import { COMMON_KEYS, type ChartInstrument, type ViewMode } from '#/lib/songbook'

type Props = {
  title: string
  artist: string
  currentKey: string
  originalKey: string
  mode: ViewMode
  charts: ChartInstrument
  page: number
  pageCount: number
  onKeyChange: (key: string) => void
  onModeChange: (mode: ViewMode) => void
  onChartsChange: (charts: ChartInstrument) => void
  onPageChange: (page: number) => void
  onPrint: () => void
}

export function ViewerToolbar({
  title,
  artist,
  currentKey,
  originalKey,
  mode,
  charts,
  page,
  pageCount,
  onKeyChange,
  onModeChange,
  onChartsChange,
  onPageChange,
  onPrint,
}: Props) {
  const hasPrev = page > 0
  const hasNext = page < pageCount - 1
  const multiPage = pageCount > 1

  return (
    <header className="viewer-toolbar no-print">
      <div className="viewer-toolbar__top">
        <Link to="/" className="back-link">
          Songs
        </Link>
        <div className="viewer-toolbar__titles">
          <h1 className="viewer-title">{title}</h1>
          <p className="viewer-artist">{artist}</p>
        </div>
        <button type="button" className="toolbar-btn" onClick={onPrint}>
          Print
        </button>
      </div>

      <div className="viewer-toolbar__controls">
        <label className="control">
          <span>Key</span>
          <select
            value={currentKey}
            onChange={(e) => onKeyChange(e.target.value)}
            aria-label="Song key"
          >
            {COMMON_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
                {k === originalKey ? ' (orig)' : ''}
              </option>
            ))}
          </select>
        </label>

        <div className="control segment" role="group" aria-label="View mode">
          <button
            type="button"
            className={mode === 'chords' ? 'is-active' : undefined}
            onClick={() => onModeChange('chords')}
          >
            Chords
          </button>
          <button
            type="button"
            className={mode === 'lyrics' ? 'is-active' : undefined}
            onClick={() => onModeChange('lyrics')}
          >
            Lyrics
          </button>
        </div>

        <label className="control">
          <span>Charts</span>
          <select
            value={charts}
            onChange={(e) => onChartsChange(e.target.value as ChartInstrument)}
            aria-label="Chord charts"
          >
            <option value="off">Off</option>
            <option value="guitar">Guitar</option>
            <option value="piano">Piano</option>
            <option value="both">Both</option>
          </select>
        </label>

        {multiPage ? (
          <div className="page-nav" aria-live="polite">
            <button
              type="button"
              className="page-nav__btn"
              aria-label="Previous page"
              disabled={!hasPrev}
              onClick={() => onPageChange(page - 1)}
            >
              ‹
            </button>
            <div className="page-nav__status">
              <span className="page-indicator">
                {page + 1}/{pageCount}
              </span>
              <div
                className="page-dots"
                role="tablist"
                aria-label="Song pages"
              >
                {Array.from({ length: pageCount }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-label={`Go to page ${i + 1}`}
                    aria-selected={i === page}
                    className={
                      i === page ? 'page-dot is-active' : 'page-dot'
                    }
                    onClick={() => onPageChange(i)}
                  />
                ))}
              </div>
            </div>
            <button
              type="button"
              className={
                hasNext ? 'page-nav__btn page-nav__btn--more' : 'page-nav__btn'
              }
              aria-label="Next page"
              disabled={!hasNext}
              onClick={() => onPageChange(page + 1)}
            >
              ›
            </button>
          </div>
        ) : (
          <div className="page-indicator" aria-live="polite">
            {page + 1}/{pageCount}
          </div>
        )}
      </div>
    </header>
  )
}
