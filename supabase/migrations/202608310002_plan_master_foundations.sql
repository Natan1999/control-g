-- Control G Plan Maestro LATAM + GIS: governed country profiles, evidence,
-- geographic quality, analytics, privacy and ArcGIS integration metadata.
-- Additive and idempotent; it preserves all existing Bolívar records/forms.

-- ---------------------------------------------------------------------------
-- Country profiles and versioned jurisdictions
-- ---------------------------------------------------------------------------

create table if not exists public.country_profiles (
  id text primary key default gen_random_uuid()::text,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  version integer not null default 1 check (version > 0),
  name text not null,
  locale text not null,
  timezone text not null,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  phone_prefix text,
  document_types jsonb not null default '[]'::jsonb check (jsonb_typeof(document_types) = 'array'),
  administrative_levels jsonb not null default '[]'::jsonb check (jsonb_typeof(administrative_levels) = 'array'),
  consent_settings jsonb not null default '{}'::jsonb check (jsonb_typeof(consent_settings) = 'object'),
  terminology jsonb not null default '{}'::jsonb check (jsonb_typeof(terminology) = 'object'),
  source_name text,
  source_url text,
  effective_from date not null default current_date,
  status text not null default 'active' check (status in ('draft','active','retired')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(country_code, version)
);

create unique index if not exists country_profiles_one_active_idx
  on public.country_profiles(country_code) where status = 'active';

create table if not exists public.jurisdictions (
  id text primary key default gen_random_uuid()::text,
  country_profile_id text not null references public.country_profiles(id) on delete cascade,
  parent_id text references public.jurisdictions(id) on delete cascade,
  level smallint not null check (level between 0 and 8),
  code text not null,
  name text not null,
  local_type text not null,
  geometry extensions.geometry(MultiPolygon, 4326),
  center extensions.geometry(Point, 4326),
  source_name text not null,
  source_url text,
  source_version text,
  effective_from date,
  effective_to date,
  status text not null default 'active' check (status in ('active','retired')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(country_profile_id, level, code)
);

create index if not exists jurisdictions_parent_idx on public.jurisdictions(parent_id);
create index if not exists jurisdictions_geometry_gix on public.jurisdictions using gist(geometry);

alter table public.entities
  add column if not exists country_profile_id text references public.country_profiles(id) on delete set null,
  add column if not exists require_mfa_for_privileged boolean not null default true,
  add column if not exists retention_settings jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Traceable geographic capture and evidence manifest
-- ---------------------------------------------------------------------------

alter table public.form_responses
  add column if not exists accuracy_m double precision,
  add column if not exists altitude_m double precision,
  add column if not exists location_provider text,
  add column if not exists device_timestamp timestamptz,
  add column if not exists mocked_signal boolean,
  add column if not exists geo_quality_status text not null default 'unknown',
  add column if not exists geo_quality_notes text,
  add column if not exists original_latitude double precision,
  add column if not exists original_longitude double precision,
  add column if not exists manual_adjusted boolean not null default false,
  add column if not exists manual_adjustment_reason text,
  add column if not exists form_version integer not null default 1;

alter table public.activities
  add column if not exists accuracy_m double precision,
  add column if not exists altitude_m double precision,
  add column if not exists location_provider text,
  add column if not exists device_timestamp timestamptz,
  add column if not exists mocked_signal boolean,
  add column if not exists geo_quality_status text not null default 'unknown',
  add column if not exists geo_quality_notes text,
  add column if not exists original_latitude double precision,
  add column if not exists original_longitude double precision,
  add column if not exists manual_adjusted boolean not null default false,
  add column if not exists manual_adjustment_reason text;

alter table public.form_responses drop constraint if exists form_responses_geo_quality_status_check;
alter table public.form_responses add constraint form_responses_geo_quality_status_check
  check (geo_quality_status in ('unknown','good','low_accuracy','invalid','permission_denied','unavailable','adjusted'));
alter table public.activities drop constraint if exists activities_geo_quality_status_check;
alter table public.activities add constraint activities_geo_quality_status_check
  check (geo_quality_status in ('unknown','good','low_accuracy','invalid','permission_denied','unavailable','adjusted'));

create table if not exists public.evidence_files (
  id text primary key default gen_random_uuid()::text,
  entity_id text not null references public.entities(id) on delete cascade,
  local_id text not null,
  parent_type text not null check (parent_type in ('form_response','activity','family','other')),
  parent_local_id text not null,
  field_id text,
  bucket_id text not null,
  storage_path text not null,
  media_type text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  captured_at timestamptz,
  uploaded_at timestamptz not null default now(),
  retention_until date,
  created_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(entity_id, local_id),
  unique(bucket_id, storage_path)
);

create index if not exists evidence_files_parent_idx
  on public.evidence_files(entity_id, parent_type, parent_local_id);

-- ---------------------------------------------------------------------------
-- Versioned indicator dictionary, snapshots and reproducible report runs
-- ---------------------------------------------------------------------------

create table if not exists public.indicator_definitions (
  id text primary key default gen_random_uuid()::text,
  entity_id text references public.entities(id) on delete cascade,
  code text not null,
  version integer not null default 1 check (version > 0),
  name text not null,
  question text not null,
  description text,
  category text not null default 'operational',
  source_table text not null check (source_table in ('form_responses','families','activities')),
  calculation_type text not null check (calculation_type in ('count','ratio','average','median','distribution')),
  numerator jsonb not null default '{}'::jsonb,
  denominator jsonb not null default '{}'::jsonb,
  filters jsonb not null default '{}'::jsonb,
  unit text not null default 'count',
  null_handling text not null default 'exclude' check (null_handling in ('exclude','zero','category')),
  territory_level text not null default 'entity',
  periodicity text not null default 'on_demand',
  responsible_role text not null default 'coordinator',
  minimum_group_size integer not null default 5 check (minimum_group_size >= 1),
  warning text,
  methodology text not null,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(entity_id, code, version)
);

create unique index if not exists indicator_definitions_scope_unique
  on public.indicator_definitions(coalesce(entity_id, '__global__'), code, version);

create table if not exists public.indicator_snapshots (
  id text primary key default gen_random_uuid()::text,
  entity_id text not null references public.entities(id) on delete cascade,
  indicator_definition_id text not null references public.indicator_definitions(id) on delete restrict,
  cutoff_at timestamptz not null,
  filter_context jsonb not null default '{}'::jsonb,
  numerator_value numeric,
  denominator_value numeric,
  indicator_value numeric,
  sample_size integer not null default 0 check (sample_size >= 0),
  territory_code text,
  territory_name text,
  suppressed boolean not null default false,
  calculation_metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists indicator_snapshots_cutoff_idx
  on public.indicator_snapshots(entity_id, cutoff_at desc);

create table if not exists public.report_runs (
  id text primary key default gen_random_uuid()::text,
  entity_id text not null references public.entities(id) on delete cascade,
  report_type text not null,
  output_format text not null check (output_format in ('pdf','docx','xlsx','csv','geojson','gpkg','shapefile')),
  cutoff_at timestamptz not null,
  filters jsonb not null default '{}'::jsonb,
  methodology_version text not null,
  status text not null default 'pending' check (status in ('pending','running','completed','failed')),
  row_count integer not null default 0 check (row_count >= 0),
  storage_path text,
  sha256 text,
  error_code text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- ArcGIS connection metadata. Secrets live in the server-side secret manager;
-- only an opaque credential_ref may be stored here.
-- ---------------------------------------------------------------------------

create table if not exists public.arcgis_connections (
  id text primary key default gen_random_uuid()::text,
  entity_id text not null references public.entities(id) on delete cascade,
  name text not null,
  portal_url text not null check (portal_url ~ '^https://'),
  auth_mode text not null default 'oauth2' check (auth_mode in ('oauth2','app_credentials')),
  client_id text,
  credential_ref text,
  scopes text[] not null default array[]::text[],
  direction text not null default 'controlled' check (direction in ('import','export','controlled')),
  status text not null default 'draft' check (status in ('draft','active','paused','error','revoked')),
  last_verified_at timestamptz,
  last_error_code text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(entity_id, name)
);

create table if not exists public.arcgis_field_mappings (
  id text primary key default gen_random_uuid()::text,
  connection_id text not null references public.arcgis_connections(id) on delete cascade,
  form_id text references public.forms(id) on delete cascade,
  service_url text not null check (service_url ~ '^https://'),
  layer_id integer not null default 0 check (layer_id >= 0),
  direction text not null check (direction in ('import','export')),
  field_mapping jsonb not null default '{}'::jsonb,
  attachment_policy text not null default 'none' check (attachment_policy in ('none','authorized')),
  filter_expression text,
  batch_size integer not null default 500 check (batch_size between 1 and 2000),
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.arcgis_jobs (
  id text primary key default gen_random_uuid()::text,
  entity_id text not null references public.entities(id) on delete cascade,
  connection_id text not null references public.arcgis_connections(id) on delete cascade,
  mapping_id text references public.arcgis_field_mappings(id) on delete set null,
  direction text not null check (direction in ('import','export')),
  status text not null default 'pending' check (status in ('pending','preview','running','paused','completed','partial','failed','cancelled')),
  cursor_value text,
  attempted_count integer not null default 0,
  succeeded_count integer not null default 0,
  failed_count integer not null default 0,
  retry_count integer not null default 0,
  next_retry_at timestamptz,
  error_summary jsonb not null default '{}'::jsonb,
  preview_summary jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists arcgis_jobs_queue_idx
  on public.arcgis_jobs(status, next_retry_at, created_at);

-- ---------------------------------------------------------------------------
-- Consent, retention and sensitive access audit
-- ---------------------------------------------------------------------------

create table if not exists public.consent_records (
  id text primary key default gen_random_uuid()::text,
  entity_id text not null references public.entities(id) on delete cascade,
  subject_reference text not null,
  purpose_code text not null,
  consent_version text not null,
  status text not null check (status in ('granted','denied','withdrawn','expired')),
  captured_at timestamptz not null,
  expires_at timestamptz,
  evidence_file_id text references public.evidence_files(id) on delete set null,
  captured_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.retention_policies (
  id text primary key default gen_random_uuid()::text,
  entity_id text not null references public.entities(id) on delete cascade,
  data_class text not null,
  retention_days integer not null check (retention_days >= 0),
  legal_basis text not null,
  disposition text not null default 'review' check (disposition in ('review','anonymize','delete')),
  status text not null default 'draft' check (status in ('draft','active','retired')),
  effective_from date not null default current_date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(entity_id, data_class, effective_from)
);

create table if not exists public.sensitive_access_log (
  id text primary key default gen_random_uuid()::text,
  entity_id text references public.entities(id) on delete cascade,
  user_id uuid not null,
  action text not null,
  resource_type text not null,
  resource_id text,
  purpose text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Triggers, RLS and grants
-- ---------------------------------------------------------------------------

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'country_profiles','jurisdictions','indicator_definitions',
    'arcgis_connections','arcgis_field_mappings','retention_policies'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

create or replace function public.audit_configuration_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id text;
  target_entity text;
begin
  target_id := coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id');
  target_entity := coalesce(to_jsonb(new)->>'entity_id', to_jsonb(old)->>'entity_id', public.current_entity_id());
  insert into public.audit_log(entity_id, user_id, action, table_name, record_id, metadata)
  values (
    target_entity,
    auth.uid(),
    lower(tg_op) || '_configuration',
    tg_table_name,
    target_id,
    jsonb_build_object('operation', tg_op, 'at', now())
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'country_profiles','jurisdictions','indicator_definitions','arcgis_connections',
    'arcgis_field_mappings','retention_policies'
  ] loop
    execute format('drop trigger if exists audit_%I_change on public.%I', table_name, table_name);
    execute format('create trigger audit_%I_change after insert or update or delete on public.%I for each row execute function public.audit_configuration_change()', table_name, table_name);
  end loop;
end $$;

create or replace function public.record_sensitive_access(
  p_action text,
  p_resource_type text,
  p_resource_id text,
  p_purpose text,
  p_metadata jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id text := gen_random_uuid()::text;
  caller_entity text := public.current_entity_id();
begin
  if auth.uid() is null or trim(coalesce(p_purpose, '')) = '' then
    raise exception 'El usuario y la finalidad son obligatorios.' using errcode = '42501';
  end if;
  insert into public.sensitive_access_log(id, entity_id, user_id, action, resource_type, resource_id, purpose, metadata)
  values (new_id, caller_entity, auth.uid(), p_action, p_resource_type, p_resource_id, p_purpose, coalesce(p_metadata, '{}'::jsonb));
  return new_id;
end;
$$;
revoke all on function public.record_sensitive_access(text,text,text,text,jsonb) from public, anon;
grant execute on function public.record_sensitive_access(text,text,text,text,jsonb) to authenticated;

alter table public.country_profiles enable row level security;
alter table public.jurisdictions enable row level security;
alter table public.evidence_files enable row level security;
alter table public.indicator_definitions enable row level security;
alter table public.indicator_snapshots enable row level security;
alter table public.report_runs enable row level security;
alter table public.arcgis_connections enable row level security;
alter table public.arcgis_field_mappings enable row level security;
alter table public.arcgis_jobs enable row level security;
alter table public.consent_records enable row level security;
alter table public.retention_policies enable row level security;
alter table public.sensitive_access_log enable row level security;

drop policy if exists country_profiles_read on public.country_profiles;
create policy country_profiles_read on public.country_profiles for select to authenticated using (true);
drop policy if exists country_profiles_admin_write on public.country_profiles;
create policy country_profiles_admin_write on public.country_profiles for all to authenticated
  using (public.is_control_g_admin()) with check (public.is_control_g_admin());

drop policy if exists jurisdictions_read on public.jurisdictions;
create policy jurisdictions_read on public.jurisdictions for select to authenticated using (true);
drop policy if exists jurisdictions_admin_write on public.jurisdictions;
create policy jurisdictions_admin_write on public.jurisdictions for all to authenticated
  using (public.is_control_g_admin()) with check (public.is_control_g_admin());

drop policy if exists evidence_files_read on public.evidence_files;
create policy evidence_files_read on public.evidence_files for select to authenticated using (
  public.is_control_g_admin() or entity_id = public.current_entity_id()
);
drop policy if exists evidence_files_insert on public.evidence_files;
create policy evidence_files_insert on public.evidence_files for insert to authenticated with check (
  public.is_control_g_admin() or (entity_id = public.current_entity_id() and created_by = auth.uid())
);
drop policy if exists evidence_files_manage on public.evidence_files;
create policy evidence_files_manage on public.evidence_files for update to authenticated using (
  public.is_control_g_admin() or (entity_id = public.current_entity_id() and public.current_profile_role() in ('coordinator','support'))
) with check (
  public.is_control_g_admin() or (entity_id = public.current_entity_id() and public.current_profile_role() in ('coordinator','support'))
);

drop policy if exists indicators_read on public.indicator_definitions;
create policy indicators_read on public.indicator_definitions for select to authenticated using (
  entity_id is null or public.is_control_g_admin() or entity_id = public.current_entity_id()
);
drop policy if exists indicators_write on public.indicator_definitions;
create policy indicators_write on public.indicator_definitions for all to authenticated using (
  public.is_control_g_admin() or (entity_id = public.current_entity_id() and public.current_profile_role() = 'coordinator')
) with check (
  public.is_control_g_admin() or (entity_id = public.current_entity_id() and public.current_profile_role() = 'coordinator')
);

drop policy if exists indicator_snapshots_access on public.indicator_snapshots;
create policy indicator_snapshots_access on public.indicator_snapshots for all to authenticated using (
  public.is_control_g_admin() or (entity_id = public.current_entity_id() and public.current_profile_role() in ('coordinator','support'))
) with check (
  public.is_control_g_admin() or (entity_id = public.current_entity_id() and public.current_profile_role() in ('coordinator','support'))
);

drop policy if exists report_runs_access on public.report_runs;
create policy report_runs_access on public.report_runs for all to authenticated using (
  public.is_control_g_admin() or (entity_id = public.current_entity_id() and public.current_profile_role() in ('coordinator','support'))
) with check (
  public.is_control_g_admin() or (entity_id = public.current_entity_id() and public.current_profile_role() in ('coordinator','support'))
);

drop policy if exists arcgis_connections_access on public.arcgis_connections;
create policy arcgis_connections_access on public.arcgis_connections for all to authenticated using (
  public.is_control_g_admin() or (entity_id = public.current_entity_id() and public.current_profile_role() = 'coordinator')
) with check (
  public.is_control_g_admin() or (entity_id = public.current_entity_id() and public.current_profile_role() = 'coordinator')
);

drop policy if exists arcgis_mappings_access on public.arcgis_field_mappings;
create policy arcgis_mappings_access on public.arcgis_field_mappings for all to authenticated using (
  exists (
    select 1 from public.arcgis_connections connection
    where connection.id = public.arcgis_field_mappings.connection_id and (
      public.is_control_g_admin()
      or (connection.entity_id = public.current_entity_id() and public.current_profile_role() = 'coordinator')
    )
  )
) with check (
  exists (
    select 1 from public.arcgis_connections connection
    where connection.id = public.arcgis_field_mappings.connection_id and (
      public.is_control_g_admin()
      or (connection.entity_id = public.current_entity_id() and public.current_profile_role() = 'coordinator')
    )
  )
);

drop policy if exists arcgis_jobs_access on public.arcgis_jobs;
create policy arcgis_jobs_access on public.arcgis_jobs for all to authenticated using (
  public.is_control_g_admin() or (entity_id = public.current_entity_id() and public.current_profile_role() in ('coordinator','support'))
) with check (
  public.is_control_g_admin() or (entity_id = public.current_entity_id() and public.current_profile_role() = 'coordinator')
);

drop policy if exists consent_records_access on public.consent_records;
create policy consent_records_access on public.consent_records for all to authenticated using (
  public.is_control_g_admin() or (entity_id = public.current_entity_id() and public.current_profile_role() in ('coordinator','support'))
) with check (
  public.is_control_g_admin() or (entity_id = public.current_entity_id() and captured_by = auth.uid())
);

drop policy if exists retention_policies_access on public.retention_policies;
create policy retention_policies_access on public.retention_policies for all to authenticated using (
  public.is_control_g_admin() or (entity_id = public.current_entity_id() and public.current_profile_role() = 'coordinator')
) with check (
  public.is_control_g_admin() or (entity_id = public.current_entity_id() and public.current_profile_role() = 'coordinator')
);

drop policy if exists sensitive_access_log_read on public.sensitive_access_log;
create policy sensitive_access_log_read on public.sensitive_access_log for select to authenticated using (
  public.is_control_g_admin() or (entity_id = public.current_entity_id() and public.current_profile_role() = 'coordinator')
);

grant select, insert, update, delete on public.country_profiles, public.jurisdictions,
  public.evidence_files, public.indicator_definitions, public.indicator_snapshots,
  public.report_runs, public.arcgis_connections, public.arcgis_field_mappings,
  public.arcgis_jobs, public.consent_records, public.retention_policies to authenticated;
grant select on public.sensitive_access_log to authenticated;

-- ---------------------------------------------------------------------------
-- Governed seed profiles and global indicator definitions
-- ---------------------------------------------------------------------------

insert into public.country_profiles (
  id, country_code, version, name, locale, timezone, currency_code, phone_prefix,
  document_types, administrative_levels, source_name, status
) values
  ('country-co-v1','CO',1,'Colombia','es-CO','America/Bogota','COP','+57','["CC","TI","CE","PPT","PA"]','["departamento","municipio","localidad"]','Configuración Control G','active'),
  ('country-gt-v1','GT',1,'Guatemala','es-GT','America/Guatemala','GTQ','+502','["DPI","PASAPORTE"]','["departamento","municipio","comunidad"]','Configuración Control G','active'),
  ('country-hn-v1','HN',1,'Honduras','es-HN','America/Tegucigalpa','HNL','+504','["DNI","PASAPORTE"]','["departamento","municipio","aldea"]','Configuración Control G','active'),
  ('country-sv-v1','SV',1,'El Salvador','es-SV','America/El_Salvador','USD','+503','["DUI","PASAPORTE"]','["departamento","municipio","distrito"]','Configuración Control G','active'),
  ('country-cr-v1','CR',1,'Costa Rica','es-CR','America/Costa_Rica','CRC','+506','["CEDULA","DIMEX","PASAPORTE"]','["provincia","canton","distrito"]','Configuración Control G','active'),
  ('country-pa-v1','PA',1,'Panamá','es-PA','America/Panama','PAB','+507','["CEDULA","E-NIT","PASAPORTE"]','["provincia","distrito","corregimiento"]','Configuración Control G','active'),
  ('country-mx-v1','MX',1,'México','es-MX','America/Mexico_City','MXN','+52','["CURP","INE","PASAPORTE"]','["estado","municipio","localidad"]','Configuración Control G','active'),
  ('country-br-v1','BR',1,'Brasil','pt-BR','America/Sao_Paulo','BRL','+55','["CPF","RG","PASSAPORTE"]','["estado","municipio","localidade"]','Configuración Control G','active'),
  ('country-ni-v1','NI',1,'Nicaragua','es-NI','America/Managua','NIO','+505','["CEDULA","PASAPORTE"]','["departamento","municipio","comarca"]','Configuración Control G','active'),
  ('country-do-v1','DO',1,'República Dominicana','es-DO','America/Santo_Domingo','DOP','+1','["CEDULA","PASAPORTE"]','["provincia","municipio","distrito_municipal"]','Configuración Control G','active'),
  ('country-cu-v1','CU',1,'Cuba','es-CU','America/Havana','CUP','+53','["CARNET_IDENTIDAD","PASAPORTE"]','["provincia","municipio"]','Configuración Control G','active'),
  ('country-pr-v1','PR',1,'Puerto Rico','es-PR','America/Puerto_Rico','USD','+1','["LICENCIA","PASAPORTE"]','["municipio","barrio"]','Configuración Control G','active'),
  ('country-ve-v1','VE',1,'Venezuela','es-VE','America/Caracas','VES','+58','["CEDULA","PASAPORTE"]','["estado","municipio","parroquia"]','Configuración Control G','active'),
  ('country-ec-v1','EC',1,'Ecuador','es-EC','America/Guayaquil','USD','+593','["CEDULA","PASAPORTE"]','["provincia","canton","parroquia"]','Configuración Control G','active'),
  ('country-pe-v1','PE',1,'Perú','es-PE','America/Lima','PEN','+51','["DNI","CE","PASAPORTE"]','["departamento","provincia","distrito"]','Configuración Control G','active'),
  ('country-bo-v1','BO',1,'Bolivia','es-BO','America/La_Paz','BOB','+591','["CI","PASAPORTE"]','["departamento","provincia","municipio"]','Configuración Control G','active'),
  ('country-py-v1','PY',1,'Paraguay','es-PY','America/Asuncion','PYG','+595','["CEDULA","PASAPORTE"]','["departamento","distrito","localidad"]','Configuración Control G','active'),
  ('country-cl-v1','CL',1,'Chile','es-CL','America/Santiago','CLP','+56','["RUN","PASAPORTE"]','["region","provincia","comuna"]','Configuración Control G','active'),
  ('country-ar-v1','AR',1,'Argentina','es-AR','America/Argentina/Buenos_Aires','ARS','+54','["DNI","PASAPORTE"]','["provincia","departamento","municipio"]','Configuración Control G','active'),
  ('country-uy-v1','UY',1,'Uruguay','es-UY','America/Montevideo','UYU','+598','["CEDULA","PASAPORTE"]','["departamento","municipio","localidad"]','Configuración Control G','active')
on conflict (country_code, version) do update set
  name = excluded.name,
  locale = excluded.locale,
  timezone = excluded.timezone,
  currency_code = excluded.currency_code,
  phone_prefix = excluded.phone_prefix,
  document_types = excluded.document_types,
  administrative_levels = excluded.administrative_levels,
  updated_at = now();

update public.entities entity
set country_profile_id = profile.id
from public.country_profiles profile
where profile.country_code = entity.country_code and profile.status = 'active'
  and entity.country_profile_id is null;

insert into public.indicator_definitions (
  id, entity_id, code, version, name, question, description, category, source_table,
  calculation_type, numerator, denominator, unit, territory_level,
  minimum_group_size, methodology, warning, status
) values
  ('indicator-global-gps-coverage-v1',null,'gps_coverage',1,'Cobertura GPS','¿Qué proporción de registros válidos tiene ubicación utilizable?','Respuestas con coordenadas válidas sobre todas las respuestas filtradas.','quality','form_responses','ratio','{"latitude":"valid","longitude":"valid"}','{"all":true}','percent','municipality',5,'Numerador: respuestas con latitud entre -90 y 90, longitud entre -180 y 180 y sin 0/0. Denominador: respuestas del corte y filtros seleccionados.','La presencia de GPS no demuestra por sí sola que la visita ocurrió en la ubicación esperada.','published'),
  ('indicator-global-reviewed-v1',null,'reviewed_share',1,'Registros revisados','¿Qué proporción de registros ya pasó por revisión?','Registros en estado revisado, aprobado o rechazado sobre el total.','progress','form_responses','ratio','{"status":["reviewed","approved","rejected"]}','{"all":true}','percent','municipality',5,'Numerador: estados reviewed, approved o rejected. Denominador: respuestas del corte.','No equivale a aprobación; incluye registros rechazados.','published'),
  ('indicator-global-approved-v1',null,'approved_share',1,'Registros aprobados','¿Qué proporción de registros fue aprobada?','Registros aprobados sobre registros revisados.','quality','form_responses','ratio','{"status":["approved"]}','{"status":["reviewed","approved","rejected"]}','percent','municipality',5,'Numerador: approved. Denominador: reviewed, approved y rejected.','No calcular cuando el denominador sea cero.','published'),
  ('indicator-global-sync-lag-v1',null,'average_sync_lag',1,'Demora promedio de sincronización','¿Cuántos minutos transcurren entre captura y sincronización?','Promedio descriptivo de minutos entre captured_at y synced_at.','offline','form_responses','average','{"expression":"synced_at-captured_at"}','{"non_null":true}','minutes','entity',5,'Promedio de diferencias no negativas entre synced_at y captured_at dentro del corte.','Los valores extremos deben revisarse junto con la mediana y condiciones de conectividad.','published'),
  ('indicator-global-completeness-v1',null,'required_completeness',1,'Completitud de campos obligatorios','¿Qué proporción de campos obligatorios fue respondida?','Promedio de completitud calculado contra la versión del formulario contestada.','quality','form_responses','average','{"expression":"answered_required/required_fields"}','{"valid_form_definition":true}','percent','form',5,'Para cada respuesta se cuentan campos obligatorios con un valor no vacío y se divide por los obligatorios de la versión registrada.','Una definición de formulario ausente o distinta invalida la comparación histórica.','published')
on conflict do nothing;
