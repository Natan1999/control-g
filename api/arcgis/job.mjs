import { createHash } from 'node:crypto'
import { isIP } from 'node:net'
import { createClient } from '@supabase/supabase-js'

const ALLOWED_ORIGINS = new Set([
  'https://www.controlg.co',
  'https://controlg.co',
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
])
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])
const KNOWN_ARCGIS_SUFFIXES = ['.arcgis.com', '.arcgisonline.com', '.esri.com']
const DEFAULT_FIELDS = {
  control_g_id: 'id',
  source: 'source',
  status: 'status',
  captured_at: 'captured_at',
  pending_sync: 'pending_sync',
}
const SAFE_SOURCE_FIELDS = new Set(['id', 'local_id', 'source', 'status', 'captured_at', 'synced_at', 'pending_sync'])
const SENSITIVE_IMPORT_FIELD = /(name|nombre|apellido|document|identif|cedula|dni|email|correo|phone|telefono|celular|address|direccion|birth|nacimiento|password|secret|token)/i
const FATAL_CONNECTION_ERRORS = new Set([
  'ARCGIS_SERVER_CREDENTIAL_NOT_CONFIGURED',
  'CREDENTIAL_REFERENCE_INVALID',
  'OAUTH_400',
  'OAUTH_401',
  'OAUTH_403',
  'PORTAL_URL_INVALID',
  'SERVICE_HOST_NOT_ALLOWED',
  'SERVICE_HOST_PRIVATE',
  'SERVICE_LAYER_REQUIRED',
  'SERVICE_URL_INVALID',
])

function cors(req, res) {
  const origin = String(req.headers.origin || '')
  if (ALLOWED_ORIGINS.has(origin)) res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Cache-Control', 'no-store')
}

function json(res, status, payload) {
  res.status(status).json(payload)
}

function safeMessage(value, fallback = 'La operación ArcGIS no pudo completarse.') {
  const message = typeof value === 'string' ? value : fallback
  return message.replace(/[\r\n\t]+/g, ' ').slice(0, 500)
}

function parseBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'string') return JSON.parse(req.body)
  return req.body
}

function bearerToken(req) {
  const header = String(req.headers.authorization || '')
  return header.startsWith('Bearer ') ? header.slice(7).trim() : ''
}

function createScopedClient(token) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://controlg2.dran.cloud'
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!anonKey) throw new Error('SUPABASE_ANON_KEY_NOT_CONFIGURED')
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

async function authenticate(req) {
  const token = bearerToken(req)
  if (!token) throw Object.assign(new Error('AUTH_REQUIRED'), { status: 401 })
  const client = createScopedClient(token)
  const { data: authData, error: authError } = await client.auth.getUser(token)
  if (authError || !authData.user) throw Object.assign(new Error('AUTH_INVALID'), { status: 401 })
  const { data: profile, error: profileError } = await client
    .from('user_profiles')
    .select('user_id,entity_id,role,status')
    .eq('user_id', authData.user.id)
    .single()
  if (profileError || profile?.status !== 'active' || !['admin', 'coordinator'].includes(profile?.role)) {
    throw Object.assign(new Error('FORBIDDEN'), { status: 403 })
  }
  return { client, profile }
}

function normalizedPortal(value) {
  const url = new URL(String(value || '').trim())
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('PORTAL_URL_INVALID')
  return url.toString().replace(/\/$/, '')
}

function isKnownArcGisHost(hostname) {
  const host = hostname.toLowerCase()
  return KNOWN_ARCGIS_SUFFIXES.some(suffix => host.endsWith(suffix))
}

function isPrivateHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true
  const version = isIP(host)
  if (version === 4) {
    const [a, b] = host.split('.').map(Number)
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
  }
  if (version === 6) return host === '::1' || host === '::' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe8') || host.startsWith('fe9') || host.startsWith('fea') || host.startsWith('feb')
  return false
}

