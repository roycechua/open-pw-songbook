import { createClient } from '#/lib/supabase/client'
import { isSupabaseConfigured } from '#/lib/supabase/env'
import {
  getParsedSongByUsernameSlug,
  listMySongs,
  listPublishedSongs,
} from './songs'
import type { SessionProfile } from './song-server'
import type { SongListItem } from './types'

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
}> {
  const empty = { session: null as SessionProfile | null, songs: [] }
  if (!isSupabaseConfigured()) return empty

  try {
    const supabase = createClient()
    const userId = await getSessionUserId(supabase)
    if (!userId) return empty

    const [{ data: profile }, songs] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, email')
        .eq('id', userId)
        .maybeSingle(),
      listMySongs(supabase, userId),
    ])
    if (!profile) return empty

    return {
      session: {
        userId: profile.id,
        username: profile.username,
        email: profile.email,
      },
      songs,
    }
  } catch {
    return empty
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
