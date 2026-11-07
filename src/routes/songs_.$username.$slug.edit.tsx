import { createFileRoute, redirect } from '@tanstack/react-router'
import { SongEditorSkeleton } from '#/components/loading'
import { SongEditor } from '#/components/SongEditor'
import { APP_NAME } from '#/lib/brand'
import { loadSongForEdit } from '#/lib/songbook/song-server'

export const Route = createFileRoute('/songs_/$username/$slug/edit')({
  loader: async ({ params }) => {
    const result = await loadSongForEdit({
      data: { username: params.username, slug: params.slug },
    })

    if (result.kind === 'unauthenticated') {
      throw redirect({ to: '/login' })
    }
    if (result.kind === 'not_found') {
      throw redirect({ to: '/' })
    }
    if (result.kind === 'forbidden') {
      throw redirect({
        to: '/songs/$username/$slug',
        params: { username: params.username, slug: params.slug },
      })
    }

    return result
  },
  pendingComponent: SongEditorSkeleton,
  component: EditSongPage,
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `Edit ${loaderData.song.title} · ${APP_NAME}`
          : `Edit song · ${APP_NAME}`,
      },
    ],
  }),
})

function EditSongPage() {
  const { song, session } = Route.useLoaderData()
  return <SongEditor session={session} song={song} />
}