function layerUrl(mapping, connection) {
  const portal = new URL(normalizedPortal(connection.portal_url))
  const input = new URL(String(mapping.service_url || '').trim())
  if (input.protocol !== 'https:' || input.username || input.password) throw new Error('SERVICE_URL_INVALID')
  if (isPrivateHost(input.hostname) || isPrivateHost(portal.hostname)) throw new Error('SERVICE_HOST_PRIVATE')
  if (!isKnownArcGisHost(input.hostname) && input.hostname.toLowerCase() !== portal.hostname.toLowerCase()) {
    throw new Error('SERVICE_HOST_NOT_ALLOWED')
  }
  const clean = input.toString().replace(/\/$/, '')
  if (/(FeatureServer|MapServer)\/\d+$/i.test(clean)) return clean
  if (!/(FeatureServer|MapServer)$/i.test(clean)) throw new Error('SERVICE_LAYER_REQUIRED')
  return `${clean}/${Number(mapping.layer_id || 0)}`
}

function credentialSecret(connection) {
  const reference = String(connection.credential_ref || '').trim()
  if (!reference) return ''
  if (!/^ARCGIS_[A-Z0-9_]{3,56}$/.test(reference)) throw new Error('CREDENTIAL_REFERENCE_INVALID')
  return String(process.env[reference] || '')
}

async function arcGisToken(connection) {
  if (connection.auth_mode === 'public') return ''
  const clientId = String(connection.client_id || '').trim()
  const clientSecret = credentialSecret(connection)
  if (!clientId || !clientSecret) throw new Error('ARCGIS_SERVER_CREDENTIAL_NOT_CONFIGURED')
  const endpoint = `${normalizedPortal(connection.portal_url)}/sharing/rest/oauth2/token`
  const response = await fetchWithRetry(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams({
      f: 'json',
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      expiration: '60',
    }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.error || !payload?.access_token) {
    throw new Error(`OAUTH_${payload?.error?.code || response.status}`)
  }
  return String(payload.access_token)
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

async function fetchWithRetry(url, options, retries = 3) {
  let response
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    response = await fetch(url, options)
    if (!RETRYABLE_STATUS.has(response.status) || attempt === retries) return response
    const retryAfter = Number(response.headers.get('retry-after'))
    const delay = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1_000, 10_000)
      : Math.min(800 * (2 ** attempt), 6_000)
    await wait(delay)
  }
  return response
}

async function postArcGis(url, token, params) {
  const body = new URLSearchParams({ f: 'json', ...params })
  if (token) body.set('token', token)
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body,
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.error) {
    const code = payload?.error?.code || response.status
    throw new Error(`ARCGIS_${code}:${safeMessage(payload?.error?.message)}`)
  }
  return payload
}

async function loadIntegration(client, { jobId, connectionId, mappingId }) {
  let job = null
  if (jobId) {
    const result = await client.from('arcgis_jobs').select('*').eq('id', jobId).single()
    if (result.error) throw Object.assign(new Error('JOB_NOT_FOUND'), { status: 404 })
    job = result.data
    connectionId = job.connection_id
    mappingId = job.mapping_id
  }
  const connectionResult = await client.from('arcgis_connections').select('*').eq('id', connectionId).single()
  if (connectionResult.error) throw Object.assign(new Error('CONNECTION_NOT_FOUND'), { status: 404 })
  let mapping = null
  if (mappingId) {
    const mappingResult = await client.from('arcgis_field_mappings').select('*').eq('id', mappingId).single()
    if (mappingResult.error) throw Object.assign(new Error('MAPPING_NOT_FOUND'), { status: 404 })
    mapping = mappingResult.data
  }
  if (job && (job.entity_id !== connectionResult.data.entity_id || mapping?.connection_id !== connectionResult.data.id)) {
    throw Object.assign(new Error('INTEGRATION_SCOPE_MISMATCH'), { status: 403 })
  }
  return { job, connection: connectionResult.data, mapping }
}

async function verifyConnection(client, connection, mapping) {
  if (!mapping) throw new Error('MAPPING_REQUIRED')
  const token = await arcGisToken(connection)
  const url = layerUrl(mapping, connection)
  const metadata = await postArcGis(url, token, {})
  const summary = {
    name: String(metadata.name || connection.name),
    geometryType: metadata.geometryType || null,
    capabilities: metadata.capabilities || null,
    maxRecordCount: Number(metadata.maxRecordCount || 0),
    hasAttachments: Boolean(metadata.hasAttachments),
    currentVersion: metadata.currentVersion || null,
  }
  await client.from('arcgis_connections').update({
    status: 'active',
    last_verified_at: new Date().toISOString(),
    last_error_code: null,
  }).eq('id', connection.id)
  return summary
}

