-- Phase 2 foundation: profiles, songs, playlist_items + RLS

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  email text not null,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint profiles_username_unique unique (username),
  constraint profiles_email_unique unique (email)
);

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null,
  title text not null,
  artist text not null default '',
  original_key text not null default 'C',
  chord_pro text not null default '',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint songs_status_check check (status in ('draft', 'published')),
  constraint songs_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint songs_owner_slug_unique unique (owner_id, slug)
);

create index songs_status_title_idx on public.songs (status, title);
create index songs_owner_id_idx on public.songs (owner_id);

create table public.playlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  position int not null default 0,
  created_at timestamptz not null default now(),
  constraint playlist_items_user_song_unique unique (user_id, song_id)
);

create index playlist_items_user_position_idx
  on public.playlist_items (user_id, position);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger songs_set_updated_at
  before update on public.songs
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Profile on signup (username from auth.users raw_user_meta_data)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_username text;
begin
  chosen_username := nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), '');

  if chosen_username is null then
    raise exception 'username is required in user metadata';
  end if;

  if chosen_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'invalid username format';
  end if;

  insert into public.profiles (id, username, email)
  values (new.id, chosen_username, new.email);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.songs enable row level security;
alter table public.playlist_items enable row level security;

-- profiles: public read (usernames in URLs / login lookup); users update own row
create policy "Profiles are publicly readable"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- songs: published readable by anyone; owners full CRUD on own rows
create policy "Published songs are publicly readable"
  on public.songs
  for select
  to anon, authenticated
  using (status = 'published' or auth.uid() = owner_id);

create policy "Owners can insert own songs"
  on public.songs
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Owners can update own songs"
  on public.songs
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Owners can delete own songs"
  on public.songs
  for delete
  to authenticated
  using (auth.uid() = owner_id);

-- playlist_items: owner-only CRUD; insert only when song is published
create policy "Users can read own playlist items"
  on public.playlist_items
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own playlist items for published songs"
  on public.playlist_items
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.songs s
      where s.id = song_id
        and s.status = 'published'
    )
  );

create policy "Users can update own playlist items"
  on public.playlist_items
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own playlist items"
  on public.playlist_items
  for delete
  to authenticated
  using (auth.uid() = user_id);
