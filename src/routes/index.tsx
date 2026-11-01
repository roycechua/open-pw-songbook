import { Link, createFileRoute } from '@tanstack/react-router'
import { listSongs } from '#/lib/songbook'

export const Route = createFileRoute('/')({
  component: SongIndex,
  head: () => ({
    meta: [{ title: 'Open PW Songbook' }],
  }),
})

function SongIndex() {
  const songs = listSongs()

  return (
    <main className="song-index">
      <header className="song-index__header">
        <p className="brand">Open PW Songbook</p>
        <h1>Songs</h1>
        <p className="lede">
          Chord sheets for mobile and tablet — swipe pages, change key, print.
        </p>
      </header>

      {songs.length === 0 ? (
        <p className="empty-state">No songs seeded yet.</p>
      ) : (
        <ul className="song-list">
          {songs.map((song) => (
            <li key={song.slug}>
              <Link
                to="/songs/$slug"
                params={{ slug: song.slug }}
                className="song-list__link"
              >
                <span className="song-list__title">{song.title}</span>
                <span className="song-list__meta">
                  {song.artist}
                  <span className="song-list__key"> · {song.originalKey}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
