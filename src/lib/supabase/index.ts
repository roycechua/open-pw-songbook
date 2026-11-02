/**
 * Shared Supabase surface for the next phases.
 *
 * Import clients from dedicated modules to avoid bundling server code in the browser:
 * - `#/lib/supabase/client` — browser
 * - `#/lib/supabase/server` — loaders / server functions
 * - `#/lib/supabase/admin` — service-role scripts only
 */

export type { Database, Profile, Song, SongStatus, PlaylistItem } from './database.types'
export {
  USERNAME_PATTERN,
  normalizeUsername,
  isValidUsername,
  resolveLoginEmail,
  signUp,
  signIn,
  signOut,
  resendVerificationEmail,
  resetPasswordForEmail,
  getEmailVerified,
  updatePassword,
} from './auth'
export type {
  SongbookClient,
  AuthResult,
  SignUpInput,
  SignInInput,
} from './auth'
export type { AuthSession } from './session-types'
export {
  UNVERIFIED_RESET_NOTE,
  emailConfirmRedirectTo,
  passwordResetRedirectTo,
  safeNextPath,
} from './redirects'
