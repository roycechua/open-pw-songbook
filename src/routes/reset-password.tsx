import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'

import { AuthShell } from '#/components/AuthShell'
import { APP_NAME } from '#/lib/brand'
import { UNVERIFIED_RESET_NOTE, updatePassword } from '#/lib/supabase'
import { createClient } from '#/lib/supabase/client'

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
  head: () => ({
    meta: [{ title: `Reset password · ${APP_NAME}` }],
  }),
})

function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function checkSession() {
      try {
        const supabase = createClient()
        const { data } = await supabase.auth.getSession()
        if (!cancelled) {
          setReady(Boolean(data.session))
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Session check failed')
          setReady(false)
        }
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    void checkSession()
    return () => {
      cancelled = true
    }
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const supabase = createClient()
      const result = await updatePassword(supabase, password)
      if (result.error) {
        setError(result.error.message)
        return
      }
      setDone(true)
      await router.invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password')
    } finally {
      setBusy(false)
    }
  }

  if (checking) {
    return (
      <AuthShell title="Reset password" lede="Checking your recovery session…">
        <p className="auth-note auth-note--muted">One moment.</p>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell
        title="Password updated"
        lede="You can keep browsing with your new password."
        footer={
          <p>
            <Link to="/">Home</Link>
            {' · '}
            <Link to="/login">Log in</Link>
          </p>
        }
      >
        <p className="auth-note">Your password has been changed.</p>
      </AuthShell>
    )
  }

  if (!ready) {
    return (
      <AuthShell
        title="Reset link required"
        lede="Open the link from your email to set a new password."
        footer={
          <p>
            <Link to="/forgot-password">Request a reset link</Link>
            {' · '}
            <Link to="/login">Log in</Link>
          </p>
        }
      >
        <p className="auth-note">{UNVERIFIED_RESET_NOTE}</p>
        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Choose a new password"
      lede="Set a password for this recovery session."
      footer={
        <p>
          <Link to="/login">Back to log in</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={(e) => void onSubmit(e)}>
        <label className="auth-field">
          <span>New password</span>
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
        <label className="auth-field">
          <span>Confirm password</span>
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={busy}
          />
        </label>

        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </AuthShell>
  )
}