function mappedAttributes(record, mapping) {
  const configured = mapping?.field_mapping && typeof mapping.field_mapping === 'object'
    ? mapping.field_mapping
    : DEFAULT_FIELDS
  const source = {
    id: record.id,
    local_id: record.local_id || record.id,
    source: 'response',
    status: record.status,
    captured_at: new Date(record.captured_at).getTime(),
    synced_at: record.synced_at ? new Date(record.synced_at).getTime() : null,
    pending_sync: 0,
  }
  const attributes = {}
  for (const [targetField, sourceField] of Object.entries(configured)) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(targetField)) continue
    if (!SAFE_SOURCE_FIELDS.has(String(sourceField))) continue
    attributes[targetField] = source[sourceField]
  }
  if (!Object.keys(attributes).length) return mappedAttributes(record, { field_mapping: DEFAULT_FIELDS })
  return attributes
}

function featurePayload(record, mapping) {
  return {
    geometry: {
      x: Number(record.longitude),
      y: Number(record.latitude),
      spatialReference: { wkid: 4326 },
    },
    attributes: mappedAttributes(record, mapping),
  }
}

async function exportBatch(client, job, connection, mapping) {
  const batchSize = Math.min(Math.max(Number(mapping.batch_size || 500), 1), 2_000)
  const offset = Math.max(Number.parseInt(job.cursor_value || '0', 10) || 0, 0)
  let query = client
    .from('form_responses')
    .select('id,local_id,status,captured_at,synced_at,latitude,longitude')
    .eq('entity_id', job.entity_id)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('captured_at', { ascending: true })
    .range(offset, offset + batchSize - 1)
  if (mapping.form_id) query = query.eq('form_id', mapping.form_id)
  const responseResult = await query
  if (responseResult.error) throw new Error(`SUPABASE_EXPORT_QUERY:${responseResult.error.code}`)
  const rawRecords = responseResult.data || []
  const records = rawRecords.filter(record => (
    Number.isFinite(record.latitude) && Number.isFinite(record.longitude)
    && record.latitude >= -90 && record.latitude <= 90
    && record.longitude >= -180 && record.longitude <= 180
    && !(record.latitude === 0 && record.longitude === 0)
  ))
  if (!records.length) {
    const hasMore = rawRecords.length === batchSize
    const nextStatus = hasMore ? 'pending' : 'completed'
    await client.from('arcgis_jobs').update({
      status: nextStatus,
      cursor_value: String(offset + rawRecords.length),
      last_heartbeat_at: new Date().toISOString(),
      completed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
      result_summary: { message: 'El lote no contenía coordenadas publicables.', offset, hasMore },
    }).eq('id', job.id)
    return { status: nextStatus, attempted: 0, succeeded: 0, failed: 0, hasMore }
  }

  const ids = records.map(record => record.id)
  const existingResult = await client.from('arcgis_job_items')
    .select('source_record_id,status,attempt_count').eq('job_id', job.id).in('source_record_id', ids)
  if (existingResult.error) throw new Error(`JOB_ITEMS_QUERY:${existingResult.error.code}`)
  const existingById = new Map((existingResult.data || []).map(item => [item.source_record_id, item]))
  const completed = new Set((existingResult.data || []).filter(item => item.status === 'completed').map(item => item.source_record_id))
  const pending = records.filter(record => !completed.has(record.id))
  const features = pending.map(record => featurePayload(record, mapping))
  const itemRows = pending.map((record, index) => ({
    id: `${job.id}:${record.id}:add`,
    job_id: job.id,
    entity_id: job.entity_id,
    source_record_id: record.id,
    operation: 'add',
    status: 'running',
    attempt_count: Number(existingById.get(record.id)?.attempt_count || 0) + 1,
    payload_sha256: createHash('sha256').update(JSON.stringify(features[index])).digest('hex'),
  }))
  if (itemRows.length) {
    const itemUpsert = await client.from('arcgis_job_items').upsert(itemRows, { onConflict: 'job_id,source_record_id,operation' })
    if (itemUpsert.error) throw new Error(`JOB_ITEMS_UPSERT:${itemUpsert.error.code}`)
  }

  let succeeded = 0
  let failed = 0
  if (features.length) {
    const token = await arcGisToken(connection)
    if (!token && connection.auth_mode === 'public') throw new Error('PUBLIC_CONNECTION_IS_READ_ONLY')
    const payload = await postArcGis(`${layerUrl(mapping, connection)}/addFeatures`, token, {
      rollbackOnFailure: 'false',
      features: JSON.stringify(features),
    })
    const results = Array.isArray(payload.addResults) ? payload.addResults : []
    for (let index = 0; index < pending.length; index += 1) {
      const result = results[index]
      const success = Boolean(result?.success)
      if (success) succeeded += 1
      else failed += 1
      await client.from('arcgis_job_items').update({
        status: success ? 'completed' : 'failed',
        remote_object_id: result?.objectId === undefined ? null : String(result.objectId),
        error_code: success ? null : String(result?.error?.code || 'ARCGIS_ADD_FAILED'),
        error_message: success ? null : safeMessage(result?.error?.description),
      }).eq('job_id', job.id).eq('source_record_id', pending[index].id).eq('operation', 'add')
    }
  }

  const hasMore = rawRecords.length === batchSize
  const nextStatus = failed ? 'partial' : hasMore ? 'pending' : 'completed'
  const itemCountsResult = await client.from('arcgis_job_items').select('status').eq('job_id', job.id)
  if (itemCountsResult.error) throw new Error(`JOB_ITEMS_COUNT:${itemCountsResult.error.code}`)
  const itemStatuses = itemCountsResult.data || []
  const accumulatedAttempted = itemStatuses.length
  const accumulatedSucceeded = itemStatuses.filter(item => item.status === 'completed').length
  const accumulatedFailed = itemStatuses.filter(item => item.status === 'failed').length
  await client.from('arcgis_jobs').update({
    status: nextStatus,
    cursor_value: failed ? String(offset) : hasMore ? String(offset + batchSize) : String(offset + rawRecords.length),
    attempted_count: accumulatedAttempted,
    succeeded_count: accumulatedSucceeded,
    failed_count: accumulatedFailed,
    last_heartbeat_at: new Date().toISOString(),
    completed_at: nextStatus === 'completed' || nextStatus === 'partial' ? new Date().toISOString() : null,
    result_summary: { batchSize, offset, attempted: records.length, succeeded, failed, hasMore },
  }).eq('id', job.id)
  return { status: nextStatus, attempted: records.length, succeeded, failed, hasMore }
}

