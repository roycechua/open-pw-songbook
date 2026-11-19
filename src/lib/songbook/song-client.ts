import { createClient } from '#/lib/supabase/client'
import { isSupabaseConfigured } from '#/lib/supabase/env'
import {
  getParsedSongByUsernameSlug,
  listMySongs,
  listPublishedSongs,
} from './songs'
import type {
  HomeExtras,
  PlaylistLoadResult,
  SessionProfile,
} from './song-server'
import type { SongListItem } from './types'
import {
  getOrCreateUserSettings,
  type UserSettingsRow,
} from './user-settings'
import { listFavoriteSongIds } from './playlist'
import {
  HOME_PLAYLIST_PREVIEW_LIMIT,
  getPlaylistWithSongs,
  listPlaylists,
  type PlaylistSummary,
} from './playlists'

/**
 * Browser-side equivalents of the loaders in `song-server.ts`.
 *
 * The app server runs far from Supabase, so on client navigations these talk
 * to Supabase directly (RLS still enforces access). SSR / first load keeps
 * using the server functions. Return shapes match the server versions.
 */

/** Signed-in user id from the local session (UI-only; RLS enforces access). */
async function getSessionUserId(
  supabase: ReturnType<typeof createClient>,
): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

export async function loadPublishedSongsClient(): Promise<SongListItem[]> {
  if (!isSupabaseConfigured()) return []

  try {
    return await listPublishedSongs(createClient())
  } catch {
    return []
  }
}

export async function loadMySongsClient(): Promise<{
  session: SessionProfile | null
  songs: SongListItem[]
  favoriteSongIds: string[]
}> {
  const empty = {
    session: null as SessionProfile | null,
    songs: [],
    favoriteSongIds: [],
  }
  if (!isSupabaseConfigured()) return empty

  try {
    const supabase = createClient()
    const userId = await getSessionUserId(supabase)
    if (!userId) return empty

    const [{ data: profile }, songs, favoriteSongIds] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, email')
        .eq('id', userId)
        .maybeSingle(),
      listMySongs(supabase, userId),
      listFavoriteSongIds(supabase, userId).catch(() => []),
    ])
    if (!profile) return empty

    return {
      session: {
        userId: profile.id,
        username: profile.username,
        email: profile.email,
      },
      songs,
      favoriteSongIds,
    }
  } catch {
    return empty
  }
}

export async function loadHomeExtrasClient(): Promise<HomeExtras> {
  const empty: HomeExtras = { playlists: [], favoriteSongIds: [] }
  if (!isSupabaseConfigured()) return empty

  try {
    const supabase = createClient()
    const userId = await getSessionUserId(supabase)
    if (!userId) return empty

    const [playlists, favoriteSongIds] = await Promise.all([
      listPlaylists(supabase, userId, {
        limit: HOME_PLAYLIST_PREVIEW_LIMIT,
      }).catch(() => []),
      listFavoriteSongIds(supabase, userId).catch(() => []),
    ])
    return { playlists, favoriteSongIds }
  } catch {
    return empty
  }
}

export async function loadPlaylistsClient(): Promise<{
  userId: string | null
  playlists: PlaylistSummary[]
}> {
  if (!isSupabaseConfigured()) return { userId: null, playlists: [] }

  try {
    const supabase = createClient()
    const userId = await getSessionUserId(supabase)
    if (!userId) return { userId: null, playlists: [] }
    return { userId, playlists: await listPlaylists(supabase, userId) }
  } catch {
    return { userId: null, playlists: [] }
  }
}

export async function loadPlaylistClient(
  playlistId: string,
): Promise<PlaylistLoadResult> {
  if (!isSupabaseConfigured()) return { kind: 'unauthenticated' }

  try {
    const supabase = createClient()
    const userId = await getSessionUserId(supabase)
    if (!userId) return { kind: 'unauthenticated' }

    const playlist = await getPlaylistWithSongs(supabase, playlistId)
    if (!playlist) return { kind: 'not_found' }
    return { kind: 'ok', playlist }
  } catch {
    return { kind: 'not_found' }
  }
}

export async function loadSongClient(username: string, slug: string) {
  if (!isSupabaseConfigured()) return null

  try {
    const supabase = createClient()
    const [parsed, userId] = await Promise.all([
      getParsedSongByUsernameSlug(supabase, username, slug),
      getSessionUserId(supabase).catch(() => null),
    ])
    if (!parsed) return null

    const isOwner = Boolean(userId && userId === parsed.meta.ownerId)
    return { ...parsed, isOwner }
  } catch {
    return null
  }
}

export async function loadUserSettingsClient(): Promise<{
  session: SessionProfile | null
  settings: UserSettingsRow | null
}> {
  const empty = {
    session: null as SessionProfile | null,
    settings: null as UserSettingsRow | null,
  }
  if (!isSupabaseConfigured()) return empty

  try {
    const supabase = createClient()
    const userId = await getSessionUserId(supabase)
    if (!userId) return empty

    const [{ data: profile }, settings] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, email')
        .eq('id', userId)
        .maybeSingle(),
      getOrCreateUserSettings(supabase, userId),
    ])
    if (!profile) return empty

    return {
      session: {
        userId: profile.id,
        username: profile.username,
        email: profile.email,
      },
      settings,
    }
  } catch {
    return empty
  }
}
