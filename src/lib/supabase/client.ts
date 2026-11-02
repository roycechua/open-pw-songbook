/// <reference types="vite/client" />
import { createBrowserClient } from '@supabase/ssr'

import type { Database } from './database.types'
import { getSupabaseAnonKey, getSupabaseUrl } from './env'

/** Browser Supabase client (cookie session via @supabase/ssr). */
export function createClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey())
}
