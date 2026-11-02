/** Shared env accessors for Supabase clients. */

function readEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string | undefined {
  const fromVite = import.meta.env?.[name] as string | undefined
  const fromProcess =
    typeof process !== 'undefined' ? process.env[name] : undefined
  const value = fromVite || fromProcess
  return value?.trim() || undefined
}

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill in your Supabase project values.`,
    )
  }
  return value
}

/** True when browser/SSR anon credentials are present (placeholder-free check is not required). */
export function isSupabaseConfigured(): boolean {
  return Boolean(readEnv('VITE_SUPABASE_URL') && readEnv('VITE_SUPABASE_ANON_KEY'))
}

export function getSupabaseUrl(): string {
  return requireEnv(readEnv('VITE_SUPABASE_URL'), 'VITE_SUPABASE_URL')
}

export function getSupabaseAnonKey(): string {
  return requireEnv(readEnv('VITE_SUPABASE_ANON_KEY'), 'VITE_SUPABASE_ANON_KEY')
}

/** Server-only. Never expose via VITE_ or ship to the browser. */
export function getSupabaseServiceRoleKey(): string {
  if (typeof process === 'undefined') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is server-only')
  }
  return requireEnv(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    'SUPABASE_SERVICE_ROLE_KEY',
  )
}
