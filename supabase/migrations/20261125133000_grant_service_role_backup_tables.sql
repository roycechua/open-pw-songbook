-- Backup and restore run as service_role. Newer tables already have this grant.
-- profiles, songs, and playlist_items were created earlier without it.

grant all on table public.profiles to service_role;
grant all on table public.songs to service_role;
grant all on table public.playlist_items to service_role;
