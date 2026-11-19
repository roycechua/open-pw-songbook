-- Tables created by the postgres role inherit default privileges that omit
-- SELECT/INSERT/UPDATE/DELETE for authenticated. RLS policies alone are not enough.

grant select, insert, update, delete on table public.user_settings to authenticated;
grant select, insert, update, delete on table public.user_song_settings to authenticated;
grant select, insert, update, delete on table public.playlists to authenticated;

grant all on table public.user_settings to service_role;
grant all on table public.user_song_settings to service_role;
grant all on table public.playlists to service_role;
