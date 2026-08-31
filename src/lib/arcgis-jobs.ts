import { Capacitor } from '@capacitor/core'
import { supabase } from '@/lib/supabase'

export interface ArcGisConnectionRecord {
  id: string
  entity_id: string
  name: string
  portal_url: string
  auth_mode: 'public' | 'oauth2' | 'app_credentials'
  client_id?: string | null
  credential_ref?: string | null
  direction: 'import' | 'export' | 'controlled'
  status: 'draft' | 'active' | 'paused' | 'error' | 'revoked'
  last_verified_at?: string | null
  last_error_code?: string | null
  created_at: string
}

export interface ArcGisMappingRecord {
  id: string
  connection_id: string
  form_id?: string | null
  service_url: string
  layer_id: number
  direction: 'import' | 'export'
  field_mapping: Record<string, string>
  attachment_policy: 'none' | 'authorized'
  attachment_authorized_at?: string | null
  attachment_authorized_by?: string | null
  filter_expression?: string | null
  batch_size: number
  enabled: boolean
}

export interface ArcGisJobRecord {
  id: string
  entity_id: string
  connection_id: string
  mapping_id: string
  direction: 'import' | 'export'
  status: 'pending' | 'preview' | 'running' | 'paused' | 'completed' | 'partial' | 'failed' | 'cancelled'
  attempted_count: number
  succeeded_count: number
  failed_count: number
  retry_count: number
  error_summary?: Record<string, unknown>
  result_summary?: Record<string, unknown>
  created_at: string
  completed_at?: string | null
}

export interface ArcGisIntegrationInput {
  entityId: string
  name: string
  portalUrl: string
  authMode: ArcGisConnectionRecord['auth_mode']
  clientId?: string
  credentialRef?: string
  serviceUrl: string
  layerId: number
  direction: ArcGisMappingRecord['direction']
  formId?: string
  filterExpression?: string
  batchSize: number
  attachmentPolicy: ArcGisMappingRecord['attachment_policy']
  createdBy: string
}

export async function loadArcGisIntegrations(entityId: string) {
  const connectionsResult = await supabase.from('arcgis_connections')
    .select('*').eq('entity_id', entityId).order('created_at', { ascending: false })
  if (connectionsResult.error) throw connectionsResult.error
  const connections = connectionsResult.data as ArcGisConnectionRecord[]
  const connectionIds = connections.map(item => item.id)
  if (!connectionIds.length) return { connections, mappings: [], jobs: [] }
  const [mappingsResult, jobsResult] = await Promise.all([
    supabase.from('arcgis_field_mappings').select('*').in('connection_id', connectionIds).order('created_at', { ascending: false }),
    supabase.from('arcgis_jobs').select('*').eq('entity_id', entityId).order('created_at', { ascending: false }).limit(100),
  ])
  if (mappingsResult.error) throw mappingsResult.error
  if (jobsResult.error) throw jobsResult.error
  return {
    connections,
    mappings: mappingsResult.data as ArcGisMappingRecord[],
    jobs: jobsResult.data as ArcGisJobRecord[],
  }
}

export async function createArcGisIntegration(input: ArcGisIntegrationInput) {
  if (input.authMode !== 'public' && (!input.clientId?.trim() || !input.credentialRef?.trim())) {
    throw new Error('OAuth de aplicación requiere Client ID y referencia del secreto en el servidor.')
  }
  if (input.authMode === 'public' && input.direction === 'export') {
    throw new Error('Una conexión pública es solo de lectura. Configura OAuth para exportar.')
  }
  const attachmentPolicy = input.direction === 'export' ? input.attachmentPolicy : 'none'
  if (attachmentPolicy === 'authorized' && input.authMode === 'public') {
    throw new Error('La publicación de fotografías requiere una conexión OAuth privada.')
  }
  const connectionResult = await supabase.from('arcgis_connections').insert({
    entity_id: input.entityId,
    name: input.name.trim(),
    portal_url: input.portalUrl.trim().replace(/\/$/, ''),
    auth_mode: input.authMode,
    client_id: input.authMode === 'public' ? null : input.clientId?.trim(),
    credential_ref: input.authMode === 'public' ? null : input.credentialRef?.trim().toUpperCase(),
    direction: input.direction,
    status: 'draft',
    created_by: input.createdBy,
  }).select('*').single()
  if (connectionResult.error) throw connectionResult.error
  const mappingResult = await supabase.from('arcgis_field_mappings').insert({
    connection_id: connectionResult.data.id,
    form_id: input.formId || null,
    service_url: input.serviceUrl.trim().replace(/\/$/, ''),
    layer_id: Number(input.layerId || 0),
    direction: input.direction,
    field_mapping: input.direction === 'export'
      ? { control_g_id: 'id', source: 'source', status: 'status', captured_at: 'captured_at', pending_sync: 'pending_sync' }
      : {},
    attachment_policy: attachmentPolicy,
    attachment_authorized_at: attachmentPolicy === 'authorized' ? new Date().toISOString() : null,
    attachment_authorized_by: attachmentPolicy === 'authorized' ? input.createdBy : null,
    filter_expression: input.direction === 'import' ? input.filterExpression?.trim() || '1=1' : null,
    batch_size: Number(input.batchSize),
    enabled: true,
  }).select('*').single()
  if (mappingResult.error) {
    await supabase.from('arcgis_connections').delete().eq('id', connectionResult.data.id)
    throw mappingResult.error
  }
  return {
    connection: connectionResult.data as ArcGisConnectionRecord,
    mapping: mappingResult.data as ArcGisMappingRecord,
  }
}

