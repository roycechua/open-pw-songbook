import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { loadCliEnv, required, supabaseUrl } from './load-env'
import { createR2Client, putObject } from './r2'

loadCliEnv()

const sourceUrl = supabaseUrl()
const supabase = createClient(sourceUrl, required('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { autoRefreshToken: false, persistSession: false },
})
const r2 = createR2Client()

const TABLES = [
  'profiles',
  'songs',
  'playlist_items',
  'playlists',
  'user_settings',
  'user_song_settings',
] as const

type TableName = (typeof TABLES)[number]

const ARCHIVE_TABLES = new Set<TableName>(['songs', 'playlists'])

async function selectAll(client: SupabaseClient, table: TableName): Promise<Record<string, unknown>[]> {
  const pageSize = 1000
  const rows: Record<string, unknown>[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    const batch = (data ?? []) as Record<string, unknown>[]
    rows.push(...batch)
    if (batch.length < pageSize) break
  }
  return rows
}

async function main() {
  const tables = {} as Record<TableName, Record<string, unknown>[]>
  for (const table of TABLES) {
    tables[table] = await selectAll(supabase, table)
  }

  const exportedAt = new Date().toISOString()
  const manifest = {
    formatVersion: 1,
    exportedAt,
    source: sourceUrl,
    counts: Object.fromEntries(TABLES.map((table) => [table, tables[table].length])),
  }

  await putObject(r2, 'latest/manifest.json', JSON.stringify(manifest, null, 2), 'application/json')
  for (const table of TABLES) {
    await putObject(
      r2,
      `latest/${table}.json`,
      JSON.stringify(tables[table], null, 2),
      'application/json',
    )
  }

  let archived = 0
  for (const table of TABLES) {
    if (!ARCHIVE_TABLES.has(table)) continue
    for (const row of tables[table]) {
      const id = row.id
      if (typeof id !== 'string' || !id) {
        throw new Error(`${table} row is missing id`)
      }
      await putObject(
        r2,
        `archive/${table}/${id}.json`,
        JSON.stringify(row, null, 2),
        'application/json',
      )
      archived += 1
    }
  }

  const counts = TABLES.map((table) => `${tables[table].length} ${table}`).join(', ')
  console.log(
    `Backed up ${counts} from ${sourceUrl} → latest/ + ${archived} archive object(s). Auth users are not included.`,
  )
}

await main()
