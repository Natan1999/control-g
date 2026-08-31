#!/usr/bin/env node
import { config } from 'dotenv'

config({ path: '.env.local' })
config()

const dashboardUrl = process.env.SUPABASE_DASHBOARD_URL || process.env.SUPABASE_URL
const username = process.env.DASHBOARD_USERNAME
const password = process.env.DASHBOARD_PASSWORD
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!dashboardUrl || !username || !password || !serviceRole) {
  console.error('Faltan las variables administrativas de Supabase para la verificación territorial.')
  process.exit(1)
}

const sql = String.raw`
begin;
select set_config(
  'request.jwt.claims',
  (
    select jsonb_build_object('sub', user_id, 'role', 'authenticated')::text
    from public.user_profiles where role = 'admin' and status = 'active'
    order by created_at limit 1
  ),
  true
);

do $catalog_verification$
declare
  records jsonb := '[
    {"code":"CG-TEST-0","name":"Territorio raíz de verificación","level":0,"local_type":"departamento","geometry":{"type":"Polygon","coordinates":[[[-56.3,-34.9],[-56.1,-34.9],[-56.1,-34.7],[-56.3,-34.7],[-56.3,-34.9]]]},"metadata":{"test":true}},
    {"code":"CG-TEST-1","name":"Territorio hijo de verificación","level":1,"local_type":"municipio","parent_code":"CG-TEST-0","parent_level":0,"geometry":{"type":"Polygon","coordinates":[[[-56.27,-34.87],[-56.17,-34.87],[-56.17,-34.77],[-56.27,-34.77],[-56.27,-34.87]]]},"metadata":{"test":true}}
  ]'::jsonb;
  preview_result jsonb;
  publish_result jsonb;
  target_profile text;
  base_profile text;
  root_id text;
  child_parent text;
  active_profiles integer;
  valid_geometries integer;
  per_row_audits integer;
begin
  if auth.uid() is null or not public.is_control_g_admin() then
    raise exception 'No existe un superadministrador activo para ejecutar la prueba.';
  end if;

  preview_result := public.import_jurisdiction_catalog(
    'UY', 'Control G · verificación transaccional', 'https://www.gub.uy/',
    'rollback-test', current_date, records, false, false
  );
  if preview_result->>'mode' <> 'preview' or (preview_result->>'feature_count')::integer <> 2 then
    raise exception 'La prevalidación territorial no devolvió el resultado esperado.';
  end if;

  publish_result := public.import_jurisdiction_catalog(
    'UY', 'Control G · verificación transaccional', 'https://www.gub.uy/',
    'rollback-test', current_date, records, true, false
  );
  target_profile := publish_result->>'target_profile_id';
  base_profile := publish_result->>'base_profile_id';
  if publish_result->>'mode' <> 'published' or (publish_result->>'catalog_count')::integer < 2 then
    raise exception 'La publicación territorial no produjo un catálogo verificable.';
  end if;

  select count(*) into active_profiles from public.country_profiles
  where country_code = 'UY' and status = 'active';
  if active_profiles <> 1
    or not exists(select 1 from public.country_profiles where id = base_profile and status = 'retired') then
    raise exception 'La activación atómica de la versión territorial falló.';
  end if;

  select id into root_id from public.jurisdictions
  where country_profile_id = target_profile and level = 0 and code = 'CG-TEST-0';
  select parent_id into child_parent from public.jurisdictions
  where country_profile_id = target_profile and level = 1 and code = 'CG-TEST-1';
  if root_id is null or child_parent is distinct from root_id then
    raise exception 'La jerarquía padre-hijo no fue reconstruida.';
  end if;

  select count(*) into valid_geometries from public.jurisdictions
  where country_profile_id = target_profile and geometry is not null
    and extensions.st_isvalid(geometry) and extensions.st_srid(geometry) = 4326;
  if valid_geometries < 2 then
    raise exception 'Las geometrías PostGIS no quedaron válidas en EPSG:4326.';
  end if;

  select count(*) into per_row_audits from public.audit_log
  where table_name = 'jurisdictions' and record_id in (
    select id from public.jurisdictions where country_profile_id = target_profile
  );
  if per_row_audits <> 0 then
    raise exception 'La importación produjo auditoría masiva por fila.';
  end if;
  if not exists (
    select 1 from public.audit_log where action = 'publish_jurisdiction_catalog'
      and record_id = target_profile
  ) then
    raise exception 'No se generó la auditoría resumida de publicación.';
  end if;
end;
$catalog_verification$;
rollback;
`

const authorization = Buffer.from(`${username}:${password}`).toString('base64')
const response = await fetch(`${dashboardUrl.replace(/\/$/, '')}/pg/query`, {
  method: 'POST',
  headers: {
    Authorization: `Basic ${authorization}`,
    apikey: serviceRole,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql, read_only: false }),
})
const body = await response.text()
if (!response.ok) throw new Error(`La verificación territorial falló (${response.status}): ${body}`)
console.log('Catálogo territorial verificado en Supabase: preview, publicación versionada, jerarquía, PostGIS, auditoría resumida y rollback.')
