import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import type { Database } from './database.types'
import { getSupabaseServiceRoleKey, getSupabaseUrl } from './env'

/**
 * Service-role client for privileged server scripts only.
 * Never import this from browser / route component code.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
