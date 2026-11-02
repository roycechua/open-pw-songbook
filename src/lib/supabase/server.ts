import { createServerClient } from '@supabase/ssr'
import {
  getCookies,
  setCookie,
  setResponseHeader,
} from '@tanstack/react-start/server'

import type { Database } from './database.types'
import { getSupabaseAnonKey, getSupabaseUrl } from './env'

/**
 * Per-request server Supabase client for loaders / server functions.
 * Reads and writes the auth session cookies on the current request/response.
 */
export function createClient() {
  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({
          name,
          value,
        }))
      },
      setAll(cookies, headers) {
        cookies.forEach(({ name, value, options }) => {
          setCookie(name, value, options)
        })
        Object.entries(headers).forEach(([name, value]) => {
          setResponseHeader(name, value)
        })
      },
    },
  })
}
