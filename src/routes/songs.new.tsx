import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { SongEditorSkeleton } from '#/components/loading'
import { SongEditorForm } from '#/components/SongEditorForm'
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
    meta: [{ title: `New song · ${APP_NAME}` }],
  }),
})

function NewSongPage() {
  const { session } = Route.useLoaderData()
  const navigate = useNavigate()

  return (
    <main className="song-index">
      <header className="song-index__header">
        <h1>New song</h1>
        <p className="lede">
          Paste ChordPro, set metadata, then save as draft or publish.
        </p>
        <p className="song-index__nav">
          <Link to="/my/songs" className="back-link">
            My songs
          </Link>
          <Link to="/" className="back-link">
            Catalog
          </Link>
        </p>
      </header>

      <SongEditorForm
        mode="create"
        ownerId={session.userId}
        initial={{
          title: '',
          artist: '',
          originalKey: 'C',
          slug: '',
          chordPro: '{title: }\n{artist: }\n{key: C}\n\n',
          status: 'draft',
        }}
        onSaved={(saved) => {
          void navigate({
            to: '/songs/$username/$slug',
            params: { username: saved.username, slug: saved.slug },
          })
        }}
        onCancel={() => {
          void navigate({ to: '/my/songs' })
        }}
      />
    </main>
  )
}
