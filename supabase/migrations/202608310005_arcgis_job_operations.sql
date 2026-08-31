-- Operational ArcGIS queue for controlled, idempotent imports and exports.
-- Secrets are never stored in Postgres: credential_ref identifies a server-side
-- environment secret (for example ARCGIS_BOLIVAR_CLIENT_SECRET).

alter table public.arcgis_connections
  drop constraint if exists arcgis_connections_auth_mode_check;
alter table public.arcgis_connections
  add constraint arcgis_connections_auth_mode_check
  check (auth_mode in ('public','oauth2','app_credentials'));

alter table public.arcgis_connections
  drop constraint if exists arcgis_connections_credential_ref_check;
alter table public.arcgis_connections
  add constraint arcgis_connections_credential_ref_check
  check (credential_ref is null or credential_ref ~ '^ARCGIS_[A-Z0-9_]{3,56}$') not valid;

alter table public.arcgis_jobs
  add column if not exists idempotency_key text,
  add column if not exists request_payload jsonb not null default '{}'::jsonb,
  add column if not exists result_summary jsonb not null default '{}'::jsonb,
  add column if not exists max_retries integer not null default 5 check (max_retries between 0 and 20),
  add column if not exists last_heartbeat_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists arcgis_jobs_idempotency_idx
  on public.arcgis_jobs(entity_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.arcgis_job_items (
  id text primary key default gen_random_uuid()::text,
  job_id text not null references public.arcgis_jobs(id) on delete cascade,
  entity_id text not null references public.entities(id) on delete cascade,
  source_record_id text not null,
  operation text not null check (operation in ('add','update','attachment','import')),
  status text not null default 'pending' check (status in ('pending','running','completed','failed','skipped')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  remote_object_id text,
  payload_sha256 text check (payload_sha256 is null or payload_sha256 ~ '^[a-f0-9]{64}$'),
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_id, source_record_id, operation)
);

create index if not exists arcgis_job_items_job_status_idx
  on public.arcgis_job_items(job_id, status, created_at);

drop trigger if exists set_arcgis_jobs_updated_at on public.arcgis_jobs;
create trigger set_arcgis_jobs_updated_at before update on public.arcgis_jobs
for each row execute function public.set_updated_at();
drop trigger if exists set_arcgis_job_items_updated_at on public.arcgis_job_items;
create trigger set_arcgis_job_items_updated_at before update on public.arcgis_job_items
for each row execute function public.set_updated_at();

alter table public.arcgis_job_items enable row level security;
drop policy if exists arcgis_job_items_access on public.arcgis_job_items;
create policy arcgis_job_items_access on public.arcgis_job_items for all to authenticated
using (
  public.is_control_g_admin()
  or (entity_id = public.current_entity_id() and public.current_profile_role() in ('coordinator','support'))
)
with check (
  public.is_control_g_admin()
  or (entity_id = public.current_entity_id() and public.current_profile_role() = 'coordinator')
);
grant select, insert, update, delete on public.arcgis_job_items to authenticated;

create or replace function public.enqueue_arcgis_job(
  p_mapping_id text,
  p_direction text default null,
  p_idempotency_key text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text;
  caller_entity text;
  target_entity text;
  mapping_direction text;
  connection_id_value text;
  connection_status text;
  mapping_enabled boolean;
  requested_direction text;
  normalized_key text;
  existing_id text;
  new_id text := gen_random_uuid()::text;
begin
  select profile.role, profile.entity_id
    into caller_role, caller_entity
  from public.user_profiles profile
  where profile.user_id = auth.uid() and profile.status = 'active'
  limit 1;

  select connection.entity_id, mapping.direction, mapping.connection_id,
         connection.status, mapping.enabled
    into target_entity, mapping_direction, connection_id_value,
         connection_status, mapping_enabled
  from public.arcgis_field_mappings mapping
  join public.arcgis_connections connection on connection.id = mapping.connection_id
  where mapping.id = p_mapping_id;

  if target_entity is null then
    raise exception 'La configuración ArcGIS no existe.' using errcode = '22023';
  end if;
  if caller_role not in ('admin','coordinator')
     or (caller_role = 'coordinator' and caller_entity is distinct from target_entity) then
    raise exception 'No tienes permiso para ejecutar esta integración.' using errcode = '42501';
  end if;
  if connection_status <> 'active' or not mapping_enabled then
    raise exception 'Activa y verifica la conexión y el mapeo antes de ejecutar.' using errcode = '22023';
  end if;

  requested_direction := coalesce(nullif(trim(p_direction), ''), mapping_direction);
  if requested_direction <> mapping_direction then
    raise exception 'La dirección solicitada no coincide con el mapeo.' using errcode = '22023';
  end if;

  normalized_key := coalesce(nullif(trim(p_idempotency_key), ''), gen_random_uuid()::text);
  if char_length(normalized_key) > 128 then
    raise exception 'La clave de idempotencia es demasiado larga.' using errcode = '22023';
  end if;

  select job.id into existing_id
  from public.arcgis_jobs job
  where job.entity_id = target_entity and job.idempotency_key = normalized_key
  limit 1;
  if existing_id is not null then return existing_id; end if;

  insert into public.arcgis_jobs (
    id, entity_id, connection_id, mapping_id, direction, status,
    idempotency_key, request_payload, created_by
  ) values (
    new_id, target_entity, connection_id_value, p_mapping_id,
    requested_direction, 'pending', normalized_key,
    jsonb_build_object('requested_at', now(), 'requested_by', auth.uid()), auth.uid()
  );

  insert into public.audit_log(entity_id, user_id, action, table_name, record_id, metadata)
  values (
    target_entity, auth.uid(), 'enqueue_arcgis_job', 'arcgis_jobs', new_id,
    jsonb_build_object('mapping_id', p_mapping_id, 'direction', requested_direction)
  );
  return new_id;
end;
$$;

revoke all on function public.enqueue_arcgis_job(text,text,text) from public, anon;
grant execute on function public.enqueue_arcgis_job(text,text,text) to authenticated;

create or replace function public.cancel_arcgis_job(p_job_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text;
  caller_entity text;
  target_entity text;
begin
  select profile.role, profile.entity_id into caller_role, caller_entity
  from public.user_profiles profile
  where profile.user_id = auth.uid() and profile.status = 'active'
  limit 1;
  select job.entity_id into target_entity from public.arcgis_jobs job where job.id = p_job_id;
  if target_entity is null
     or caller_role not in ('admin','coordinator')
     or (caller_role = 'coordinator' and caller_entity is distinct from target_entity) then
    raise exception 'No tienes permiso para cancelar este trabajo.' using errcode = '42501';
  end if;
  update public.arcgis_jobs
  set status = 'cancelled', completed_at = now(), last_heartbeat_at = now()
  where id = p_job_id and status in ('pending','preview','paused','partial','failed');
end;
$$;

revoke all on function public.cancel_arcgis_job(text) from public, anon;
grant execute on function public.cancel_arcgis_job(text) to authenticated;