function apiOrigin() {
  const configured = String(import.meta.env.VITE_CONTROL_G_API_URL || '').replace(/\/$/, '')
  if (configured) return configured
  return Capacitor.isNativePlatform() ? 'https://www.controlg.co' : ''
}

async function invokeArcGisApi(body: Record<string, unknown>) {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('La sesión venció. Inicia sesión de nuevo.')
  const response = await fetch(`${apiOrigin()}/api/arcgis/job`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.ok) {
    const messages: Record<string, string> = {
      ARCGIS_SERVER_CREDENTIAL_NOT_CONFIGURED: 'La referencia del secreto todavía no está configurada en el servidor.',
      PUBLIC_CONNECTION_IS_READ_ONLY: 'Una conexión pública no puede publicar datos.',
      SERVICE_HOST_NOT_ALLOWED: 'El servicio debe pertenecer al portal configurado o a un dominio oficial de ArcGIS.',
      INTEGRATION_NOT_ACTIVE: 'Verifica y activa la conexión antes de ejecutar el trabajo.',
      JOB_RETRY_LIMIT: 'El trabajo alcanzó el límite de reintentos y requiere revisión.',
      JOB_ALREADY_RUNNING: 'El trabajo ya está siendo procesado por otro ejecutor.',
      JOB_ALREADY_CLAIMED: 'El trabajo fue tomado por otro ejecutor. Actualiza el historial para ver su avance.',
      JOB_NOT_PROCESSABLE: 'El trabajo ya terminó o fue cancelado y no puede volver a ejecutarse.',
      ATTACHMENT_AUTHORIZATION_REQUIRED: 'La exportación de fotos requiere una autorización explícita registrada en el mapeo.',
      ARCGIS_ATTACHMENTS_NOT_SUPPORTED: 'La capa ArcGIS no tiene habilitado el soporte de adjuntos.',
      SUPABASE_ANON_KEY_NOT_CONFIGURED: 'El servicio ArcGIS no tiene configurada la clave pública de Supabase.',
    }
    throw new Error(messages[payload?.code] || `ArcGIS no pudo completar la operación (${payload?.code || response.status}).`)
  }
  return payload
}

export async function verifyArcGisIntegration(connectionId: string, mappingId: string) {
  return invokeArcGisApi({ action: 'verify', connectionId, mappingId })
}

export async function enqueueArcGisJob(mapping: ArcGisMappingRecord) {
  const { data, error } = await supabase.rpc('enqueue_arcgis_job', {
    p_mapping_id: mapping.id,
    p_direction: mapping.direction,
    p_idempotency_key: `${mapping.id}:${crypto.randomUUID()}`,
  })
  if (error) throw error
  return String(data)
}

export async function processArcGisJob(jobId: string, maxBatches = 50) {
  let result: any = null
  for (let batch = 0; batch < maxBatches; batch += 1) {
    result = await invokeArcGisApi({ action: 'process', jobId })
    if (!result.hasMore || result.status !== 'pending') return result
  }
  throw new Error('El trabajo supera el máximo de lotes interactivos. Continúa la ejecución desde el historial.')
}

export async function cancelArcGisJob(jobId: string) {
  const { error } = await supabase.rpc('cancel_arcgis_job', { p_job_id: jobId })
  if (error) throw error
}
