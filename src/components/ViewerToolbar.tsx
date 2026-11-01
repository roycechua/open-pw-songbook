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
  onPrint,
}: Props) {
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

        <div className="page-indicator" aria-live="polite">
          {page + 1}/{pageCount}
        </div>
      </div>
    </header>
  )
}
