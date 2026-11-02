import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'

import { APP_NAME } from '#/lib/brand'
import type { AuthSession } from '#/lib/supabase'
import {
  UNVERIFIED_RESET_NOTE,
  emailConfirmRedirectTo,
  resendVerificationEmail,
  signOut,
} from '#/lib/supabase'
import { createClient } from '#/lib/supabase/client'

type AppNavProps = {
  user: AuthSession | null
}

export function AppNav({ user }: AppNavProps) {
  const router = useRouter()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const hideChrome = pathname.startsWith('/songs/')

  const [busy, setBusy] = useState(false)
  const [resendNote, setResendNote] = useState<string | null>(null)

  if (hideChrome) {
    return null
  }

  async function onLogout() {
    setBusy(true)
    setResendNote(null)
    try {
      const supabase = createClient()
      await signOut(supabase)
      await router.invalidate()
      await router.navigate({ to: '/' })
    } catch (err) {
      setResendNote(err instanceof Error ? err.message : 'Logout failed')
    } finally {
      setBusy(false)
    }
  }

  async function onResendVerify() {
    setBusy(true)
    setResendNote(null)
    try {
      const supabase = createClient()
      const result = await resendVerificationEmail(supabase, {
        emailRedirectTo: emailConfirmRedirectTo(),
      })
      if (result.error) {
        setResendNote(result.error.message)
      } else {
        setResendNote('Verification email sent — check your inbox.')
      }
    } catch (err) {
      setResendNote(
        err instanceof Error ? err.message : 'Could not resend verification',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-chrome">
      <nav className="app-nav" aria-label="Account">
        <Link to="/" className="app-nav__brand">
          {APP_NAME}
        </Link>
        <div className="app-nav__links">
          {user ? (
            <>
              <span className="app-nav__user" title={user.email}>
                {user.username ? `@${user.username}` : user.email}
              </span>
              <Link to="/my/songs" className="app-nav__link">
                My songs
              </Link>
              <button
                type="button"
                className="app-nav__button"
                onClick={() => void onLogout()}
                disabled={busy}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="app-nav__link">
                Log in
              </Link>
              <Link to="/signup" className="app-nav__link app-nav__link--accent">
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>

      {user && !user.emailVerified ? (
        <div className="verify-banner" role="status">
          <p className="verify-banner__text">
            Email not verified yet — optional for using the app.{' '}
            {UNVERIFIED_RESET_NOTE}
          </p>
          <div className="verify-banner__actions">
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => void onResendVerify()}
              disabled={busy}
            >
              Resend verification
            </button>
            {resendNote ? (
              <span className="verify-banner__note">{resendNote}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {user?.emailVerified && resendNote ? (
        <p className="app-chrome__flash" role="status">
          {resendNote}
        </p>
      ) : null}
    </div>
  )
}
