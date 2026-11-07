import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'

import { BusyButton } from '#/components/loading'
import { APP_NAME, APP_SHORT_NAME } from '#/lib/brand'
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

function BrandMark() {
  return (
    <svg
      className="app-nav__mark"
      width="28"
      height="28"
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <rect x="5.5" y="11" width="3" height="10" rx="1.5" fill="currentColor" />
      <rect x="11.5" y="6.5" width="3" height="19" rx="1.5" fill="currentColor" />
      <rect x="17.5" y="9" width="3" height="14" rx="1.5" fill="currentColor" />
      <rect x="23.5" y="4.5" width="3" height="23" rx="1.5" fill="currentColor" />
    </svg>
  )
}

const TAB_ICONS = {
  discover: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm3.5 5.5-2 5-5 2 2-5 5-2z',
  songs: 'M9 18V6l10-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm10-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  add: 'M12 5v14M5 12h14',
  login: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
} as const

function TabIcon({ name }: { name: keyof typeof TAB_ICONS }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={TAB_ICONS[name]} />
    </svg>
  )
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

  const onDiscover = pathname === '/'
  const onMySongs = pathname.startsWith('/my')
  const onLogin = pathname.startsWith('/login')
  const onSignup = pathname.startsWith('/signup')

  return (
    <div className="app-chrome">
      <header className="app-header">
        <nav className="app-nav" aria-label="Account">
          <Link to="/" className="app-nav__brand">
            <BrandMark />
            <span className="app-nav__name">{APP_NAME}</span>
            <span className="app-nav__name app-nav__name--short">
              {APP_SHORT_NAME}
            </span>
          </Link>
          <div className="app-nav__links">
            <Link
              to="/"
              className={
                onDiscover ? 'app-nav__link is-active' : 'app-nav__link'
              }
            >
              Discover
            </Link>
            {user ? (
              <>
                <Link
                  to="/my/songs"
                  className={
                    onMySongs ? 'app-nav__link is-active' : 'app-nav__link'
                  }
                >
                  My songs
                </Link>
                <Link to="/songs/new" className="btn btn--primary btn--sm">
                  Add song
                </Link>
                <span className="app-nav__user" title={user.email}>
                  {user.username ? `@${user.username}` : user.email}
                </span>
                <BusyButton
                  type="button"
                  className="app-nav__button"
                  busy={busy}
                  busyLabel="Logging out…"
                  onClick={() => void onLogout()}
                >
                  Log out
                </BusyButton>
              </>
            ) : (
              <>
                <Link to="/login" className="app-nav__link">
                  Log in
                </Link>
                <Link to="/signup" className="btn btn--primary btn--sm">
                  Sign up
                </Link>
              </>
            )}
          </div>
          {user ? (
            <span className="app-nav__user app-nav__user--mobile">
              {user.username ? `@${user.username}` : user.email}
            </span>
          ) : null}
        </nav>
      </header>

      {user && !user.emailVerified ? (
        <div className="verify-banner" role="status">
          <p className="verify-banner__text">
            Email not verified yet — optional for using the app.{' '}
            {UNVERIFIED_RESET_NOTE}
          </p>
          <div className="verify-banner__actions">
            <BusyButton
              type="button"
              className="toolbar-btn"
              busy={busy}
              busyLabel="Sending…"
              onClick={() => void onResendVerify()}
            >
              Resend verification
            </BusyButton>
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

      <nav className="tabbar" aria-label="Primary">
        <Link
          to="/"
          className={onDiscover ? 'tabbar__item is-active' : 'tabbar__item'}
        >
          <TabIcon name="discover" />
          <span>Discover</span>
        </Link>
        {user ? (
          <>
            <Link
              to="/my/songs"
              className={onMySongs ? 'tabbar__item is-active' : 'tabbar__item'}
            >
              <TabIcon name="songs" />
              <span>My songs</span>
            </Link>
            <Link to="/songs/new" className="tabbar__item tabbar__item--add">
              <TabIcon name="add" />
              <span>Add song</span>
            </Link>
            <button
              type="button"
              className="tabbar__item"
              disabled={busy}
              onClick={() => void onLogout()}
            >
              <TabIcon name="logout" />
              <span>{busy ? 'Logging out…' : 'Log out'}</span>
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className={onLogin ? 'tabbar__item is-active' : 'tabbar__item'}
            >
              <TabIcon name="login" />
              <span>Log in</span>
            </Link>
            <Link
              to="/signup"
              className={
                onSignup ? 'tabbar__item is-active' : 'tabbar__item'
              }
            >
              <TabIcon name="add" />
              <span>Sign up</span>
            </Link>
          </>
        )}
      </nav>
    </div>
  )
}
