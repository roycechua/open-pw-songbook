import type { SongStatus } from '#/lib/supabase/database.types'
import type { SongbookClient } from '#/lib/supabase/auth'
import { parseChordPro } from './parse'
import type { ParsedSong, SongListItem, SongMeta } from './types'

export type SongWriteInput = {
  title: string
  artist: string
  originalKey: string
  slug: string
  chordPro: string
  status: SongStatus
}

export type SongMutationResult<T> = {
  data: T | null
  error: { message: string; code?: string } | null
}

/** URL-safe slug: lowercase alphanumeric segments joined by hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function slugifyTitle(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return slug || 'song'
}

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug)
}

function mutationError(
  message: string,
  code?: string,
): SongMutationResult<never> {
  return { data: null, error: { message, code } }
}

function mapListRow(row: {
  id: string
  owner_id: string
  slug: string
  title: string
  artist: string
  original_key: string
  status: SongStatus
  profiles: { username: string } | { username: string }[] | null
}): SongListItem {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return {
    id: row.id,
    ownerId: row.owner_id,
    username: profile?.username ?? '',
    slug: row.slug,
    title: row.title,
    artist: row.artist,
    originalKey: row.original_key,
    status: row.status,
  }
}

function mapSongRow(
  row: {
    id: string
    owner_id: string
    slug: string
    title: string
    artist: string
    original_key: string
    chord_pro: string
    status: SongStatus
  },
  username: string,
): SongMeta {
  return {
    id: row.id,
    ownerId: row.owner_id,
    username,
    slug: row.slug,
    title: row.title,
    artist: row.artist,
    originalKey: row.original_key,
    chordPro: row.chord_pro,
    status: row.status,
  }
}

export function parseSongMeta(meta: SongMeta): {
  meta: SongMeta
  parsed: ParsedSong
} {
  const parsed = parseChordPro(meta.chordPro)
  return {
    meta,
    parsed: {
      ...parsed,
      title: parsed.title || meta.title,
      artist: parsed.artist || meta.artist,
      key: parsed.key || meta.originalKey,
    },
  }
}

/** All published songs with author username (public catalog). */
export async function listPublishedSongs(
  supabase: SongbookClient,
): Promise<SongListItem[]> {
  const { data, error } = await supabase
    .from('songs')
    .select(
      'id, owner_id, slug, title, artist, original_key, status, profiles!songs_owner_id_fkey ( username )',
    )
    .eq('status', 'published')
    .order('title', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(mapListRow)
}

/** Current user's songs (drafts + published). */
export async function listMySongs(
  supabase: SongbookClient,
  ownerId: string,
): Promise<SongListItem[]> {
  const { data, error } = await supabase
    .from('songs')
    .select(
      'id, owner_id, slug, title, artist, original_key, status, profiles!songs_owner_id_fkey ( username )',
    )
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(mapListRow)
}

/**
 * Resolve song by author username + slug.
 * RLS: published for anyone; drafts only for owner.
 */
export async function getSongByUsernameSlug(
  supabase: SongbookClient,
  username: string,
  slug: string,
): Promise<SongMeta | null> {
  const normalized = username.trim().toLowerCase()
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', normalized)
    .maybeSingle()

  if (profileError) {
    throw new Error(profileError.message)
  }
  if (!profile) return null

  const { data: song, error: songError } = await supabase
    .from('songs')
    .select(
      'id, owner_id, slug, title, artist, original_key, chord_pro, status',
    )
    .eq('owner_id', profile.id)
    .eq('slug', slug)
    .maybeSingle()

  if (songError) {
    throw new Error(songError.message)
  }
  if (!song) return null

  return mapSongRow(song, profile.username)
}

export async function getParsedSongByUsernameSlug(
  supabase: SongbookClient,
  username: string,
  slug: string,
) {
  const meta = await getSongByUsernameSlug(supabase, username, slug)
  if (!meta) return null
  return parseSongMeta(meta)
}

function validateWriteInput(
  input: SongWriteInput,
): SongMutationResult<never> | null {
  const title = input.title.trim()
  const slug = input.slug.trim().toLowerCase()
  if (!title) {
    return mutationError('Title is required', 'invalid_title')
  }
  if (!isValidSlug(slug)) {
    return mutationError(
      'Slug must be lowercase letters, numbers, and hyphens',
      'invalid_slug',
    )
  }
  if (input.status !== 'draft' && input.status !== 'published') {
    return mutationError('Status must be draft or published', 'invalid_status')
  }
  // Ensure ChordPro is parseable (parser is lenient; still require body).
  if (!input.chordPro.trim()) {
    return mutationError('ChordPro body is required', 'invalid_chordpro')
  }
  parseChordPro(input.chordPro)
  return null
}

export async function createSong(
  supabase: SongbookClient,
  ownerId: string,
  input: SongWriteInput,
): Promise<SongMutationResult<SongMeta>> {
  const invalid = validateWriteInput(input)
  if (invalid) return invalid

  const slug = input.slug.trim().toLowerCase()
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', ownerId)
    .maybeSingle()

  if (profileError) {
    return mutationError(profileError.message, profileError.code)
  }
  if (!profile) {
    return mutationError('Profile not found', 'profile_not_found')
  }

  const { data, error } = await supabase
    .from('songs')
    .insert({
      owner_id: ownerId,
      slug,
      title: input.title.trim(),
      artist: input.artist.trim(),
      original_key: input.originalKey.trim() || 'C',
      chord_pro: input.chordPro,
      status: input.status,
    })
    .select(
      'id, owner_id, slug, title, artist, original_key, chord_pro, status',
    )
    .single()

  if (error) {
    if (error.code === '23505') {
      return mutationError('You already have a song with that slug', 'slug_taken')
    }
    return mutationError(error.message, error.code)
  }

  return { data: mapSongRow(data, profile.username), error: null }
}

export async function updateSong(
  supabase: SongbookClient,
  songId: string,
  input: SongWriteInput,
): Promise<SongMutationResult<SongMeta>> {
  const invalid = validateWriteInput(input)
  if (invalid) return invalid

  const slug = input.slug.trim().toLowerCase()
  const { data, error } = await supabase
    .from('songs')
    .update({
      slug,
      title: input.title.trim(),
      artist: input.artist.trim(),
      original_key: input.originalKey.trim() || 'C',
      chord_pro: input.chordPro,
      status: input.status,
    })
    .eq('id', songId)
    .select(
      'id, owner_id, slug, title, artist, original_key, chord_pro, status, profiles!songs_owner_id_fkey ( username )',
    )
    .maybeSingle()

  if (error) {
    if (error.code === '23505') {
      return mutationError('You already have a song with that slug', 'slug_taken')
    }
    return mutationError(error.message, error.code)
  }
  if (!data) {
    return mutationError('Song not found or not owned by you', 'not_found')
  }

  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles
  return {
    data: mapSongRow(data, profile?.username ?? ''),
    error: null,
  }
}

export async function deleteSong(
  supabase: SongbookClient,
  songId: string,
): Promise<SongMutationResult<{ ok: true }>> {
  const { error } = await supabase.from('songs').delete().eq('id', songId)
  if (error) {
    return mutationError(error.message, error.code)
  }
  return { data: { ok: true }, error: null }
}

/** Browser helper: download ChordPro source as `{slug}.chordpro`. */
export function downloadChordPro(slug: string, chordPro: string) {
  const safe = isValidSlug(slug) ? slug : slugifyTitle(slug)
  const blob = new Blob([chordPro], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${safe}.chordpro`
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
