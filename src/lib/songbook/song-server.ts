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

/** Current auth user + profile, or null if signed out / env missing. */
export const getSessionProfile = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SessionProfile | null> => {
    if (!isSupabaseConfigured()) return null

    try {
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) return null

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username, email')
        .eq('id', user.id)
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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return { session: null as SessionProfile | null, songs: [] }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, email')
        .eq('id', user.id)
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
      const parsed = await getParsedSongByUsernameSlug(
        supabase,
        data.username,
        data.slug,
      )
      if (!parsed) return null

      const {
        data: { user },
      } = await supabase.auth.getUser()
      const isOwner = Boolean(user && user.id === parsed.meta.ownerId)

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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return { kind: 'unauthenticated' as const }

      const song = await getSongByUsernameSlug(
        supabase,
        data.username,
        data.slug,
      )
      if (!song) return { kind: 'not_found' as const }
      if (song.ownerId !== user.id) return { kind: 'forbidden' as const }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, email')
        .eq('id', user.id)
        .maybeSingle()

      return {
        kind: 'ok' as const,
        song,
        session: {
          userId: user.id,
          username: profile?.username ?? song.username,
          email: profile?.email ?? '',
        } satisfies SessionProfile,
      }
    } catch {
      return { kind: 'unauthenticated' as const }
    }
  })
