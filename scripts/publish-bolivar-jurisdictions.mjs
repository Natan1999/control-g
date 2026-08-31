#!/usr/bin/env node
import { config } from 'dotenv'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

config({ path: '.env.local' })
config()

const dashboardUrl = process.env.SUPABASE_DASHBOARD_URL || process.env.SUPABASE_URL
const username = process.env.DASHBOARD_USERNAME
const password = process.env.DASHBOARD_PASSWORD
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!dashboardUrl || !username || !password || !serviceRole) {
  console.error('Faltan las variables administrativas de Supabase para publicar el catálogo DANE.')
  process.exit(1)
}

const path = fileURLToPath(new URL('../supabase/seed/bolivar-municipios-dane-2025.geojson', import.meta.url))
const geojson = JSON.parse(await readFile(path, 'utf8'))
if (geojson?.type !== 'FeatureCollection' || !Array.isArray(geojson.features) || geojson.features.length !== 46) {
  throw new Error('La capa DANE de Bolívar no contiene los 46 municipios esperados.')
}

const records = [
  {
    code: '13', name: 'Bolívar', level: 0, local_type: 'departamento',
    metadata: { dane_code: '13', coverage: 'department-root', import_engine: 'control-g-dane-v1' },
  },
  ...geojson.features.map(feature => {
    const departmentCode = String(feature.properties?.DPTO_CCDGO || '').padStart(2, '0')
    const municipalityCode = String(feature.properties?.MPIO_CCDGO || '').padStart(3, '0')
    if (departmentCode !== '13' || !/^\d{3}$/.test(municipalityCode)) throw new Error('La capa contiene un código DIVIPOLA inesperado.')
    return {
      code: `${departmentCode}${municipalityCode}`,
      name: String(feature.properties?.MPIO_CNMBRE || '').trim(),
      level: 1,
      local_type: 'municipio',
      parent_code: '13',
      parent_level: 0,
      geometry: feature.geometry,
      metadata: { dane_code: `${departmentCode}${municipalityCode}`, import_engine: 'control-g-dane-v1' },
    }
  }),
]

const jsonLiteral = JSON.stringify(records).replaceAll("'", "''")
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

do $publish_bolivar_catalog$
declare
  records jsonb := '${jsonLiteral}'::jsonb;
  publication jsonb;
  target_profile text;
  root_id text;
  municipality_count integer;
begin
  if auth.uid() is null or not public.is_control_g_admin() then
    raise exception 'No existe un superadministrador activo para publicar el catálogo DANE.';
  end if;

  select profile.id into target_profile from public.country_profiles profile
  where profile.country_code = 'CO' and profile.status = 'active'
    and exists (
      select 1 from public.jurisdictions jurisdiction
      where jurisdiction.country_profile_id = profile.id
        and jurisdiction.source_version = 'DANE-DIVIPOLA-BOLIVAR-2025'
    )
  order by profile.version desc limit 1;

  if target_profile is null then
    publication := public.import_jurisdiction_catalog(
      'CO', 'DANE · Marco Geoestadístico Nacional / DIVIPOLA 2025',
      'https://geoportal.dane.gov.co/mparcgis/rest/services/Divipola/Serv_DIVIPOLA_MGN_2025/FeatureServer/317',
      'DANE-DIVIPOLA-BOLIVAR-2025', date '2025-01-01', records, true, false
    );
    target_profile := publication->>'target_profile_id';
  end if;

  update public.entities set country_profile_id = target_profile
  where id = 'gov-bolivar-2026' and country_code = 'CO';
  if not found then raise exception 'No se encontró la entidad inicial Gobernación de Bolívar.'; end if;

  select id into root_id from public.jurisdictions
  where country_profile_id = target_profile and level = 0 and code = '13' and status = 'active';
  select count(*) into municipality_count from public.jurisdictions
  where country_profile_id = target_profile and level = 1 and parent_id = root_id
    and status = 'active' and geometry is not null and extensions.st_isvalid(geometry);

  if root_id is null or municipality_count <> 46 then
    raise exception 'El catálogo publicado no contiene la raíz Bolívar y sus 46 municipios válidos.';
  end if;
  if not exists (
    select 1 from public.entities where id = 'gov-bolivar-2026' and country_profile_id = target_profile
  ) then
    raise exception 'La entidad inicial no quedó fijada a la versión DANE.';
  end if;
end;
$publish_bolivar_catalog$;
commit;
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
if (!response.ok) throw new Error(`La publicación DANE falló (${response.status}): ${body}`)
console.log('Catálogo DANE publicado: Bolívar y 46 municipios PostGIS versionados, entidad inicial actualizada.')
