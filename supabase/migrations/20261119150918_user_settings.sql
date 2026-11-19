-- User viewer settings (global defaults + optional per-song overrides)

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  text_scale numeric not null default 1,
  swipe_direction text not null default 'horizontal',
  remember_per_song boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint user_settings_text_scale_check
    check (text_scale >= 0.8 and text_scale <= 1.6),
  constraint user_settings_swipe_direction_check
    check (swipe_direction in ('horizontal', 'vertical'))
);

create table public.user_song_settings (
  user_id uuid not null references public.profiles (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  text_scale numeric,
  swipe_direction text,
  updated_at timestamptz not null default now(),
  primary key (user_id, song_id),
  constraint user_song_settings_text_scale_check
    check (text_scale is null or (text_scale >= 0.8 and text_scale <= 1.6)),
  constraint user_song_settings_swipe_direction_check
    check (
      swipe_direction is null
      or swipe_direction in ('horizontal', 'vertical')
    ),
  constraint user_song_settings_has_pref_check
    check (text_scale is not null or swipe_direction is not null)
);

create index user_song_settings_song_id_idx
  on public.user_song_settings (song_id);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row
  execute function public.set_updated_at();

create trigger user_song_settings_set_updated_at
  before update on public.user_song_settings
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.user_settings enable row level security;
alter table public.user_song_settings enable row level security;

create policy "Users can read own settings"
  on public.user_settings
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own settings"
  on public.user_settings
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can read own song settings"
  on public.user_song_settings
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own song settings"
  on public.user_song_settings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own song settings"
  on public.user_song_settings
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own song settings"
  on public.user_song_settings
  for delete
  to authenticated
  using (auth.uid() = user_id);
