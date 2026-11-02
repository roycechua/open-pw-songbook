/** Shared copy: password reset requires a verified email. */
export const UNVERIFIED_RESET_NOTE =
  'If you have not verified your email, password reset is unavailable—verify first (optional for normal use).'

/** Absolute browser origin; empty during SSR. */
export function appOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return ''
}

export function emailConfirmRedirectTo(): string {
  return `${appOrigin()}/auth/callback?next=/`
}

export function passwordResetRedirectTo(): string {
  return `${appOrigin()}/auth/callback?next=/reset-password`
}

/** Allow only same-origin relative paths (no open redirects). */
export function safeNextPath(next: string | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return fallback
  }
  return next
}
