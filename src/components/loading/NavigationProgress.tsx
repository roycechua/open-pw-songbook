import { useRouterState } from '@tanstack/react-router'

/** Thin indeterminate bar while any route transition is pending. */
export function NavigationProgress() {
  const pending = useRouterState({
    select: (s) => s.status === 'pending' || s.isLoading,
  })

  if (!pending) return null

  return (
    <div
      className="route-progress"
      role="progressbar"
      aria-label="Loading page"
      aria-valuetext="Loading"
    />
  )
}
