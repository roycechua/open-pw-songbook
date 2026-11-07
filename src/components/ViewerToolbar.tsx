import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Spinner } from '#/components/loading'
import {
  COMMON_KEYS,
  DEFAULT_CHORD_COLOR,
  DEFAULT_LABEL_COLOR,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  TEXT_SCALE_STEP,
  type ChartInstrument,
  type SheetColors,
  type ViewMode,
} from '#/lib/songbook'
import { ColorField } from './ColorField'

type FavoriteControls = {
  /** Show add/remove only for published songs when logged in. */
  canFavorite: boolean
  isFavorited: boolean
  busy: boolean
  onToggleFavorite: () => void
  /** Touch / coarse: explicit favorites panel toggle. */
  showPlaylistToggle: boolean
  playlistOpen: boolean
  onTogglePlaylist: () => void
}

type ColorControls = {
  /** Author defaults from the song (may be empty). */
  author: SheetColors
  /** Viewer's own overrides (may be empty). */
  override: SheetColors
  onChange: (field: 'chord' | 'label', hex: string) => void
  onReset: (field: 'chord' | 'label') => void
  onResetAll: () => void
}

type Props = {
  title: string
  artist: string
  currentKey: string
  originalKey: string
  mode: ViewMode
  charts: ChartInstrument
  page: number
  pageCount: number
  textScale: number
  colors: ColorControls
  onTextScaleChange: (scale: number) => void
  onKeyChange: (key: string) => void
  onModeChange: (mode: ViewMode) => void
  onChartsChange: (charts: ChartInstrument) => void
  onPageChange: (page: number) => void
  onPrint: () => void
  favorites?: FavoriteControls
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
  textScale,
  colors,
  onTextScaleChange,
  onKeyChange,
  onModeChange,
  onChartsChange,
  onPageChange,
  onPrint,
  favorites,
}: Props) {
  const hasPrev = page > 0
  const hasNext = page < pageCount - 1
  const multiPage = pageCount > 1
  const [colorsOpen, setColorsOpen] = useState(false)
  const scalePercent = Math.round(textScale * 100)
  const canShrink = textScale > TEXT_SCALE_MIN + 0.001
  const canGrow = textScale < TEXT_SCALE_MAX - 0.001
  const hasOverride = Boolean(colors.override.chord || colors.override.label)
  const chordShown =
    colors.override.chord ?? colors.author.chord ?? DEFAULT_CHORD_COLOR
  const labelShown =
    colors.override.label ?? colors.author.label ?? DEFAULT_LABEL_COLOR

  return (
    <header className="viewer-toolbar no-print">
      <div className="viewer-toolbar__top">
        <Link to="/" className="viewer-back" aria-label="Back to songs">
          <span aria-hidden="true">‹</span>
          <span className="viewer-back__label">Songs</span>
        </Link>
        <div className="viewer-toolbar__titles">
          <h1 className="viewer-title">{title}</h1>
          <p className="viewer-artist">{artist}</p>
        </div>
        <div className="viewer-toolbar__actions">
          {favorites?.showPlaylistToggle ? (
            <button
              type="button"
              className={
                favorites.playlistOpen
                  ? 'toolbar-btn is-active'
                  : 'toolbar-btn'
              }
              aria-expanded={favorites.playlistOpen}
              aria-controls="playlist-sidebar-panel"
              onClick={favorites.onTogglePlaylist}
            >
              Favorites
            </button>
          ) : null}
          {favorites?.canFavorite ? (
            <button
              type="button"
              className={
                favorites.isFavorited
                  ? 'toolbar-btn toolbar-btn--favorite is-active busy-button'
                  : 'toolbar-btn toolbar-btn--favorite busy-button'
              }
              aria-pressed={favorites.isFavorited}
              aria-busy={favorites.busy || undefined}
              disabled={favorites.busy}
              onClick={favorites.onToggleFavorite}
              title={
                favorites.isFavorited
                  ? 'Remove from favorites'
                  : 'Add to favorites'
              }
            >
              {favorites.busy ? (
                <>
                  <Spinner size="sm" label="" />
                  <span>
                    {favorites.isFavorited ? '★ Favorited' : '☆ Favorite'}
                  </span>
                </>
              ) : favorites.isFavorited ? (
                '★ Favorited'
              ) : (
                '☆ Favorite'
              )}
            </button>
          ) : null}
          <button
            type="button"
            className="toolbar-btn toolbar-btn--print"
            onClick={onPrint}
          >
            Print
          </button>
        </div>
      </div>

      <div className="viewer-toolbar__controls viewer-controls">
        <label className="control control--key">
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

        <label className="control control--charts">
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

        <div className="control text-size" role="group" aria-label="Text size">
          <button
            type="button"
            className="text-size__btn"
            aria-label="Decrease text size"
            disabled={!canShrink}
            onClick={() => onTextScaleChange(textScale - TEXT_SCALE_STEP)}
          >
            <span className="text-size__a text-size__a--sm" aria-hidden="true">
              A
            </span>
          </button>
          <span className="text-size__value" aria-live="polite">
            {scalePercent}%
          </span>
          <button
            type="button"
            className="text-size__btn"
            aria-label="Increase text size"
            disabled={!canGrow}
            onClick={() => onTextScaleChange(textScale + TEXT_SCALE_STEP)}
          >
            <span className="text-size__a text-size__a--lg" aria-hidden="true">
              A
            </span>
          </button>
        </div>

        <div className="control color-menu">
          <button
            type="button"
            className={
              colorsOpen ? 'toolbar-btn is-active' : 'toolbar-btn'
            }
            aria-expanded={colorsOpen}
            aria-controls="viewer-colors-panel"
            onClick={() => setColorsOpen((v) => !v)}
          >
            <span
              className="color-menu__dots"
              aria-hidden="true"
            >
              <i style={{ backgroundColor: chordShown }} />
              <i style={{ backgroundColor: labelShown }} />
            </span>
            Colors
          </button>
          {colorsOpen ? (
            <div
              id="viewer-colors-panel"
              className="color-menu__panel"
              role="group"
              aria-label="Chord and section label colors"
            >
              <ColorField
                id="viewer-chord-color"
                label="Chords"
                value={chordShown}
                isDefault={!colors.override.chord}
                resetLabel={colors.author.chord ? 'Song default' : 'Default'}
                onChange={(hex) => colors.onChange('chord', hex)}
                onReset={() => colors.onReset('chord')}
              />
              <ColorField
                id="viewer-label-color"
                label="Section labels"
                value={labelShown}
                isDefault={!colors.override.label}
                resetLabel={colors.author.label ? 'Song default' : 'Default'}
                onChange={(hex) => colors.onChange('label', hex)}
                onReset={() => colors.onReset('label')}
              />
              <button
                type="button"
                className="text-btn"
                disabled={!hasOverride}
                onClick={colors.onResetAll}
              >
                Use song colors
              </button>
            </div>
          ) : null}
        </div>

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
