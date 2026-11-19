/** Reader preferences (View Mode), persisted in the browser. */

export const TEXT_SCALE_MIN = 0.8
export const TEXT_SCALE_MAX = 1.6
export const TEXT_SCALE_STEP = 0.1
export const TEXT_SCALE_DEFAULT = 1

export type SwipeDirection = 'horizontal' | 'vertical'

export const SWIPE_DIRECTION_DEFAULT: SwipeDirection = 'horizontal'

const TEXT_SCALE_KEY = 'songbook:text-scale'
const SWIPE_DIRECTION_KEY = 'songbook:swipe-direction'

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
