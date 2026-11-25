# Open Praise and Worship Songbook

Package / repo name: `open-pw-songbook`.

Mobile/tablet-first chord sheet viewer. Phase 2 adds Supabase auth, user songs, and playlists (in progress).

## Features

- ChordPro parse, transpose, lyrics mode, optional charts
- Horizontal page snap + print stylesheet
- Supabase-backed auth / songs / favorites playlist (foundation in place)

## Develop

```bash
cp .env.example .env.local
# Fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Supabase

1. Create a project; set **Confirm email: OFF** under Auth → Email.
2. Add Site URL / redirect URLs for confirm + password reset (see `.env.example`).
3. Apply migrations (empty DB — no song seeds):

```bash
# Local
npx supabase start
npx supabase db reset

# Or linked remote
npx supabase db push
```

ChordPro format reference (not loaded into the DB): [`samples/adonai.chordpro`](samples/adonai.chordpro).

## Backups (Cloudflare R2)

Prod profiles, songs, playlists, and viewer settings are copied to a **private** R2 bucket so a wiped Supabase project can be restored. Live data stays on Supabase; R2 is the off-site copy. Dumps are **not** committed. Do **not** put R2 credentials in Netlify.

Layout in the bucket:

- `latest/` — full current snapshot (overwritten each run); use this to restore
- `archive/songs/<id>.json` and `archive/playlists/<id>.json` — last copy of each row (never pruned; overwritten when that row changes)

Auth users are **not** in the snapshot. Restoring onto a new project requires those users to exist first (`profiles.id` references `auth.users`).

### Setup: Cloudflare R2

Recommended bucket name: **`open-pw-songbook-backups`**.

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2 Object Storage** → **Create bucket** → `open-pw-songbook-backups`, storage class **Standard**.
2. Keep the bucket **private** (no custom domain / public access).
3. Copy the **Account ID** from the R2 overview → `R2_ACCOUNT_ID`.
4. **Manage R2 API Tokens** → create a token with **Object Read & Write**, scoped to **that bucket only**.
5. Copy Access Key ID → `R2_ACCESS_KEY_ID` and Secret Access Key → `R2_SECRET_ACCESS_KEY` (secret is shown once).

### Setup: local env

Add the R2 values to gitignored `.env` (or pass `--file=`). `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must be from the **same** project you intend to copy.

```bash
npm run backup
# or
npm run backup -- --file=.env.production.local
```

Confirm `latest/` and `archive/` appear in the R2 UI.

### Setup: GitHub Actions secrets

The workflow has **no** `environment:` job, so use **Repository secrets** (not Environment secrets). These are not shared with other repos.

Repo → **Settings** → **Secrets and variables** → **Actions** → **Repository secrets** → add:

| Secret | Purpose |
| --- | --- |
| `PROD_SUPABASE_URL` | Prod project URL |
| `PROD_SUPABASE_SERVICE_ROLE_KEY` | Prod service role key |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET` | `open-pw-songbook-backups` |

Then **Actions** → **Backup songbook to R2** → **Run workflow** once to verify.

Automation: [`.github/workflows/backup-songbook.yml`](.github/workflows/backup-songbook.yml) also runs daily at 00:00 PHT. GitHub may start the job later than the cron time.

### Restore

```bash
npm run restore -- --file=.env --yes
```

This upserts `latest/` into the Supabase project in that env file. Practice against a non-prod project before you need it.

## Stack

TanStack Start · React 19 · Vite · Supabase
