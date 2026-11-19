import type { SongbookClient } from '#/lib/supabase/auth'
import type {
  UserSettings,
  UserSongSettings,
} from '#/lib/supabase/database.types'
import type { SongMutationResult } from './songs'
import {
  SWIPE_DIRECTION_DEFAULT,
  TEXT_SCALE_DEFAULT,
  clampTextScale,
  loadSwipeDirection,
  loadTextScale,
  type SwipeDirection,
} from './view-prefs'

export type ViewerPrefs = {
  textScale: number
  swipeDirection: SwipeDirection
}

export type UserSettingsRow = {
  userId: string
  textScale: number
  swipeDirection: SwipeDirection
  rememberPerSong: boolean
  updatedAt: string
}

export type UserSongSettingsRow = {
  userId: string
  songId: string
  textScale: number | null
  swipeDirection: SwipeDirection | null
  updatedAt: string
}

export type UserSettingsPatch = {
  textScale?: number
  swipeDirection?: SwipeDirection
  rememberPerSong?: boolean
}

export type SongSettingsPatch = {
  textScale?: number | null
  swipeDirection?: SwipeDirection | null
}

function mutationError(
  message: string,
  code?: string,
): SongMutationResult<never> {
  return { data: null, error: { message, code } }
}

function parseSwipeDirection(value: string | null | undefined): SwipeDirection {
  return value === 'vertical' ? 'vertical' : 'horizontal'
}

function mapUserSettings(row: UserSettings): UserSettingsRow {
  return {
    userId: row.user_id,
    textScale: clampTextScale(Number(row.text_scale)),
    swipeDirection: parseSwipeDirection(row.swipe_direction),
    rememberPerSong: Boolean(row.remember_per_song),
    updatedAt: row.updated_at,
  }
}

function mapSongSettings(row: UserSongSettings): UserSongSettingsRow {
  return {
    userId: row.user_id,
    songId: row.song_id,
    textScale:
      row.text_scale == null ? null : clampTextScale(Number(row.text_scale)),
    swipeDirection:
      row.swipe_direction == null
        ? null
        : parseSwipeDirection(row.swipe_direction),
    updatedAt: row.updated_at,
  }
}

function localSeedDefaults(): ViewerPrefs {
  return {
    textScale: loadTextScale(),
    swipeDirection: loadSwipeDirection(),
  }
}

/** Resolve effective viewer prefs for guests or signed-in users. */
export function resolveViewerPrefs(input: {
  userId: string | null | undefined
  global: UserSettingsRow | null
  songOverride: UserSongSettingsRow | null
}): ViewerPrefs {
  if (!input.userId || !input.global) {
    return localSeedDefaults()
  }

  const base: ViewerPrefs = {
    textScale: input.global.textScale,
    swipeDirection: input.global.swipeDirection,
  }

  if (!input.global.rememberPerSong || !input.songOverride) {
    return base
  }

  return {
    textScale: input.songOverride.textScale ?? base.textScale,
    swipeDirection: input.songOverride.swipeDirection ?? base.swipeDirection,
  }
}

/** Load settings row; create one seeded from localStorage when missing. */
export async function getOrCreateUserSettings(
  supabase: SongbookClient,
  userId: string,
): Promise<UserSettingsRow> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  if (data) {
    return mapUserSettings(data)
  }

  // Avoid inserting during SSR so the first client create can seed from
  // localStorage instead of server defaults.
  if (typeof window === 'undefined') {
    return {
      userId,
      textScale: TEXT_SCALE_DEFAULT,
      swipeDirection: SWIPE_DIRECTION_DEFAULT,
      rememberPerSong: false,
      updatedAt: new Date(0).toISOString(),
    }
  }

  const seed = localSeedDefaults()
  const { data: inserted, error: insertError } = await supabase
    .from('user_settings')
    .insert({
      user_id: userId,
      text_scale: seed.textScale,
      swipe_direction: seed.swipeDirection,
      remember_per_song: false,
    })
    .select('*')
    .single()

  if (insertError) {
    // Race: another tab may have inserted first.
    const { data: retry, error: retryError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (retryError) throw new Error(retryError.message)
    if (retry) return mapUserSettings(retry)
    throw new Error(insertError.message)
  }

  return mapUserSettings(inserted)
}

