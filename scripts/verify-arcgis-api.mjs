#!/usr/bin/env node
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })
config()

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const apiOrigin = String(process.env.CONTROL_G_API_URL || 'https://www.controlg.co').replace(/\/$/, '')
const options = { auth: { persistSession: false, autoRefreshToken: false } }

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('Faltan Supabase URL, anon key o service role key para la prueba ArcGIS.')
  process.exit(1)
}

const service = createClient(supabaseUrl, serviceRoleKey, options)
const authenticated = createClient(supabaseUrl, anonKey, options)
const stamp = `${Date.now()}-${randomUUID().slice(0, 8)}`
const email = `arcgis.verificacion.${stamp}@controlg.test`
const password = `Cg!${randomUUID()}Aa1`
const connectionId = randomUUID()
const mappingId = randomUUID()
const connectionName = `ArcGIS E2E ${stamp}`
let userId = null
let jobId = null
let mapLayerId = null

function ensure(condition, message) {
  if (!condition) throw new Error(message)
}

async function callApi(body, accessToken) {
  const response = await fetch(`${apiOrigin}/api/arcgis/job`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.ok) throw new Error(`API ArcGIS ${response.status}: ${payload?.code || 'respuesta inválida'}`)
  return payload
}

try {
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: 'Administrador temporal ArcGIS E2E' },
  })
  if (createError) throw createError
  userId = created.user?.id
  ensure(userId, 'No se creó el usuario temporal ArcGIS.')
  const { error: profileError } = await service.from('user_profiles').upsert({
    user_id: userId,
    email,
    full_name: 'Administrador temporal ArcGIS E2E',
    role: 'admin',
    entity_id: null,
    status: 'active',
  }, { onConflict: 'user_id' })
  if (profileError) throw profileError

  const { data: session, error: loginError } = await authenticated.auth.signInWithPassword({ email, password })
  if (loginError) throw loginError
  const accessToken = session.session?.access_token
  ensure(accessToken, 'No se obtuvo JWT para probar la API ArcGIS.')

  const { error: connectionError } = await authenticated.from('arcgis_connections').insert({
    id: connectionId,
    entity_id: 'gov-bolivar-2026',
    name: connectionName,
    portal_url: 'https://www.arcgis.com',
    auth_mode: 'public',
    direction: 'import',
    status: 'draft',
    created_by: userId,
  })
  if (connectionError) throw connectionError
  const { error: mappingError } = await authenticated.from('arcgis_field_mappings').insert({
    id: mappingId,
    connection_id: connectionId,
    service_url: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/USA_Counties_Generalized_Boundaries/FeatureServer/0',
    layer_id: 0,
    direction: 'import',
    field_mapping: {},
    attachment_policy: 'none',
    filter_expression: 'OBJECTID <= 2',
    batch_size: 10,
    enabled: true,
  })
  if (mappingError) throw mappingError

  const verification = await callApi({ action: 'verify', connectionId, mappingId }, accessToken)
  ensure(verification.summary?.geometryType === 'esriGeometryPolygon', 'La API no verificó la geometría del Feature Service.')

  const { data: enqueued, error: enqueueError } = await authenticated.rpc('enqueue_arcgis_job', {
    p_mapping_id: mappingId,
    p_direction: 'import',
    p_idempotency_key: `arcgis-e2e:${stamp}`,
  })
  if (enqueueError) throw enqueueError
  jobId = enqueued
  ensure(jobId, 'Supabase no encoló el trabajo ArcGIS.')

  const processed = await callApi({ action: 'process', jobId }, accessToken)
  ensure(processed.status === 'completed' && processed.succeeded === 2, 'La importación ArcGIS no terminó con dos polígonos.')
  const { data: job, error: jobError } = await authenticated.from('arcgis_jobs')
    .select('status,attempted_count,succeeded_count,failed_count,result_summary').eq('id', jobId).single()
  if (jobError) throw jobError
  ensure(job.status === 'completed' && job.succeeded_count === 2 && job.failed_count === 0, 'La cola no conservó los conteos de la importación.')

  const { data: layer, error: layerError } = await authenticated.from('map_layers')
    .select('id,geojson,source_url').eq('entity_id', 'gov-bolivar-2026').eq('name', `ArcGIS · ${connectionName}`).single()
  if (layerError) throw layerError
  mapLayerId = layer.id
  ensure(layer.geojson?.type === 'FeatureCollection' && layer.geojson.features?.length === 2, 'La capa interna no conservó los dos polígonos importados.')
  ensure(layer.geojson.features.every(feature => Object.values(feature.properties || {}).every(value => (
    value === null || ['string', 'number', 'boolean'].includes(typeof value)
  ))), 'La importación conservó atributos complejos no permitidos.')

  console.log(`ArcGIS E2E verificado: API autenticada, servicio público, cola, importación y mapa interno (${job.succeeded_count} polígonos).`)
} finally {
  if (mapLayerId) await service.from('map_layers').delete().eq('id', mapLayerId)
  await service.from('arcgis_connections').delete().eq('id', connectionId)
  await service.from('audit_log').delete().in('record_id', [connectionId, mappingId, jobId].filter(Boolean))
  if (userId) {
    await service.from('user_profiles').delete().eq('user_id', userId)
    await service.auth.admin.deleteUser(userId)
  }
}
