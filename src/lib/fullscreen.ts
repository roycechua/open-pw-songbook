import { useSyncExternalStore } from 'react'

/**
 * Fullscreen mode hides the top bar (app header, or the viewer toolbar on a
 * song page). Persisted in the browser so it survives navigation and reloads.
 */

const FULLSCREEN_KEY = 'songbook:fullscreen'

const listeners = new Set<() => void>()
let current: boolean | null = null

function read(): boolean {
  if (current !== null) return current
  try {
    current = window.localStorage.getItem(FULLSCREEN_KEY) === '1'
  } catch {
    current = false
  }
  return current
}

export function setFullscreen(next: boolean) {
  current = next
  try {
    if (next) window.localStorage.setItem(FULLSCREEN_KEY, '1')
    else window.localStorage.removeItem(FULLSCREEN_KEY)
  } catch {
    // Preference just won't persist.
  }
  listeners.forEach((listener) => listener())
}

export function toggleFullscreen() {
  setFullscreen(!read())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useFullscreen(): boolean {
  return useSyncExternalStore(subscribe, read, () => false)
}
