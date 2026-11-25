import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export function loadEnvFile(path: string) {
  if (!existsSync(path)) {
    throw new Error(`Env file not found: ${path}`)
  }
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

export function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not set.`)
  return value
}

/** Prod URL in CI (`SUPABASE_URL`); a local env file uses `VITE_SUPABASE_URL`. */
export function supabaseUrl() {
  const value = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim()
  if (!value) throw new Error('SUPABASE_URL or VITE_SUPABASE_URL is not set.')
  return value
}

function hasSupabaseEnv() {
  const url = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim()
  return Boolean(url && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
}

/** Load `--file=` when present. In CI (env already set), skip the file. */
export function loadCliEnv(defaultFile = '.env') {
  const envFileArg = process.argv.find((arg) => arg.startsWith('--file='))?.slice('--file='.length)
  if (envFileArg) {
    loadEnvFile(resolve(envFileArg))
    return
  }
  if (hasSupabaseEnv()) return
  loadEnvFile(resolve(defaultFile))
}

export function hasFlag(name: string) {
  return process.argv.includes(name)
}
