import { Link, createFileRoute } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'

import { AuthShell } from '#/components/AuthShell'
import { BusyButton } from '#/components/loading'
import { APP_NAME } from '#/lib/brand'
import {
  UNVERIFIED_RESET_NOTE,
  passwordResetRedirectTo,
  resetPasswordForEmail,
} from '#/lib/supabase'
import { createClient } from '#/lib/supabase/client'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
  head: () => ({
    meta: [{ title: `Forgot password · ${APP_NAME}` }],
  }),
})

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const supabase = createClient()
      const result = await resetPasswordForEmail(supabase, email, {
        redirectTo: passwordResetRedirectTo(),
      })
      if (result.error) {
        setError(result.error.message)
        return
      }
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <AuthShell
        title="Check your email"
        lede="If that address is registered and verified, a reset link is on the way."
        footer={
          <p>
            <Link to="/login">Back to log in</Link>
          </p>
        }
      >
        <p className="auth-note">{UNVERIFIED_RESET_NOTE}</p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Forgot password"
      lede="Request a reset link for a verified email address."
      footer={
        <p>
          <Link to="/login">Back to log in</Link>
        </p>
      }
    >
      <p className="auth-note">{UNVERIFIED_RESET_NOTE}</p>
      <form className="auth-form" onSubmit={(e) => void onSubmit(e)}>
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

        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}

        <BusyButton
          type="submit"
          className="auth-submit"
          busy={busy}
          busyLabel="Sending…"
        >
          Send reset link
        </BusyButton>
      </form>
    </AuthShell>
  )
}
