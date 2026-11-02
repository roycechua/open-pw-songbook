import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from './database.types'

export type SongbookClient = SupabaseClient<Database>

/** Username: lowercase letters, digits, underscore; 3–20 chars. */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/

export type AuthResult<T> = {
  data: T | null
  error: { message: string; code?: string } | null
}

export type SignUpInput = {
  username: string
  email: string
  password: string
  /** Absolute URL for optional email confirm redirect (e.g. /auth/callback). */
  emailRedirectTo?: string
}

export type SignInInput = {
  /** Username or email. */
  identifier: string
  password: string
}

function authError(message: string, code?: string): AuthResult<never> {
  return { data: null, error: { message, code } }
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(normalizeUsername(username))
}

function looksLikeEmail(value: string): boolean {
  return value.includes('@')
}

/**
 * Resolve login identifier to the email Supabase Auth expects.
 * Username → profiles.email (public read); email passed through.
 */
export async function resolveLoginEmail(
  supabase: SongbookClient,
  identifier: string,
): Promise<AuthResult<{ email: string }>> {
  const trimmed = identifier.trim()
  if (!trimmed) {
    return authError('Email or username is required')
  }

  if (looksLikeEmail(trimmed)) {
    return { data: { email: trimmed.toLowerCase() }, error: null }
  }

  const username = normalizeUsername(trimmed)
  if (!isValidUsername(username)) {
    return authError('Invalid username')
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('username', username)
    .maybeSingle()

  if (error) {
    return authError(error.message, error.code)
  }
  if (!data?.email) {
    return authError('No account found for that username', 'username_not_found')
  }

  return { data: { email: data.email }, error: null }
}

/**
 * Sign up with username + email + password.
 * Profile row is created by the `handle_new_user` trigger from user metadata.
 * Email verification is optional (Confirm email OFF in Dashboard).
 */
export async function signUp(
  supabase: SongbookClient,
  input: SignUpInput,
): Promise<AuthResult<{ userId: string | null; needsEmailVerification: boolean }>> {
  const username = normalizeUsername(input.username)
  const email = input.email.trim().toLowerCase()
  const password = input.password

  if (!isValidUsername(username)) {
    return authError(
      'Username must be 3–20 characters: lowercase letters, numbers, underscore',
      'invalid_username',
    )
  }
  if (!email || !looksLikeEmail(email)) {
    return authError('A valid email is required', 'invalid_email')
  }
  if (!password || password.length < 6) {
    return authError('Password must be at least 6 characters', 'invalid_password')
  }

  const existing = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (existing.error) {
    return authError(existing.error.message, existing.error.code)
  }
  if (existing.data) {
    return authError('Username is already taken', 'username_taken')
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: input.emailRedirectTo,
    },
  })

  if (error) {
    return authError(error.message, error.code)
  }

  return {
    data: {
      userId: data.user?.id ?? null,
      needsEmailVerification: !data.user?.email_confirmed_at,
    },
    error: null,
  }
}

/** Sign in with username or email + password. */
export async function signIn(
  supabase: SongbookClient,
  input: SignInInput,
): Promise<AuthResult<{ userId: string }>> {
  const resolved = await resolveLoginEmail(supabase, input.identifier)
  if (resolved.error || !resolved.data) {
    return authError(resolved.error?.message ?? 'Login failed', resolved.error?.code)
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: resolved.data.email,
    password: input.password,
  })

  if (error) {
    return authError(error.message, error.code)
  }
  if (!data.user) {
    return authError('Login failed')
  }

  return { data: { userId: data.user.id }, error: null }
}

export async function signOut(
  supabase: SongbookClient,
): Promise<AuthResult<{ ok: true }>> {
  const { error } = await supabase.auth.signOut()
  if (error) {
    return authError(error.message, error.code)
  }
  return { data: { ok: true }, error: null }
}

/** Optional: resend signup confirmation email for the current user. */
export async function resendVerificationEmail(
  supabase: SongbookClient,
  options?: { emailRedirectTo?: string },
): Promise<AuthResult<{ ok: true }>> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) {
    return authError(userError.message, userError.code)
  }
  const email = userData.user?.email
  if (!email) {
    return authError('No signed-in user email to verify', 'no_email')
  }

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: options?.emailRedirectTo,
    },
  })

  if (error) {
    return authError(error.message, error.code)
  }
  return { data: { ok: true }, error: null }
}

/**
 * Request a password-reset email.
 * Only works after the account email is verified (Supabase Auth rule).
 * Callers should surface UX copy when the user is unverified.
 */
export async function resetPasswordForEmail(
  supabase: SongbookClient,
  email: string,
  options?: { redirectTo?: string },
): Promise<AuthResult<{ ok: true }>> {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed || !looksLikeEmail(trimmed)) {
    return authError('A valid email is required', 'invalid_email')
  }

  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: options?.redirectTo,
  })

  if (error) {
    return authError(error.message, error.code)
  }
  return { data: { ok: true }, error: null }
}

/** Whether the current session user's email is confirmed (password reset available). */
export async function getEmailVerified(
  supabase: SongbookClient,
): Promise<AuthResult<{ verified: boolean; email: string | null }>> {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    return authError(error.message, error.code)
  }
  const user = data.user
  if (!user) {
    return { data: { verified: false, email: null }, error: null }
  }
  return {
    data: {
      verified: Boolean(user.email_confirmed_at),
      email: user.email ?? null,
    },
    error: null,
  }
}

/** Set a new password when a recovery (or active) session is present. */
export async function updatePassword(
  supabase: SongbookClient,
  password: string,
): Promise<AuthResult<{ ok: true }>> {
  if (!password || password.length < 6) {
    return authError('Password must be at least 6 characters', 'invalid_password')
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    return authError(error.message, error.code)
  }
  return { data: { ok: true }, error: null }
}
