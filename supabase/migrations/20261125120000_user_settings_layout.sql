-- Layout preferences for the song viewer (global, not per song).

alter table public.user_settings
  add column layout_density text not null default 'compact',
  add column sheet_columns text not null default 'auto',
  add column keep_sections boolean not null default false,
  add column fit_to_page boolean not null default false;

alter table public.user_settings
  add constraint user_settings_layout_density_check
    check (layout_density in ('comfortable', 'compact', 'tight')),
  add constraint user_settings_sheet_columns_check
    check (sheet_columns in ('auto', '1', '2'));
