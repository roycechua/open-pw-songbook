import { createFileRoute, redirect } from '@tanstack/react-router'
import { SongEditorSkeleton } from '#/components/loading'
import { SongEditor } from '#/components/SongEditor'
import { APP_NAME } from '#/lib/brand'
import { getSessionProfile } from '#/lib/songbook/song-server'

export const Route = createFileRoute('/songs/new')({
  loader: async () => {
    const session = await getSessionProfile()
    if (!session) {
      throw redirect({ to: '/login' })
    }
    return { session }
  },
  pendingComponent: SongEditorSkeleton,
  component: NewSongPage,
  head: () => ({
    meta: [{ title: `Add New Song · ${APP_NAME}` }],
  }),
})

function NewSongPage() {
  const { session } = Route.useLoaderData()
  return <SongEditor session={session} />
}
