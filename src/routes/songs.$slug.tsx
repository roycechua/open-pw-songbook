import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { SongViewer } from '#/components/SongViewer'
import { getParsedSong } from '#/lib/songbook'

export const Route = createFileRoute('/songs/$slug')({
  loader: ({ params }) => {
    const data = getParsedSong(params.slug)
    if (!data) throw notFound()
    return data
  },
  component: SongPage,
  notFoundComponent: SongNotFound,
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.meta.title} · Open PW Songbook`
          : 'Song · Open PW Songbook',
      },
    ],
  }),
})

function SongPage() {
  const { meta, parsed } = Route.useLoaderData()

  return (
    <SongViewer
      title={meta.title}
      artist={meta.artist}
      originalKey={meta.originalKey}
      parsed={parsed}
    />
  )
}

function SongNotFound() {
  return (
    <main className="song-index">
      <header className="song-index__header">
        <p className="brand">Open PW Songbook</p>
        <h1>Song not found</h1>
        <p className="lede">
          That slug is not in the seeded catalog. Pick another from the list.
        </p>
        <Link to="/" className="back-link">
          Back to songs
        </Link>
      </header>
    </main>
  )
}
