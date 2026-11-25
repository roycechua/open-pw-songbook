import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { hasFlag, loadCliEnv, required, supabaseUrl } from './load-env'
import { createR2Client, getObjectText } from './r2'

loadCliEnv()

const targetUrl = supabaseUrl()
const supabase = createClient(targetUrl, required('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { autoRefreshToken: false, persistSession: false },
})
const r2 = createR2Client()

const RESTORES = [
  { table: 'profiles', onConflict: 'id' },
  { table: 'songs', onConflict: 'id' },
  { table: 'playlist_items', onConflict: 'id' },
  { table: 'playlists', onConflict: 'id' },
  { table: 'user_settings', onConflict: 'user_id' },
  { table: 'user_song_settings', onConflict: 'user_id,song_id' },
] as const

async function readRows(key: string): Promise<Record<string, unknown>[]> {
  const parsed = JSON.parse(await getObjectText(r2, key)) as unknown
  if (!Array.isArray(parsed)) throw new Error(`${key} is not an array.`)
  return parsed as Record<string, unknown>[]
}

async function upsertAll(
  client: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
) {
  const size = 200
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size)
    const { error } = await client.from(table).upsert(batch, { onConflict })
    if (error) throw new Error(`${table}: ${error.message}`)
  }
}

async function main() {
  console.log(`Restore target: ${targetUrl}`)
  if (!hasFlag('--yes')) {
    throw new Error('Refusing to restore without --yes (re-run with --yes after confirming the URL).')
  }

  const counts: string[] = []
  for (const { table, onConflict } of RESTORES) {
    const rows = await readRows(`latest/${table}.json`)
    if (rows.length > 0) await upsertAll(supabase, table, rows, onConflict)
    counts.push(`${rows.length} ${table}`)
  }

  console.log(
    `Restored ${counts.join(', ')} into ${targetUrl} from latest/. Auth users are not restored — profiles fail if those auth users do not already exist.`,
  )
}

await main()
