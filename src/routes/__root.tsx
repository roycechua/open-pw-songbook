import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { AppNav } from '#/components/AppNav'
import { NavigationProgress } from '#/components/loading'
import { APP_NAME } from '#/lib/brand'
import type { AuthSession } from '#/lib/supabase'
import { fetchAuthSession } from '#/lib/supabase/session'
import { fetchAuthSessionClient } from '#/lib/supabase/session-client'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  beforeLoad: async (): Promise<{ user: AuthSession | null }> => {
    // SSR / first load: server function. Client navigations: talk to Supabase
    // directly, since the app server is far from the Supabase region.
    const user =
      typeof window === 'undefined'
        ? await fetchAuthSession()
        : await fetchAuthSessionClient()
    return { user }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { title: APP_NAME },
      {
        name: 'description',
        content:
          'Mobile-first chord sheets with transpose, lyrics mode, and optional charts.',
      },
      { name: 'theme-color', content: '#f3efe6' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
})

function RootComponent() {
  const { user } = Route.useRouteContext()

  return (
    <>
      <NavigationProgress />
      <AppNav user={user} />
      <Outlet />
    </>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
