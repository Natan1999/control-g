-- Control G LATAM + GIS: regional configuration, PostGIS and entity-owned map layers.
-- Safe to execute after the initial Control G migrations.

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

alter table public.entities
  add column if not exists country_code text not null default 'CO',
  add column if not exists locale text not null default 'es-CO',
  add column if not exists timezone text not null default 'America/Bogota',
  add column if not exists currency_code text not null default 'COP',
  add column if not exists default_map_center jsonb not null default '{"latitude":4.5709,"longitude":-74.2973}'::jsonb,
  add column if not exists default_map_zoom smallint not null default 5,
  add column if not exists map_privacy_mode text not null default 'exact',
  add column if not exists regional_settings jsonb not null default '{}'::jsonb;

alter table public.entities drop constraint if exists entities_country_code_check;
alter table public.entities add constraint entities_country_code_check
  check (country_code ~ '^[A-Z]{2}$');
alter table public.entities drop constraint if exists entities_default_map_zoom_check;
alter table public.entities add constraint entities_default_map_zoom_check
  check (default_map_zoom between 1 and 20);
alter table public.entities drop constraint if exists entities_map_privacy_mode_check;
alter table public.entities add constraint entities_map_privacy_mode_check
  check (map_privacy_mode in ('exact','approximate','aggregate'));

alter table public.entity_municipalities
  add column if not exists country_code text not null default 'CO',
  add column if not exists admin_level_1_code text,
  add column if not exists admin_level_2_code text,
  add column if not exists center_latitude double precision,
  add column if not exists center_longitude double precision,
  add column if not exists boundary_geojson jsonb;

alter table public.entity_municipalities drop constraint if exists entity_municipalities_center_check;
alter table public.entity_municipalities add constraint entity_municipalities_center_check check (
  (center_latitude is null and center_longitude is null)
  or (
    center_latitude between -90 and 90
    and center_longitude between -180 and 180
  )
);

alter table public.families
  add column if not exists location extensions.geography(Point, 4326)
  generated always as (
    case
      when latitude between -90 and 90 and longitude between -180 and 180
      then extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
      else null
    end
  ) stored;

alter table public.activities
  add column if not exists location extensions.geography(Point, 4326)
  generated always as (
    case
      when latitude between -90 and 90 and longitude between -180 and 180
      then extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
      else null
    end
  ) stored;

alter table public.form_responses
  add column if not exists location extensions.geography(Point, 4326)
  generated always as (
    case
      when latitude between -90 and 90 and longitude between -180 and 180
      then extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
      else null
    end
  ) stored;

create index if not exists families_location_gix on public.families using gist(location);
create index if not exists activities_location_gix on public.activities using gist(location);
create index if not exists form_responses_location_gix on public.form_responses using gist(location);
create index if not exists form_responses_entity_captured_idx
  on public.form_responses(entity_id, captured_at desc) where latitude is not null and longitude is not null;

create table if not exists public.map_layers (
  id text primary key default gen_random_uuid()::text,
  entity_id text not null references public.entities(id) on delete cascade,
  name text not null,
  description text,
  layer_type text not null default 'mixed'
    check (layer_type in ('points','lines','polygons','mixed')),
  geojson jsonb not null,
  color text not null default '#3D7B9E',
  opacity numeric(3,2) not null default 0.28 check (opacity between 0 and 1),
  visible_default boolean not null default true,
  status text not null default 'active' check (status in ('active','archived')),
  source text,
  source_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(entity_id, name),
  check (jsonb_typeof(geojson) = 'object')
);

create index if not exists map_layers_entity_status_idx
  on public.map_layers(entity_id, status);

drop trigger if exists set_map_layers_updated_at on public.map_layers;
create trigger set_map_layers_updated_at
before update on public.map_layers
for each row execute function public.set_updated_at();

alter table public.map_layers enable row level security;

drop policy if exists map_layers_select on public.map_layers;
create policy map_layers_select on public.map_layers for select to authenticated
using (public.is_control_g_admin() or entity_id = public.current_entity_id());

drop policy if exists map_layers_write on public.map_layers;
create policy map_layers_write on public.map_layers for all to authenticated
using (
  public.is_control_g_admin()
  or (public.current_profile_role() = 'coordinator' and entity_id = public.current_entity_id())
)
with check (
  public.is_control_g_admin()
  or (public.current_profile_role() = 'coordinator' and entity_id = public.current_entity_id())
);

grant select, insert, update, delete on public.map_layers to authenticated;

update public.entities
set
  country_code = 'CO',
  locale = 'es-CO',
  timezone = 'America/Bogota',
  currency_code = 'COP',
  default_map_center = '{"latitude":9.3000,"longitude":-74.8000}'::jsonb,
  default_map_zoom = 7,
  regional_settings = regional_settings || jsonb_build_object(
    'administrative_division_label', 'Municipio',
    'document_label', 'Documento de identidad',
    'initial_client', true
  )
where id = 'gov-bolivar-2026';

update public.entity_municipalities
set country_code = 'CO', admin_level_2_code = dane_code
where entity_id = 'gov-bolivar-2026';
