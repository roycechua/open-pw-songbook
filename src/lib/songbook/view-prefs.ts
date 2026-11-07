/** Reader text size preference (View Mode), persisted in the browser. */

export const TEXT_SCALE_MIN = 0.8
export const TEXT_SCALE_MAX = 1.6
export const TEXT_SCALE_STEP = 0.1
export const TEXT_SCALE_DEFAULT = 1

const TEXT_SCALE_KEY = 'songbook:text-scale'

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
