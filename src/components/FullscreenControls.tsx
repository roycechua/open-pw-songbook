import { useEffect } from 'react'

import { setFullscreen } from '#/lib/fullscreen'

function IconExpand() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  )
}

function IconCollapse() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
    </svg>
  )
}

type EnterProps = {
  className: string
  /** Show the "Full screen" text next to the icon. */
  showLabel?: boolean
}

export function FullscreenEnterButton({ className, showLabel }: EnterProps) {
  return (
    <button
      type="button"
      className={className}
      aria-label={showLabel ? undefined : 'Full screen'}
      title="Full screen (hide top bar)"
      onClick={() => setFullscreen(true)}
    >
      <IconExpand />
      {showLabel ? <span>Full screen</span> : null}
    </button>
  )
}

/** Floating control that brings the top bar back. Escape works too. */
export function FullscreenExitButton() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        setFullscreen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <button
      type="button"
      className="fullscreen-exit no-print"
      aria-label="Exit full screen"
      title="Exit full screen (Esc)"
      onClick={() => setFullscreen(false)}
    >
      <IconCollapse />
    </button>
  )
}