function sanitizeImportedProperties(properties) {
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return {}
  const safe = {}
  for (const [key, value] of Object.entries(properties)) {
    if (Object.keys(safe).length >= 40 || !/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(key) || SENSITIVE_IMPORT_FIELD.test(key)) continue
    if (value === null || typeof value === 'number' || typeof value === 'boolean') safe[key] = value
    else if (typeof value === 'string') safe[key] = value.slice(0, 500)
  }
  return safe
}

async function importLayer(client, job, connection, mapping) {
  const token = await arcGisToken(connection)
  const baseUrl = layerUrl(mapping, connection)
  const pageSize = Math.min(Math.max(Number(mapping.batch_size || 1_000), 1), 2_000)
  const features = []
  for (let page = 0; page < 10; page += 1) {
    const body = new URLSearchParams({
      f: 'geojson',
      where: String(mapping.filter_expression || '1=1').slice(0, 1_000),
      outFields: '*',
      returnGeometry: 'true',
      outSR: '4326',
      resultOffset: String(page * pageSize),
      resultRecordCount: String(pageSize),
    })
    if (token) body.set('token', token)
    const response = await fetchWithRetry(`${baseUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', Accept: 'application/geo+json, application/json' },
      body,
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok || payload?.error || payload?.type !== 'FeatureCollection' || !Array.isArray(payload.features)) {
      throw new Error(`ARCGIS_IMPORT_${payload?.error?.code || response.status}`)
    }
    features.push(...payload.features.map(feature => ({
      type: 'Feature',
      id: feature?.id,
      geometry: feature?.geometry || null,
      properties: sanitizeImportedProperties(feature?.properties),
    })))
    if (payload.features.length < pageSize) break
  }
  if (features.length >= pageSize * 10) throw new Error('ARCGIS_IMPORT_LIMIT_20000')
  const layerName = `ArcGIS · ${connection.name}`.slice(0, 180)
  const layer = {
    entity_id: job.entity_id,
    name: layerName,
    description: `Capa importada de forma controlada el ${new Date().toISOString()}.`,
    layer_type: 'mixed',
    geojson: { type: 'FeatureCollection', features },
    color: '#3D7B9E',
    opacity: 0.28,
    visible_default: true,
    status: 'active',
    source: 'ArcGIS REST Feature Service · trabajo auditable',
    source_url: baseUrl,
    created_by: job.created_by,
  }
  const upsert = await client.from('map_layers').upsert(layer, { onConflict: 'entity_id,name' }).select('id').single()
  if (upsert.error) throw new Error(`MAP_LAYER_UPSERT:${upsert.error.code}`)
  const completedAt = new Date().toISOString()
  await client.from('arcgis_job_items').upsert({
    id: `${job.id}:layer:import`, job_id: job.id, entity_id: job.entity_id,
    source_record_id: upsert.data.id, operation: 'import', status: 'completed', attempt_count: 1,
    payload_sha256: createHash('sha256').update(JSON.stringify(layer.geojson)).digest('hex'),
  }, { onConflict: 'job_id,source_record_id,operation' })
  await client.from('arcgis_jobs').update({
    status: 'completed', attempted_count: features.length, succeeded_count: features.length,
    failed_count: 0, completed_at: completedAt, last_heartbeat_at: completedAt,
    result_summary: { layerId: upsert.data.id, featureCount: features.length },
  }).eq('id', job.id)
  return { status: 'completed', attempted: features.length, succeeded: features.length, failed: 0, hasMore: false }
}

async function processJob(client, job, connection, mapping) {
  if (!mapping || !mapping.enabled || connection.status !== 'active') throw new Error('INTEGRATION_NOT_ACTIVE')
  if (!['pending', 'partial', 'failed', 'paused'].includes(job.status)) {
    return { status: job.status, attempted: 0, succeeded: 0, failed: 0, hasMore: false }
  }
  if (job.retry_count >= job.max_retries) throw new Error('JOB_RETRY_LIMIT')
  await client.from('arcgis_jobs').update({
    status: 'running', started_at: job.started_at || new Date().toISOString(),
    last_heartbeat_at: new Date().toISOString(), error_summary: {},
  }).eq('id', job.id)
  return job.direction === 'import'
    ? importLayer(client, job, connection, mapping)
    : exportBatch(client, job, connection, mapping)
}

export default async function handler(req, res) {
  cors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return json(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED' })

  let context
  let integration
  try {
    context = await authenticate(req)
    const body = parseBody(req)
    const action = String(body.action || 'process')
    integration = await loadIntegration(context.client, {
      jobId: body.jobId ? String(body.jobId) : null,
      connectionId: body.connectionId ? String(body.connectionId) : null,
      mappingId: body.mappingId ? String(body.mappingId) : null,
    })
    if (action === 'verify') {
      const summary = await verifyConnection(context.client, integration.connection, integration.mapping)
      return json(res, 200, { ok: true, action, summary })
    }
    if (action !== 'process' || !integration.job) return json(res, 400, { ok: false, code: 'JOB_REQUIRED' })
    const result = await processJob(context.client, integration.job, integration.connection, integration.mapping)
    return json(res, 200, { ok: true, action, jobId: integration.job.id, ...result })
  } catch (error) {
    const status = Number(error?.status || 500)
    const code = safeMessage(error?.message || 'ARCGIS_JOB_FAILED', 'ARCGIS_JOB_FAILED').split(':')[0]
    if (context?.client && integration?.job?.id) {
      const job = integration.job
      await context.client.from('arcgis_jobs').update({
        status: 'failed',
        retry_count: Number(job.retry_count || 0) + 1,
        next_retry_at: new Date(Date.now() + Math.min(60_000 * (2 ** Number(job.retry_count || 0)), 3_600_000)).toISOString(),
        last_heartbeat_at: new Date().toISOString(),
        error_summary: { code },
      }).eq('id', job.id)
      if (integration.connection?.id && FATAL_CONNECTION_ERRORS.has(code)) {
        await context.client.from('arcgis_connections').update({ status: 'error', last_error_code: code })
          .eq('id', integration.connection.id)
      }
    }
    return json(res, status >= 400 && status < 600 ? status : 500, { ok: false, code })
  }
}
