import { createRouter as createTanStackRouter } from '@tanstack/react-router'

import { RoutePending } from '#/components/loading'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    // Supabase is far from the server region; reuse preloaded/visited data.
    defaultPreloadStaleTime: 30_000,
    defaultStaleTime: 30_000,
    defaultPendingMs: 150,
    defaultPendingComponent: RoutePending,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
