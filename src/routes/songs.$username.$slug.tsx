import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { SongViewerSkeleton } from '#/components/loading'
import { SongViewer } from '#/components/SongViewer'
import { APP_NAME } from '#/lib/brand'
import { loadSongClient } from '#/lib/songbook/song-client'
import { loadSongByUsernameSlug } from '#/lib/songbook/song-server'

export const Route = createFileRoute('/songs/$username/$slug')({
  loader: async ({ params }) => {
    // SSR / first load: server function. Client navigations: direct to Supabase.
    const data =
      typeof window === 'undefined'
        ? await loadSongByUsernameSlug({
            data: { username: params.username, slug: params.slug },
          })
        : await loadSongClient(params.username, params.slug)
    if (!data) throw notFound()
    return data
  },
  pendingComponent: SongViewerSkeleton,
  component: SongPage,
  notFoundComponent: SongNotFound,
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.meta.title} · ${APP_NAME}`
          : `Song · ${APP_NAME}`,
      },
    ],
  }),
})

function SongPage() {
  const { meta, parsed, isOwner } = Route.useLoaderData()
  const { user } = Route.useRouteContext()

  return (
    <div
      className={
        isOwner && meta.status === 'draft'
          ? 'song-page-shell song-page-shell--draft'
          : 'song-page-shell'
      }
    >
      {isOwner && meta.status === 'draft' ? (
        <div className="song-draft-banner no-print">
          <span>Draft — only you can view this song.</span>
          <Link
            to="/songs/$username/$slug/edit"
            params={{ username: meta.username, slug: meta.slug }}
          >
            Edit
          </Link>
        </div>
      ) : null}
      <SongViewer
        title={meta.title}
        artist={
          meta.artist
            ? `${meta.artist} · @${meta.username}`
            : `@${meta.username}`
        }
        originalKey={meta.originalKey}
        parsed={parsed}
        songId={meta.id}
        songStatus={meta.status}
        userId={user?.userId ?? null}
      />
    </div>
  )
}

function SongNotFound() {
  return (
    <main className="song-index">
      <header className="song-index__header">
        <p className="brand">{APP_NAME}</p>
        <h1>Song not found</h1>
        <p className="lede">
          This song is missing, private, or the link is wrong.
        </p>
        <Link to="/" className="back-link">
          Back to songs
        </Link>
      </header>
    </main>
  )
}
