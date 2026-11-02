import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { SongEditorForm } from '#/components/SongEditorForm'
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
  const navigate = useNavigate()

  return (
    <main className="song-index">
      <header className="song-index__header">
        <h1>Edit song</h1>
        <p className="lede">
          Update ChordPro and publishing details for @{session.username}.
        </p>
        <p className="song-index__nav">
          <Link
            to="/songs/$username/$slug"
            params={{ username: song.username, slug: song.slug }}
            className="back-link"
          >
            View
          </Link>
          <Link to="/my/songs" className="back-link">
            My songs
          </Link>
        </p>
      </header>

      <SongEditorForm
        mode="edit"
        ownerId={session.userId}
        initial={{
          id: song.id,
          title: song.title,
          artist: song.artist,
          originalKey: song.originalKey,
          slug: song.slug,
          chordPro: song.chordPro,
          status: song.status,
        }}
        onSaved={(saved) => {
          void navigate({
            to: '/songs/$username/$slug',
            params: { username: saved.username, slug: saved.slug },
          })
        }}
        onCancel={() => {
          void navigate({
            to: '/songs/$username/$slug',
            params: { username: song.username, slug: song.slug },
          })
        }}
      />
    </main>
  )
}
