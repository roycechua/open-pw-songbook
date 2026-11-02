import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { AppNav } from '#/components/AppNav'
import { APP_NAME } from '#/lib/brand'
import type { AuthSession } from '#/lib/supabase'
import { fetchAuthSession } from '#/lib/supabase/session'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  beforeLoad: async (): Promise<{ user: AuthSession | null }> => {
    const user = await fetchAuthSession()
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