export async function updateUserSettings(
  supabase: SongbookClient,
  userId: string,
  patch: UserSettingsPatch,
): Promise<SongMutationResult<UserSettingsRow>> {
  const update: {
    text_scale?: number
    swipe_direction?: SwipeDirection
    remember_per_song?: boolean
  } = {}

  if (patch.textScale != null) {
    update.text_scale = clampTextScale(patch.textScale)
  }
  if (patch.swipeDirection != null) {
    update.swipe_direction = patch.swipeDirection
  }
  if (patch.rememberPerSong != null) {
    update.remember_per_song = patch.rememberPerSong
  }

  if (Object.keys(update).length === 0) {
    try {
      const current = await getOrCreateUserSettings(supabase, userId)
      return { data: current, error: null }
    } catch (err) {
      return mutationError(
        err instanceof Error ? err.message : 'Could not load settings',
      )
    }
  }

  // Ensure row exists before update.
  try {
    await getOrCreateUserSettings(supabase, userId)
  } catch (err) {
    return mutationError(
      err instanceof Error ? err.message : 'Could not create settings',
    )
  }

  const { data, error } = await supabase
    .from('user_settings')
    .update(update)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error || !data) {
    return mutationError(error?.message ?? 'Could not update settings', error?.code)
  }

  return { data: mapUserSettings(data), error: null }
}

export async function getSongSettings(
  supabase: SongbookClient,
  userId: string,
  songId: string,
): Promise<UserSongSettingsRow | null> {
  const { data, error } = await supabase
    .from('user_song_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('song_id', songId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  return data ? mapSongSettings(data) : null
}

export async function upsertSongSettings(
  supabase: SongbookClient,
  userId: string,
  songId: string,
  patch: SongSettingsPatch,
): Promise<SongMutationResult<UserSongSettingsRow>> {
  const textScale =
    patch.textScale === undefined
      ? undefined
      : patch.textScale == null
        ? null
        : clampTextScale(patch.textScale)
  const swipeDirection =
    patch.swipeDirection === undefined ? undefined : patch.swipeDirection

  if (textScale === undefined && swipeDirection === undefined) {
    return mutationError('Nothing to save for song settings')
  }

  // Merge with existing so we never wipe the other field accidentally.
  let existing: UserSongSettingsRow | null = null
  try {
    existing = await getSongSettings(supabase, userId, songId)
  } catch (err) {
    return mutationError(
      err instanceof Error ? err.message : 'Could not load song settings',
    )
  }

  const nextTextScale =
    textScale !== undefined ? textScale : (existing?.textScale ?? null)
  const nextSwipe =
    swipeDirection !== undefined
      ? swipeDirection
      : (existing?.swipeDirection ?? null)

  if (nextTextScale == null && nextSwipe == null) {
    return mutationError('Song settings must include at least one preference')
  }

  const { data, error } = await supabase
    .from('user_song_settings')
    .upsert(
      {
        user_id: userId,
        song_id: songId,
        text_scale: nextTextScale,
        swipe_direction: nextSwipe,
      },
      { onConflict: 'user_id,song_id' },
    )
    .select('*')
    .single()

  if (error || !data) {
    return mutationError(
      error?.message ?? 'Could not save song settings',
      error?.code,
    )
  }

  return { data: mapSongSettings(data), error: null }
}

/** Load global (+ optional song override) and resolve effective prefs. */
export async function loadResolvedViewerPrefs(
  supabase: SongbookClient,
  userId: string,
  songId?: string | null,
): Promise<{
  global: UserSettingsRow
  songOverride: UserSongSettingsRow | null
  effective: ViewerPrefs
}> {
  const global = await getOrCreateUserSettings(supabase, userId)
  let songOverride: UserSongSettingsRow | null = null
  if (global.rememberPerSong && songId) {
    songOverride = await getSongSettings(supabase, userId, songId)
  }
  return {
    global,
    songOverride,
    effective: resolveViewerPrefs({ userId, global, songOverride }),
  }
}

export function defaultViewerPrefs(): ViewerPrefs {
  return {
    textScale: TEXT_SCALE_DEFAULT,
    swipeDirection: SWIPE_DIRECTION_DEFAULT,
  }
}
