import type { SongbookClient } from '#/lib/supabase/auth'
import type { SongMutationResult } from './songs'

/** Favorited published song row for the viewer sidebar. */
export type PlaylistFavorite = {
  id: string
  songId: string
  position: number
  title: string
  artist: string
  username: string
  slug: string
  originalKey: string
}

function mutationError(
  message: string,
  code?: string,
): SongMutationResult<never> {
  return { data: null, error: { message, code } }
}

type SongJoin = {
  id: string
  title: string
  artist: string
  slug: string
  original_key: string
  status: string
  profiles: { username: string } | { username: string }[] | null
}

function mapFavoriteRow(row: {
  id: string
  song_id: string
  position: number
  songs: SongJoin | SongJoin[] | null
}): PlaylistFavorite | null {
  const song = Array.isArray(row.songs) ? row.songs[0] : row.songs
  if (!song || song.status !== 'published') return null
  const profile = Array.isArray(song.profiles) ? song.profiles[0] : song.profiles
  const username = profile?.username ?? ''
  if (!username) return null
  return {
    id: row.id,
    songId: song.id,
    position: row.position,
    title: song.title,
    artist: song.artist,
    username,
    slug: song.slug,
    originalKey: song.original_key,
  }
}

const FAVORITE_SELECT =
  'id, song_id, position, songs!playlist_items_song_id_fkey ( id, title, artist, slug, original_key, status, profiles!songs_owner_id_fkey ( username ) )'

/** Ordered favorites for a user (published songs only). */
export async function listFavorites(
  supabase: SongbookClient,
  userId: string,
): Promise<PlaylistFavorite[]> {
  const { data, error } = await supabase
    .from('playlist_items')
    .select(FAVORITE_SELECT)
    .eq('user_id', userId)
    .order('position', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? [])
    .map(mapFavoriteRow)
    .filter((row): row is PlaylistFavorite => row != null)
}

/** Whether the song is already in the user's favorites. */
export async function isFavorite(
  supabase: SongbookClient,
  userId: string,
  songId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('playlist_items')
    .select('id')
    .eq('user_id', userId)
    .eq('song_id', songId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  return Boolean(data)
}

/** Append a published song to the end of the user's favorites. */
export async function addFavorite(
  supabase: SongbookClient,
  userId: string,
  songId: string,
): Promise<SongMutationResult<PlaylistFavorite>> {
  const { data: maxRow, error: maxError } = await supabase
    .from('playlist_items')
    .select('position')
    .eq('user_id', userId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (maxError) {
    return mutationError(maxError.message, maxError.code)
  }

  const nextPosition = (maxRow?.position ?? -1) + 1

  const { data, error } = await supabase
    .from('playlist_items')
    .insert({
      user_id: userId,
      song_id: songId,
      position: nextPosition,
    })
    .select(FAVORITE_SELECT)
    .single()

  if (error) {
    if (error.code === '23505') {
      return mutationError('Already in favorites', 'already_favorited')
    }
    return mutationError(error.message, error.code)
  }

  const mapped = mapFavoriteRow(data)
  if (!mapped) {
    return mutationError(
      'Song must be published to favorite',
      'not_published',
    )
  }

  return { data: mapped, error: null }
}

/** Remove a song from the user's favorites. */
export async function removeFavorite(
  supabase: SongbookClient,
  userId: string,
  songId: string,
): Promise<SongMutationResult<{ ok: true }>> {
  const { error } = await supabase
    .from('playlist_items')
    .delete()
    .eq('user_id', userId)
    .eq('song_id', songId)

  if (error) {
    return mutationError(error.message, error.code)
  }
  return { data: { ok: true }, error: null }
}

/**
 * Reorder favorites by song id list (positions 0..n-1).
 * Song ids not currently favorited are ignored; omitted favorites keep relative order at the end.
 */
export async function reorderFavorites(
  supabase: SongbookClient,
  userId: string,
  orderedSongIds: string[],
): Promise<SongMutationResult<{ ok: true }>> {
  const current = await listFavorites(supabase, userId)
  const currentIds = new Set(current.map((f) => f.songId))
  const seen = new Set<string>()
  const ordered: string[] = []

  for (const songId of orderedSongIds) {
    if (!currentIds.has(songId) || seen.has(songId)) continue
    seen.add(songId)
    ordered.push(songId)
  }
  for (const fav of current) {
    if (!seen.has(fav.songId)) ordered.push(fav.songId)
  }

  for (let position = 0; position < ordered.length; position++) {
    const songId = ordered[position]
    const { error } = await supabase
      .from('playlist_items')
      .update({ position })
      .eq('user_id', userId)
      .eq('song_id', songId)

    if (error) {
      return mutationError(error.message, error.code)
    }
  }

  return { data: { ok: true }, error: null }
}
