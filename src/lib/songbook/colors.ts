/** Chord / section-label colors: author default (ChordPro) + viewer override. */

export type SheetColors = {
  chord?: string
  label?: string
}

export const DEFAULT_CHORD_COLOR = '#bc4936'
export const DEFAULT_LABEL_COLOR = '#4c6d4c'

/** Swatches offered next to the native color input. */
export const COLOR_PRESETS = [
  '#bc4936',
  '#0b4f8a',
  '#4c6d4c',
  '#7a3e9d',
  '#b26a00',
  '#242822',
] as const

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

export const CHORD_COLOR_DIRECTIVES = ['x_chord_color'] as const
export const LABEL_COLOR_DIRECTIVES = ['x_label_color'] as const

/** Returns a lowercase `#rrggbb` string, or undefined when invalid. */
export function normalizeHexColor(value: string | null | undefined) {
  const trimmed = value?.trim()
  if (!trimmed || !HEX_COLOR_RE.test(trimmed)) return undefined
  return trimmed.toLowerCase()
}

const VIEWER_COLORS_KEY = 'songbook:colors'

export function loadViewerColors(): SheetColors {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(VIEWER_COLORS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      chord: normalizeHexColor(
        typeof parsed.chord === 'string' ? parsed.chord : undefined,
      ),
      label: normalizeHexColor(
        typeof parsed.label === 'string' ? parsed.label : undefined,
      ),
    }
  } catch {
    return {}
  }
}

export function saveViewerColors(colors: SheetColors) {
  if (typeof window === 'undefined') return
  try {
    if (!colors.chord && !colors.label) {
      window.localStorage.removeItem(VIEWER_COLORS_KEY)
    } else {
      window.localStorage.setItem(VIEWER_COLORS_KEY, JSON.stringify(colors))
    }
  } catch {
    // Storage may be unavailable (private mode); preference just won't persist.
  }
}

/** Inline CSS variables for validated colors only. */
export function sheetColorStyle(colors: SheetColors) {
  const style: Record<string, string> = {}
  if (colors.chord) style['--chord-color'] = colors.chord
  if (colors.label) style['--label-color'] = colors.label
  return style
}
