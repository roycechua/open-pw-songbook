import { createServerFn } from '@tanstack/react-start'

import { createClient } from './server'
import type { AuthSession } from './session-types'

export type { AuthSession } from './session-types'

/**
 * Serializable session snapshot for root chrome / route context.
 * Returns null for guests, missing env, or invalid sessions.
 */
export const fetchAuthSession = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AuthSession | null> => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) {
        return null
      }

      const user = data.user
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle()

      return {
        userId: user.id,
        email: user.email ?? '',
        username: profile?.username ?? null,
        emailVerified: Boolean(user.email_confirmed_at),
      }
    } catch {
      // Missing credentials / network — keep public pages usable as guest.
      return null
    }
  },
)
