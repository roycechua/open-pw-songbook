import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'

import { AuthShell } from '#/components/AuthShell'
import { APP_NAME } from '#/lib/brand'
import {
  UNVERIFIED_RESET_NOTE,
  emailConfirmRedirectTo,
  signUp,
} from '#/lib/supabase'
import { createClient } from '#/lib/supabase/client'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
  head: () => ({
    meta: [{ title: `Sign up · ${APP_NAME}` }],
  }),
})

function SignupPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const supabase = createClient()
      const result = await signUp(supabase, {
        username,
        email,
        password,
        emailRedirectTo: emailConfirmRedirectTo(),
      })
      if (result.error) {
        setError(result.error.message)
        return
      }
      setDone(true)
      await router.invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <AuthShell
        title="You're in"
        lede="Verification is optional — you can use the app right away."
        footer={
          <p>
            <Link to="/">Browse songs</Link>
            {' · '}
            <Link to="/login">Log in</Link>
          </p>
        }
      >
        <p className="auth-note">
          Verifying your email is optional, but without verification there is no
          password-reset option. {UNVERIFIED_RESET_NOTE}
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Sign up"
      lede="Create an account with a username, email, and password."
      footer={
        <p>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={(e) => void onSubmit(e)}>
        <label className="auth-field">
          <span>Username</span>
          <input
            name="username"
            autoComplete="username"
            required
            minLength={3}
            maxLength={20}
            pattern="[a-z0-9_]{3,20}"
            title="3–20 characters: lowercase letters, numbers, underscore"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            disabled={busy}
          />
        </label>
        <label className="auth-field">
          <span>Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />
        </label>

        <p className="auth-note auth-note--muted">
          Email verification is optional. Without it, password reset is
          unavailable.
        </p>

        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  )
}
