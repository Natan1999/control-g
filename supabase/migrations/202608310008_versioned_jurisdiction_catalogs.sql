-- Governed, versioned imports of official administrative divisions.
-- A publication clones the active country profile and its current catalog,
-- merges the validated records and atomically activates the new version.

create table if not exists public.jurisdiction_import_runs (
  id text primary key default gen_random_uuid()::text,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  base_profile_id text references public.country_profiles(id) on delete set null,
  target_profile_id text references public.country_profiles(id) on delete set null,
  source_name text not null,
  source_url text,
  source_version text not null,
  input_sha256 text not null check (input_sha256 ~ '^[a-f0-9]{64}$'),
  feature_count integer not null check (feature_count between 1 and 10000),
  imported_levels smallint[] not null default '{}',
  status text not null check (status in ('preview','published')),
  result_summary jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists jurisdiction_import_runs_country_created_idx
  on public.jurisdiction_import_runs(country_code, created_at desc);

alter table public.jurisdiction_import_runs enable row level security;

drop policy if exists jurisdiction_import_runs_admin_read on public.jurisdiction_import_runs;
create policy jurisdiction_import_runs_admin_read
  on public.jurisdiction_import_runs for select to authenticated
  using (public.is_control_g_admin());

revoke all on public.jurisdiction_import_runs from public, anon, authenticated;
grant select on public.jurisdiction_import_runs to authenticated;

-- The catalog function emits one summary audit record. Suppress the generic
-- row trigger while cloning thousands of jurisdictions to avoid audit bloat.
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
  if tg_table_name = 'jurisdictions'
    and current_setting('control_g.bulk_jurisdiction_import', true) = 'on' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  target_id := coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id');
  target_entity := coalesce(to_jsonb(new)->>'entity_id', to_jsonb(old)->>'entity_id', public.current_entity_id());
  insert into public.audit_log(entity_id, user_id, action, table_name, record_id, metadata)
  values (
    target_entity, auth.uid(), lower(tg_op) || '_configuration', tg_table_name,
    target_id, jsonb_build_object('operation', tg_op, 'at', now())
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.import_jurisdiction_catalog(
  p_country_code text,
  p_source_name text,
  p_source_url text,
  p_source_version text,
  p_effective_from date,
  p_records jsonb,
  p_publish boolean default false,
  p_assign_active_entities boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  normalized_country text := upper(trim(coalesce(p_country_code, '')));
  normalized_source_name text := trim(coalesce(p_source_name, ''));
  normalized_source_url text := nullif(trim(coalesce(p_source_url, '')), '');
  normalized_source_version text := trim(coalesce(p_source_version, ''));
  effective_date date := coalesce(p_effective_from, current_date);
  feature_count integer;
  payload_size integer;
  duplicate_count integer;
  imported_levels smallint[];
  input_hash text;
  run_id text := gen_random_uuid()::text;
  base_profile public.country_profiles%rowtype;
  target_profile_id text;
  target_version integer;
  item jsonb;
  item_code text;
  item_name text;
  item_type text;
  item_parent_code text;
  item_level smallint;
  item_parent_level smallint;
  item_geometry extensions.geometry;
  item_center extensions.geometry;
  item_parent_id text;
  assigned_entities integer := 0;
  catalog_count integer := 0;
begin
  if auth.uid() is null or not public.is_control_g_admin() then
    raise exception 'Solo el superadministrador puede versionar catálogos territoriales.' using errcode = '42501';
  end if;
  if normalized_country !~ '^[A-Z]{2}$' then
    raise exception 'El código de país debe usar ISO 3166-1 alfa-2.' using errcode = '22023';
  end if;
  if length(normalized_source_name) < 3 or length(normalized_source_name) > 180 then
    raise exception 'La fuente oficial debe tener entre 3 y 180 caracteres.' using errcode = '22023';
  end if;
  if length(normalized_source_version) < 1 or length(normalized_source_version) > 80 then
    raise exception 'La versión de la fuente es obligatoria y admite hasta 80 caracteres.' using errcode = '22023';
  end if;
  if normalized_source_url is not null and normalized_source_url !~* '^https://[^[:space:]]+$' then
    raise exception 'La URL de la fuente debe usar HTTPS.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_records) <> 'array' then
    raise exception 'El catálogo debe ser un arreglo JSON.' using errcode = '22023';
  end if;

  feature_count := jsonb_array_length(p_records);
  payload_size := octet_length(convert_to(p_records::text, 'UTF8'));
  if feature_count < 1 or feature_count > 10000 then
    raise exception 'El catálogo debe contener entre 1 y 10.000 registros.' using errcode = '22023';
  end if;
  if payload_size > 12582912 then
    raise exception 'El catálogo supera el máximo de 12 MiB.' using errcode = '22023';
  end if;

  select * into base_profile
  from public.country_profiles
  where country_code = normalized_country and status = 'active'
  order by version desc
  limit 1
  for update;
  if base_profile.id is null then
    raise exception 'No existe un perfil activo para el país indicado.' using errcode = '22023';
  end if;

  select count(*) into duplicate_count
  from (
    select trim(value->>'code') as code, trim(value->>'level') as level
    from jsonb_array_elements(p_records)
    group by trim(value->>'code'), trim(value->>'level')
    having count(*) > 1
  ) duplicates;
  if duplicate_count > 0 then
    raise exception 'El catálogo contiene códigos duplicados dentro del mismo nivel.' using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(p_records) loop
    if jsonb_typeof(item) <> 'object' then
      raise exception 'Cada registro territorial debe ser un objeto JSON.' using errcode = '22023';
    end if;
    item_code := trim(coalesce(item->>'code', ''));
    item_name := trim(coalesce(item->>'name', ''));
    item_type := trim(coalesce(item->>'local_type', ''));
    if length(item_code) < 1 or length(item_code) > 100 or length(item_name) < 1 or length(item_name) > 180 then
      raise exception 'Cada registro requiere código (máx. 100) y nombre (máx. 180).' using errcode = '22023';
    end if;
    if length(item_type) < 1 or length(item_type) > 80 then
      raise exception 'Cada registro requiere un tipo administrativo de hasta 80 caracteres.' using errcode = '22023';
    end if;
    if coalesce(item->>'level', '') !~ '^[0-8]$' then
      raise exception 'El nivel administrativo debe ser un entero entre 0 y 8.' using errcode = '22023';
    end if;
    item_level := (item->>'level')::smallint;
    item_parent_code := nullif(trim(coalesce(item->>'parent_code', '')), '');
    if item_parent_code is not null then
      if coalesce(item->>'parent_level', '') !~ '^[0-8]$' then
        raise exception 'Un registro con parent_code requiere parent_level entre 0 y 8.' using errcode = '22023';
      end if;
      item_parent_level := (item->>'parent_level')::smallint;
      if item_parent_level >= item_level then
        raise exception 'El nivel padre debe ser menor que el nivel del registro.' using errcode = '22023';
      end if;
      if not exists (
        select 1 from jsonb_array_elements(p_records) candidate
        where trim(candidate->>'code') = item_parent_code
          and candidate->>'level' = item_parent_level::text
      ) and not exists (
        select 1 from public.jurisdictions existing_parent
        where existing_parent.country_profile_id = base_profile.id
          and existing_parent.code = item_parent_code
          and existing_parent.level = item_parent_level
          and existing_parent.status = 'active'
      ) then
        raise exception 'No se encontró el padre % en el nivel %.', item_parent_code, item_parent_level using errcode = '22023';
      end if;
    end if;

    if item ? 'geometry' and item->'geometry' <> 'null'::jsonb then
      begin
        item_geometry := extensions.st_multi(extensions.st_collectionextract(
          extensions.st_makevalid(extensions.st_setsrid(extensions.st_geomfromgeojson((item->'geometry')::text), 4326)), 3
        ));
        if extensions.st_isempty(item_geometry) or not extensions.st_isvalid(item_geometry) then
          raise exception 'Geometría vacía o inválida.';
        end if;
      exception when others then
        raise exception 'La geometría de % no es un Polygon/MultiPolygon WGS84 válido.', item_code using errcode = '22023';
      end;
    end if;
  end loop;

  select array_agg(distinct (value->>'level')::smallint order by (value->>'level')::smallint)
    into imported_levels from jsonb_array_elements(p_records);
  input_hash := encode(extensions.digest(convert_to(p_records::text, 'UTF8'), 'sha256'), 'hex');
  select coalesce(max(version), 0) + 1 into target_version
  from public.country_profiles where country_code = normalized_country;

  if not p_publish then
    insert into public.jurisdiction_import_runs (
      id, country_code, base_profile_id, source_name, source_url, source_version,
      input_sha256, feature_count, imported_levels, status, result_summary, created_by
    ) values (
      run_id, normalized_country, base_profile.id, normalized_source_name, normalized_source_url,
      normalized_source_version, input_hash, feature_count, imported_levels, 'preview',
      jsonb_build_object('next_version', target_version, 'mode', 'merge', 'payload_bytes', payload_size), auth.uid()
    );
    return jsonb_build_object(
      'run_id', run_id, 'mode', 'preview', 'country_code', normalized_country,
      'base_profile_id', base_profile.id, 'base_version', base_profile.version,
      'next_version', target_version, 'feature_count', feature_count,
      'imported_levels', imported_levels, 'input_sha256', input_hash,
      'assign_active_entities', p_assign_active_entities
    );
  end if;

  target_profile_id := gen_random_uuid()::text;
  update public.country_profiles set status = 'retired' where id = base_profile.id;
  insert into public.country_profiles (
    id, country_code, version, name, locale, timezone, currency_code, phone_prefix,
    document_types, administrative_levels, consent_settings, terminology,
    source_name, source_url, effective_from, status, created_by
  ) values (
    target_profile_id, base_profile.country_code, target_version, base_profile.name,
    base_profile.locale, base_profile.timezone, base_profile.currency_code, base_profile.phone_prefix,
    base_profile.document_types, base_profile.administrative_levels, base_profile.consent_settings,
    base_profile.terminology, normalized_source_name, normalized_source_url, effective_date, 'active', auth.uid()
  );

  perform set_config('control_g.bulk_jurisdiction_import', 'on', true);

  insert into public.jurisdictions (
    id, country_profile_id, parent_id, level, code, name, local_type, geometry, center,
    source_name, source_url, source_version, effective_from, effective_to, status, metadata
  )
  select
    gen_random_uuid()::text, target_profile_id, null, source_jurisdiction.level,
    source_jurisdiction.code, source_jurisdiction.name, source_jurisdiction.local_type,
    source_jurisdiction.geometry, source_jurisdiction.center, source_jurisdiction.source_name,
    source_jurisdiction.source_url, source_jurisdiction.source_version,
    source_jurisdiction.effective_from, source_jurisdiction.effective_to, source_jurisdiction.status,
    source_jurisdiction.metadata || jsonb_build_object(
      'catalog_previous_id', source_jurisdiction.id,
      'catalog_previous_parent_id', source_jurisdiction.parent_id,
      'catalog_cloned_from_version', base_profile.version
    )
  from public.jurisdictions source_jurisdiction
  where source_jurisdiction.country_profile_id = base_profile.id;

  update public.jurisdictions child
  set parent_id = parent.id
  from public.jurisdictions parent
  where child.country_profile_id = target_profile_id
    and parent.country_profile_id = target_profile_id
    and child.metadata->>'catalog_previous_parent_id' = parent.metadata->>'catalog_previous_id';

  for item in
    select value from jsonb_array_elements(p_records)
    order by (value->>'level')::smallint, trim(value->>'code')
  loop
    item_code := trim(item->>'code');
    item_name := trim(item->>'name');
    item_type := trim(item->>'local_type');
    item_level := (item->>'level')::smallint;
    item_parent_code := nullif(trim(coalesce(item->>'parent_code', '')), '');
    item_parent_id := null;
    item_geometry := null;
    item_center := null;
    if item_parent_code is not null then
      item_parent_level := (item->>'parent_level')::smallint;
      select id into item_parent_id from public.jurisdictions
      where country_profile_id = target_profile_id and code = item_parent_code
        and level = item_parent_level and status = 'active' limit 1;
      if item_parent_id is null then
        raise exception 'El padre % no quedó disponible en la nueva versión.', item_parent_code using errcode = '22023';
      end if;
    end if;
    if item ? 'geometry' and item->'geometry' <> 'null'::jsonb then
      item_geometry := extensions.st_multi(extensions.st_collectionextract(
        extensions.st_makevalid(extensions.st_setsrid(extensions.st_geomfromgeojson((item->'geometry')::text), 4326)), 3
      ));
      item_center := extensions.st_pointonsurface(item_geometry);
    end if;

    insert into public.jurisdictions (
      id, country_profile_id, parent_id, level, code, name, local_type, geometry, center,
      source_name, source_url, source_version, effective_from, status, metadata
    ) values (
      gen_random_uuid()::text, target_profile_id, item_parent_id, item_level, item_code,
      item_name, item_type, item_geometry, item_center, normalized_source_name,
      normalized_source_url, normalized_source_version, effective_date, 'active',
      case when jsonb_typeof(item->'metadata') = 'object' then item->'metadata' else '{}'::jsonb end
        || jsonb_build_object('catalog_input_sha256', input_hash)
    )
    on conflict (country_profile_id, level, code) do update set
      parent_id = coalesce(excluded.parent_id, public.jurisdictions.parent_id),
      name = excluded.name,
      local_type = excluded.local_type,
      geometry = coalesce(excluded.geometry, public.jurisdictions.geometry),
      center = coalesce(excluded.center, public.jurisdictions.center),
      source_name = excluded.source_name,
      source_url = excluded.source_url,
      source_version = excluded.source_version,
      effective_from = excluded.effective_from,
      effective_to = null,
      status = 'active',
      metadata = public.jurisdictions.metadata || excluded.metadata,
      updated_at = now();
  end loop;

  if p_assign_active_entities then
    update public.entities
    set country_profile_id = target_profile_id
    where country_code = normalized_country and status = 'active';
    get diagnostics assigned_entities = row_count;
  end if;

  select count(*) into catalog_count from public.jurisdictions
  where country_profile_id = target_profile_id and status = 'active';

  perform set_config('control_g.bulk_jurisdiction_import', 'off', true);

  insert into public.jurisdiction_import_runs (
    id, country_code, base_profile_id, target_profile_id, source_name, source_url,
    source_version, input_sha256, feature_count, imported_levels, status,
    result_summary, created_by
  ) values (
    run_id, normalized_country, base_profile.id, target_profile_id, normalized_source_name,
    normalized_source_url, normalized_source_version, input_hash, feature_count,
    imported_levels, 'published', jsonb_build_object(
      'previous_version', base_profile.version, 'published_version', target_version,
      'catalog_count', catalog_count, 'assigned_entities', assigned_entities, 'mode', 'merge'
    ), auth.uid()
  );

  insert into public.audit_log(entity_id, user_id, action, table_name, record_id, metadata)
  values (
    null, auth.uid(), 'publish_jurisdiction_catalog', 'country_profiles', target_profile_id,
    jsonb_build_object(
      'country_code', normalized_country, 'previous_version', base_profile.version,
      'published_version', target_version, 'feature_count', feature_count,
      'catalog_count', catalog_count, 'assigned_entities', assigned_entities,
      'input_sha256', input_hash, 'source_version', normalized_source_version
    )
  );

  return jsonb_build_object(
    'run_id', run_id, 'mode', 'published', 'country_code', normalized_country,
    'base_profile_id', base_profile.id, 'target_profile_id', target_profile_id,
    'published_version', target_version, 'feature_count', feature_count,
    'catalog_count', catalog_count, 'assigned_entities', assigned_entities,
    'imported_levels', imported_levels, 'input_sha256', input_hash
  );
end;
$$;

revoke all on function public.import_jurisdiction_catalog(text,text,text,text,date,jsonb,boolean,boolean) from public, anon;
grant execute on function public.import_jurisdiction_catalog(text,text,text,text,date,jsonb,boolean,boolean) to authenticated;
