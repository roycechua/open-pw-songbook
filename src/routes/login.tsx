import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'

import { AuthShell } from '#/components/AuthShell'
import { APP_NAME } from '#/lib/brand'
import { UNVERIFIED_RESET_NOTE, signIn } from '#/lib/supabase'
import { createClient } from '#/lib/supabase/client'

export const Route = createFileRoute('/login')({
  component: LoginPage,
  head: () => ({
    meta: [{ title: `Log in · ${APP_NAME}` }],
  }),
})

function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const supabase = createClient()
      const result = await signIn(supabase, { identifier, password })
      if (result.error) {
        setError(result.error.message)
        return
      }
      await router.invalidate()
      await router.navigate({ to: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Log in"
      lede="Use your username or email, plus password."
      footer={
        <p>
          No account yet? <Link to="/signup">Sign up</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={(e) => void onSubmit(e)}>
        <label className="auth-field">
          <span>Username or email</span>
          <input
            name="identifier"
            autoComplete="username"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />
        </label>

        <p className="auth-note auth-note--muted">
          <Link to="/forgot-password">Forgot password?</Link>
          {' — '}
          {UNVERIFIED_RESET_NOTE}
        </p>

        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Log in'}
        </button>
      </form>
    </AuthShell>
  )
}
