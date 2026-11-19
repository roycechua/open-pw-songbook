import type { SongbookClient } from '#/lib/supabase/auth'
import type { SongMutationResult } from './songs'
import type { SongStatus } from './types'

export const PLAYLIST_NAME_MAX = 80
export const PLAYLIST_DESCRIPTION_MAX = 500
/** Number of playlists shown in the home screen preview. */
export const HOME_PLAYLIST_PREVIEW_LIMIT = 4

/** Playlist card / picker row. */
export type PlaylistSummary = {
  id: string
  name: string
  description: string
  songCount: number
  updatedAt: string
}

/** Song row inside a playlist, in playlist order. */
export type PlaylistSong = {
  songId: string
  title: string
  artist: string
  username: string
  slug: string
  originalKey: string
  status: SongStatus
}

export type PlaylistDetail = PlaylistSummary & {
  songIds: string[]
  songs: PlaylistSong[]
}

export type PlaylistInput = {
  name: string
  description: string
}

function mutationError(
  message: string,
  code?: string,
): SongMutationResult<never> {
  return { data: null, error: { message, code } }
}

type PlaylistRow = {
  id: string
  name: string
  description: string
  song_ids: string[] | null
  updated_at: string
}

const PLAYLIST_SELECT = 'id, name, description, song_ids, updated_at'

function mapSummary(row: PlaylistRow): PlaylistSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    songCount: row.song_ids?.length ?? 0,
    updatedAt: row.updated_at,
  }
}

function validateInput(
  input: PlaylistInput,
): SongMutationResult<never> | null {
  const name = input.name.trim()
  if (!name) return mutationError('Name is required', 'invalid_name')
  if (name.length > PLAYLIST_NAME_MAX) {
    return mutationError(
      `Name must be at most ${PLAYLIST_NAME_MAX} characters`,
      'invalid_name',
    )
  }
  if (input.description.length > PLAYLIST_DESCRIPTION_MAX) {
    return mutationError(
      `Description must be at most ${PLAYLIST_DESCRIPTION_MAX} characters`,
      'invalid_description',
    )
  }
  return null
}

/** User's playlists, most recently updated first. */
export async function listPlaylists(
  supabase: SongbookClient,
  userId: string,
  options: { limit?: number } = {},
): Promise<PlaylistSummary[]> {
  let query = supabase
    .from('playlists')
    .select(PLAYLIST_SELECT)
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false })
  if (options.limit) query = query.limit(options.limit)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapSummary)
}

/** Ids of the user's playlists that already contain the song. */
export async function listPlaylistIdsContainingSong(
  supabase: SongbookClient,
  userId: string,
  songId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('playlists')
    .select('id')
    .eq('owner_id', userId)
    .contains('song_ids', [songId])
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => row.id)
}

type SongJoinRow = {
  id: string
  title: string
  artist: string
  slug: string
  original_key: string
  status: SongStatus
  profiles: { username: string } | { username: string }[] | null
}

/**
 * Playlist with its songs resolved in playlist order. Songs the viewer can no
 * longer read (deleted, or unpublished by someone else) are dropped.
 */
export async function getPlaylistWithSongs(
  supabase: SongbookClient,
  playlistId: string,
): Promise<PlaylistDetail | null> {
  const { data: row, error } = await supabase
    .from('playlists')
    .select(PLAYLIST_SELECT)
    .eq('id', playlistId)
    .maybeSingle()
  if (error) {
    // Malformed uuid in the URL behaves like a missing playlist.
    if (error.code === '22P02') return null
    throw new Error(error.message)
  }
  if (!row) return null

  const songIds = row.song_ids ?? []
  let songs: PlaylistSong[] = []
  if (songIds.length > 0) {
    const { data: songRows, error: songsError } = await supabase
      .from('songs')
      .select(
        'id, title, artist, slug, original_key, status, profiles!songs_owner_id_fkey ( username )',
      )
      .in('id', songIds)
    if (songsError) throw new Error(songsError.message)

    const byId = new Map<string, PlaylistSong>()
    for (const song of (songRows ?? []) as SongJoinRow[]) {
      const profile = Array.isArray(song.profiles)
        ? song.profiles[0]
        : song.profiles
      if (!profile?.username) continue
      byId.set(song.id, {
        songId: song.id,
        title: song.title,
        artist: song.artist,
        username: profile.username,
        slug: song.slug,
        originalKey: song.original_key,
        status: song.status,
      })
    }
    songs = songIds
      .map((id) => byId.get(id))
      .filter((song): song is PlaylistSong => song != null)
  }

  return { ...mapSummary(row), songIds, songs }
}

