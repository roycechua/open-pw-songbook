import { createServerFn } from '@tanstack/react-start'
import { createClient } from '#/lib/supabase/server'
import { isSupabaseConfigured } from '#/lib/supabase/env'
import {
  getParsedSongByUsernameSlug,
  getSongByUsernameSlug,
  listMySongs,
  listPublishedSongs,
} from './songs'

export type SessionProfile = {
  userId: string
  username: string
  email: string
}

/**
 * Authenticated user id from the verified JWT claims. Verifies locally when the
 * project uses asymmetric signing keys (no Auth round trip); otherwise falls
 * back to the Auth server. Returns null for guests.
 */
async function getUserId(
  supabase: ReturnType<typeof createClient>,
): Promise<string | null> {
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims.sub) return null
  return data.claims.sub
}

/** Current auth user + profile, or null if signed out / env missing. */
export const getSessionProfile = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SessionProfile | null> => {
    if (!isSupabaseConfigured()) return null

    try {
      const supabase = createClient()
      const userId = await getUserId(supabase)
      if (!userId) return null

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username, email')
        .eq('id', userId)
        .maybeSingle()

      if (error || !profile) return null

      return {
        userId: profile.id,
        username: profile.username,
        email: profile.email,
      }
    } catch {
      return null
    }
  },
)

export const loadPublishedSongs = createServerFn({ method: 'GET' }).handler(
  async () => {
    if (!isSupabaseConfigured()) return []

    try {
      const supabase = createClient()
      return await listPublishedSongs(supabase)
    } catch {
      // Missing/unreachable Supabase — keep catalog usable as empty guest view.
      return []
    }
  },
)

export const loadMySongs = createServerFn({ method: 'GET' }).handler(
  async () => {
    if (!isSupabaseConfigured()) {
      return { session: null as SessionProfile | null, songs: [] }
    }

    try {
      const supabase = createClient()
      const userId = await getUserId(supabase)
      if (!userId) return { session: null as SessionProfile | null, songs: [] }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, email')
        .eq('id', userId)
        .maybeSingle()

      if (!profile) return { session: null as SessionProfile | null, songs: [] }

      const session: SessionProfile = {
        userId: profile.id,
        username: profile.username,
        email: profile.email,
      }
      const songs = await listMySongs(supabase, profile.id)
      return { session, songs }
    } catch {
      return { session: null as SessionProfile | null, songs: [] }
    }
  },
)

export const loadSongByUsernameSlug = createServerFn({ method: 'GET' })
  .validator((data: { username: string; slug: string }) => data)
  .handler(async ({ data }) => {
    if (!isSupabaseConfigured()) return null

    try {
      const supabase = createClient()
      const [parsed, userId] = await Promise.all([
        getParsedSongByUsernameSlug(supabase, data.username, data.slug),
        getUserId(supabase).catch(() => null),
      ])
      if (!parsed) return null

      const isOwner = Boolean(userId && userId === parsed.meta.ownerId)

      return { ...parsed, isOwner }
    } catch {
      return null
    }
  })

export const loadSongForEdit = createServerFn({ method: 'GET' })
  .validator((data: { username: string; slug: string }) => data)
  .handler(async ({ data }) => {
    if (!isSupabaseConfigured()) return { kind: 'unauthenticated' as const }

    try {
      const supabase = createClient()
      const userId = await getUserId(supabase)
      if (!userId) return { kind: 'unauthenticated' as const }

      const [song, { data: profile }] = await Promise.all([
        getSongByUsernameSlug(supabase, data.username, data.slug),
        supabase
          .from('profiles')
          .select('username, email')
          .eq('id', userId)
          .maybeSingle(),
      ])
      if (!song) return { kind: 'not_found' as const }
      if (song.ownerId !== userId) return { kind: 'forbidden' as const }

      return {
        kind: 'ok' as const,
        song,
        session: {
          userId,
          username: profile?.username ?? song.username,
          email: profile?.email ?? '',
        } satisfies SessionProfile,
      }
    } catch {
      return { kind: 'unauthenticated' as const }
    }
  })
