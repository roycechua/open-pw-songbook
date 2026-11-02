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

## Stack

TanStack Start · React 19 · Vite · Supabase
