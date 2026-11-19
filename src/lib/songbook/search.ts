import type { SongListItem } from './types'

/** Case-insensitive match on title, artist, or author username. */
export function matchesSongSearch(
  song: Pick<SongListItem, 'title' | 'artist' | 'username'>,
  query: string,
): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    song.title.toLowerCase().includes(q) ||
    song.artist.toLowerCase().includes(q) ||
    song.username.toLowerCase().includes(q)
  )
}
