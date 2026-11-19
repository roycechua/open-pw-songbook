-- Custom user playlists: name, description, ordered song ids

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text not null default '',
  song_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint playlists_name_length_check
    check (char_length(btrim(name)) between 1 and 80),
  constraint playlists_description_length_check
    check (char_length(description) <= 500)
);

create index playlists_owner_updated_idx
  on public.playlists (owner_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create trigger playlists_set_updated_at
  before update on public.playlists
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.playlists enable row level security;

create policy "Users can read own playlists"
  on public.playlists
  for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own playlists"
  on public.playlists
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update own playlists"
  on public.playlists
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own playlists"
  on public.playlists
  for delete
  to authenticated
  using (auth.uid() = owner_id);
