/** Reader preferences (View Mode), persisted in the browser. */

export const TEXT_SCALE_MIN = 0.8
export const TEXT_SCALE_MAX = 1.6
export const TEXT_SCALE_STEP = 0.1
export const TEXT_SCALE_DEFAULT = 1

export type SwipeDirection = 'horizontal' | 'vertical'

export const SWIPE_DIRECTION_DEFAULT: SwipeDirection = 'horizontal'

/** Vertical rhythm of lyrics, chords, and section gaps. */
export type LayoutDensity = 'comfortable' | 'compact' | 'tight'

export const LAYOUT_DENSITY_DEFAULT: LayoutDensity = 'compact'

/** Auto follows the scroller width. 1 and 2 force a column count. */
export type SheetColumnsPref = 'auto' | '1' | '2'

export const SHEET_COLUMNS_DEFAULT: SheetColumnsPref = 'auto'

export const KEEP_SECTIONS_DEFAULT = false

export const FIT_TO_PAGE_DEFAULT = false

const TEXT_SCALE_KEY = 'songbook:text-scale'
const SWIPE_DIRECTION_KEY = 'songbook:swipe-direction'
const LAYOUT_DENSITY_KEY = 'songbook:layout-density'
const SHEET_COLUMNS_KEY = 'songbook:sheet-columns'
const KEEP_SECTIONS_KEY = 'songbook:keep-sections'
const FIT_TO_PAGE_KEY = 'songbook:fit-to-page'

export function clampTextScale(value: number): number {
  if (!Number.isFinite(value)) return TEXT_SCALE_DEFAULT
  const clamped = Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, value))
  // Avoid float drift (1.2000000000000002) so the % label stays clean.
  return Math.round(clamped * 10) / 10
}

export function loadTextScale(): number {
  if (typeof window === 'undefined') return TEXT_SCALE_DEFAULT
  try {
    const raw = window.localStorage.getItem(TEXT_SCALE_KEY)
    if (!raw) return TEXT_SCALE_DEFAULT
    return clampTextScale(Number(raw))
  } catch {
    return TEXT_SCALE_DEFAULT
  }
}

export function saveTextScale(value: number) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TEXT_SCALE_KEY, String(value))
  } catch {
    // Preference just won't persist.
  }
}

export function loadSwipeDirection(): SwipeDirection {
  if (typeof window === 'undefined') return SWIPE_DIRECTION_DEFAULT
  try {
    const raw = window.localStorage.getItem(SWIPE_DIRECTION_KEY)
    if (raw === 'horizontal' || raw === 'vertical') return raw
    return SWIPE_DIRECTION_DEFAULT
  } catch {
    return SWIPE_DIRECTION_DEFAULT
  }
}

export function saveSwipeDirection(value: SwipeDirection) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SWIPE_DIRECTION_KEY, value)
  } catch {
    // Preference just won't persist.
  }
}

export function parseLayoutDensity(
  value: string | null | undefined,
): LayoutDensity {
  if (value === 'comfortable' || value === 'compact' || value === 'tight') {
    return value
  }
  return LAYOUT_DENSITY_DEFAULT
}

export function parseSheetColumnsPref(
  value: string | null | undefined,
): SheetColumnsPref {
  if (value === 'auto' || value === '1' || value === '2') return value
  return SHEET_COLUMNS_DEFAULT
}

export function loadLayoutDensity(): LayoutDensity {
  if (typeof window === 'undefined') return LAYOUT_DENSITY_DEFAULT
  try {
    return parseLayoutDensity(window.localStorage.getItem(LAYOUT_DENSITY_KEY))
  } catch {
    return LAYOUT_DENSITY_DEFAULT
  }
}

export function saveLayoutDensity(value: LayoutDensity) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LAYOUT_DENSITY_KEY, value)
  } catch {
    // Preference just won't persist.
  }
}

export function loadSheetColumnsPref(): SheetColumnsPref {
  if (typeof window === 'undefined') return SHEET_COLUMNS_DEFAULT
  try {
    return parseSheetColumnsPref(window.localStorage.getItem(SHEET_COLUMNS_KEY))
  } catch {
    return SHEET_COLUMNS_DEFAULT
  }
}

export function saveSheetColumnsPref(value: SheetColumnsPref) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SHEET_COLUMNS_KEY, value)
  } catch {
    // Preference just won't persist.
  }
}

function loadBoolPref(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === '1') return true
    if (raw === '0') return false
    return fallback
  } catch {
    return fallback
  }
}

function saveBoolPref(key: string, value: boolean) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, value ? '1' : '0')
  } catch {
    // Preference just won't persist.
  }
}

export function loadKeepSections(): boolean {
  return loadBoolPref(KEEP_SECTIONS_KEY, KEEP_SECTIONS_DEFAULT)
}

export function saveKeepSections(value: boolean) {
  saveBoolPref(KEEP_SECTIONS_KEY, value)
}

export function loadFitToPage(): boolean {
  return loadBoolPref(FIT_TO_PAGE_KEY, FIT_TO_PAGE_DEFAULT)
}

export function saveFitToPage(value: boolean) {
  saveBoolPref(FIT_TO_PAGE_KEY, value)
}
