import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import type { EmailOtpType } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

import { AuthShell } from '#/components/AuthShell'
import { APP_NAME } from '#/lib/brand'
import { safeNextPath } from '#/lib/supabase'
import { createClient } from '#/lib/supabase/client'

type CallbackSearch = {
  code?: string
  token_hash?: string
  type?: string
  next?: string
  error?: string
  error_description?: string
}

export const Route = createFileRoute('/auth/callback')({
  validateSearch: (search: Record<string, unknown>): CallbackSearch => ({
    code: typeof search.code === 'string' ? search.code : undefined,
    token_hash:
      typeof search.token_hash === 'string' ? search.token_hash : undefined,
    type: typeof search.type === 'string' ? search.type : undefined,
    next: typeof search.next === 'string' ? search.next : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
    error_description:
      typeof search.error_description === 'string'
        ? search.error_description
        : undefined,
  }),
  component: AuthCallbackPage,
  head: () => ({
    meta: [{ title: `Confirming · ${APP_NAME}` }],
  }),
})

function AuthCallbackPage() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const [message, setMessage] = useState('Confirming your email…')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (search.error) {
        if (!cancelled) {
          setFailed(true)
          setMessage(search.error_description || search.error)
        }
        return
      }

      const next = safeNextPath(search.next, '/')

      try {
        const supabase = createClient()

        if (search.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(
            search.code,
          )
          if (error) throw error
        } else if (search.token_hash && search.type) {
          const { error } = await supabase.auth.verifyOtp({
            type: search.type as EmailOtpType,
            token_hash: search.token_hash,
          })
          if (error) throw error
        } else {
          const { data } = await supabase.auth.getSession()
          if (!data.session) {
            throw new Error('Missing confirmation code. Open the link from your email again.')
          }
        }

        if (cancelled) return
        await router.invalidate()
        await navigate({ href: next })
      } catch (err) {
        if (!cancelled) {
          setFailed(true)
          setMessage(err instanceof Error ? err.message : 'Confirmation failed')
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [search, navigate, router])

  return (
    <AuthShell
      title={failed ? 'Could not confirm' : 'Confirming'}
      lede={failed ? 'Something went wrong with that link.' : undefined}
      footer={
        failed ? (
          <p>
            <Link to="/login">Log in</Link>
            {' · '}
            <Link to="/">Home</Link>
          </p>
        ) : null
      }
    >
      <p className={failed ? 'auth-error' : 'auth-note'} role="status">
        {message}
      </p>
    </AuthShell>
  )
}
