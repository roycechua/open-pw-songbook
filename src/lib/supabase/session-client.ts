import { createClient } from './client'
import { isSupabaseConfigured } from './env'
import type { AuthSession } from './session-types'

/**
 * Browser-side equivalent of `fetchAuthSession` (server). Talks to Supabase
 * directly so client navigations skip the far-away app server.
 *
 * Guests (no local session) cost no network round trip. For signed-in users the
 * user is verified with the Auth server while the profile row (publicly
 * readable by id) is fetched in parallel.
 */
export async function fetchAuthSessionClient(): Promise<AuthSession | null> {
  if (!isSupabaseConfigured()) return null

  try {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return null

    const [{ data: userData, error }, { data: profile }] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .maybeSingle(),
    ])
    if (error || !userData.user) return null

    const user = userData.user
    return {
      userId: user.id,
      email: user.email ?? '',
      username: profile?.username ?? null,
      emailVerified: Boolean(user.email_confirmed_at),
    }
  } catch {
    return null
  }
}