export async function createPlaylist(
  supabase: SongbookClient,
  userId: string,
  input: PlaylistInput,
  initialSongIds: string[] = [],
): Promise<SongMutationResult<PlaylistSummary>> {
  const invalid = validateInput(input)
  if (invalid) return invalid

  const { data, error } = await supabase
    .from('playlists')
    .insert({
      owner_id: userId,
      name: input.name.trim(),
      description: input.description.trim(),
      song_ids: [...new Set(initialSongIds)],
    })
    .select(PLAYLIST_SELECT)
    .single()
  if (error) return mutationError(error.message, error.code)
  return { data: mapSummary(data), error: null }
}

export async function updatePlaylist(
  supabase: SongbookClient,
  playlistId: string,
  input: PlaylistInput,
): Promise<SongMutationResult<PlaylistSummary>> {
  const invalid = validateInput(input)
  if (invalid) return invalid

  const { data, error } = await supabase
    .from('playlists')
    .update({
      name: input.name.trim(),
      description: input.description.trim(),
    })
    .eq('id', playlistId)
    .select(PLAYLIST_SELECT)
    .maybeSingle()
  if (error) return mutationError(error.message, error.code)
  if (!data) return mutationError('Playlist not found', 'not_found')
  return { data: mapSummary(data), error: null }
}

export async function deletePlaylist(
  supabase: SongbookClient,
  playlistId: string,
): Promise<SongMutationResult<{ ok: true }>> {
  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', playlistId)
  if (error) return mutationError(error.message, error.code)
  return { data: { ok: true }, error: null }
}

async function readSongIds(
  supabase: SongbookClient,
  playlistId: string,
): Promise<SongMutationResult<string[]>> {
  const { data, error } = await supabase
    .from('playlists')
    .select('song_ids')
    .eq('id', playlistId)
    .maybeSingle()
  if (error) return mutationError(error.message, error.code)
  if (!data) return mutationError('Playlist not found', 'not_found')
  return { data: data.song_ids ?? [], error: null }
}

async function writeSongIds(
  supabase: SongbookClient,
  playlistId: string,
  songIds: string[],
): Promise<SongMutationResult<string[]>> {
  const { data, error } = await supabase
    .from('playlists')
    .update({ song_ids: songIds })
    .eq('id', playlistId)
    .select('song_ids')
    .maybeSingle()
  if (error) return mutationError(error.message, error.code)
  if (!data) return mutationError('Playlist not found', 'not_found')
  return { data: data.song_ids ?? [], error: null }
}

/** Append a song (no-op if already present). Returns the new song id order. */
export async function addSongToPlaylist(
  supabase: SongbookClient,
  playlistId: string,
  songId: string,
): Promise<SongMutationResult<string[]>> {
  const current = await readSongIds(supabase, playlistId)
  if (current.error || !current.data) return current
  if (current.data.includes(songId)) return current
  return writeSongIds(supabase, playlistId, [...current.data, songId])
}

export async function removeSongFromPlaylist(
  supabase: SongbookClient,
  playlistId: string,
  songId: string,
): Promise<SongMutationResult<string[]>> {
  const current = await readSongIds(supabase, playlistId)
  if (current.error || !current.data) return current
  return writeSongIds(
    supabase,
    playlistId,
    current.data.filter((id) => id !== songId),
  )
}

/**
 * Save a new order. Ids missing from `orderedSongIds` (e.g. songs hidden from
 * the viewer) keep their relative order at the end; unknown ids are dropped.
 */
export async function reorderPlaylistSongs(
  supabase: SongbookClient,
  playlistId: string,
  orderedSongIds: string[],
): Promise<SongMutationResult<string[]>> {
  const current = await readSongIds(supabase, playlistId)
  if (current.error || !current.data) return current

  const known = new Set(current.data)
  const seen = new Set<string>()
  const next: string[] = []
  for (const id of orderedSongIds) {
    if (!known.has(id) || seen.has(id)) continue
    seen.add(id)
    next.push(id)
  }
  for (const id of current.data) {
    if (!seen.has(id)) next.push(id)
  }
  return writeSongIds(supabase, playlistId, next)
}
