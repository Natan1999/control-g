#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })
config()

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
let testEmail = process.env.CONTROL_G_TEST_EMAIL
let testPassword = process.env.CONTROL_G_TEST_PASSWORD
const bootstrapTestAdmin = process.env.CONTROL_G_BOOTSTRAP_TEST_ADMIN === 'true'

if (!url || !anonKey || !serviceRoleKey || (!bootstrapTestAdmin && (!testEmail || !testPassword))) {
  console.error('Faltan URL, claves de Supabase o credenciales de prueba.')
  process.exit(1)
}

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } }
const adminClient = createClient(url, anonKey, clientOptions)
const serviceClient = createClient(url, serviceRoleKey, clientOptions)
const temporaryEmail = `verificacion.${Date.now()}@controlg.test`
const temporaryPassword = `Cg!${randomUUID()}Aa1`
const localId = `verification-${randomUUID()}`
let temporaryUserId = null
let uploadedPath = null
let temporaryFormAssignmentId = null
let temporaryVersionedFormId = null
let bootstrapAdminId = null
let evidenceId = null
let foreignEvidenceId = null
let reportRunId = null
let sensitiveAccessId = null
let arcGisConnectionId = null
let arcGisMappingId = null
let arcGisJobId = null
let snapshotIds = []
let retentionPolicyId = null
let retentionRunIds = []

function ensure(condition, message) {
  if (!condition) throw new Error(message)
}

try {
  if (bootstrapTestAdmin) {
    testEmail = `admin.verificacion.${Date.now()}@controlg.test`
    testPassword = `Cg!${randomUUID()}Aa1`
    const { data: bootstrapUser, error: bootstrapError } = await serviceClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Administrador temporal de verificación' },
    })
    if (bootstrapError) throw bootstrapError
    bootstrapAdminId = bootstrapUser.user?.id
    ensure(bootstrapAdminId, 'No se creó el administrador temporal de verificación.')
    const { error: bootstrapProfileError } = await serviceClient.from('user_profiles').upsert({
      user_id: bootstrapAdminId,
      email: testEmail,
      full_name: 'Administrador temporal de verificación',
      role: 'admin',
      entity_id: null,
      status: 'active',
    }, { onConflict: 'user_id' })
    if (bootstrapProfileError) throw bootstrapProfileError
  }

  const { data: session, error: loginError } = await adminClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  })
  if (loginError) throw loginError
  ensure(session.user, 'No se creó la sesión de prueba.')

  const { data: profile, error: profileError } = await adminClient
    .from('user_profiles')
    .select('role,entity_id,status')
    .eq('user_id', session.user.id)
    .single()
  if (profileError) throw profileError
  ensure(profile.role === 'admin' && profile.status === 'active', 'El perfil administrador no es válido.')

  const { count: formCount, error: formError } = await adminClient
    .from('forms')
    .select('id', { count: 'exact', head: true })
    .eq('entity_id', 'gov-bolivar-2026')
    .eq('status', 'published')
  if (formError) throw formError
  ensure(formCount === 5, `Se esperaban 5 formularios y se encontraron ${formCount}.`)

  const { count: municipalityCount, error: municipalityError } = await adminClient
    .from('entity_municipalities')
    .select('id', { count: 'exact', head: true })
    .eq('entity_id', 'gov-bolivar-2026')
  if (municipalityError) throw municipalityError
  ensure(municipalityCount === 5, `Se esperaban 5 municipios y se encontraron ${municipalityCount}.`)

  const { count: assignmentCount, error: assignmentError } = await adminClient
    .from('professional_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('entity_id', 'gov-bolivar-2026')
  if (assignmentError) throw assignmentError
  ensure(assignmentCount >= 5, `Se esperaban al menos 5 asignaciones y se encontraron ${assignmentCount}.`)

  const { data: countryProfiles, error: countryProfilesError } = await adminClient
    .from('country_profiles')
    .select('id,country_code,status')
    .eq('status', 'active')
  if (countryProfilesError) throw countryProfilesError
  ensure(countryProfiles.length === 20, `Se esperaban 20 perfiles de país y se encontraron ${countryProfiles.length}.`)
  ensure(countryProfiles.some(profile => profile.country_code === 'GT'), 'Falta el perfil piloto de Guatemala.')
  ensure(countryProfiles.some(profile => profile.country_code === 'BR'), 'Falta el perfil de Brasil.')

  const { data: indicators, error: indicatorsError } = await adminClient
    .from('indicator_definitions')
    .select('id,code,version,status')
    .eq('status', 'published')
  if (indicatorsError) throw indicatorsError
  ensure(indicators.length >= 5, 'No se cargó el diccionario global de indicadores.')

  temporaryVersionedFormId = `verification-form-${randomUUID()}`
  const initialDefinition = JSON.stringify([{ id: 'page-1', title: 'Versión 1', fields: [{ id: 'question-1', type: 'text', label: 'Pregunta inicial', required: true }] }])
  const updatedDefinition = JSON.stringify([{ id: 'page-1', title: 'Versión 2', fields: [{ id: 'question-1', type: 'text', label: 'Pregunta actualizada', required: true }] }])
  const { data: versionedForm, error: versionedFormError } = await adminClient.from('forms').insert({
    id: temporaryVersionedFormId,
    entity_id: 'gov-bolivar-2026',
    name: 'Formulario temporal versionado',
    title: 'Formulario temporal versionado',
    type: 'ex_ante',
    definition: initialDefinition,
    pages_json: initialDefinition,
    status: 'published',
    version: 1,
    v: 1,
  }).select('id,version').single()
  if (versionedFormError) throw versionedFormError
  ensure(versionedForm.version === 1, 'La versión inicial del formulario no fue 1.')

  const { data: updatedForm, error: updatedFormError } = await adminClient.from('forms')
    .update({ definition: updatedDefinition, pages_json: updatedDefinition })
    .eq('id', temporaryVersionedFormId)
    .select('id,version')
    .single()
  if (updatedFormError) throw updatedFormError
  ensure(updatedForm.version === 2, 'Editar la definición no generó una nueva versión.')

  const { data: formVersions, error: formVersionsError } = await adminClient.from('form_versions')
    .select('version,definition_sha256')
    .eq('form_id', temporaryVersionedFormId)
    .order('version')
  if (formVersionsError) throw formVersionsError
  ensure(
    formVersions.length === 2
      && formVersions[0].version === 1
      && formVersions[1].version === 2
      && formVersions[0].definition_sha256 !== formVersions[1].definition_sha256,
    'El historial inmutable de formularios no conservó ambas definiciones.',
  )

  const { data: assignedForm, error: formLookupError } = await adminClient
    .from('forms')
    .select('id')
    .eq('entity_id', 'gov-bolivar-2026')
    .eq('status', 'published')
    .limit(1)
    .single()
  if (formLookupError) throw formLookupError

  const { data: created, error: createError } = await adminClient.rpc('admin_create_user', {
    p_email: temporaryEmail,
    p_password: temporaryPassword,
    p_full_name: 'Verificación automática Control G',
    p_role: 'professional',
    p_entity_id: 'gov-bolivar-2026',
  })
  if (createError) throw createError
  temporaryUserId = created?.user?.id
  ensure(temporaryUserId, 'La RPC no devolvió el usuario creado.')

  temporaryFormAssignmentId = randomUUID()
  const { error: formAssignmentError } = await adminClient.from('form_assignments').insert({
    id: temporaryFormAssignmentId,
    entity_id: 'gov-bolivar-2026',
    form_id: assignedForm.id,
    professional_id: temporaryUserId,
    assigned_by: session.user.id,
    status: 'active',
  })
  if (formAssignmentError) throw formAssignmentError

  const professionalClient = createClient(url, anonKey, clientOptions)
  const { data: professionalSession, error: professionalLoginError } = await professionalClient.auth.signInWithPassword({
    email: temporaryEmail,
    password: temporaryPassword,
  })
  if (professionalLoginError) throw professionalLoginError
  ensure(professionalSession.user?.id === temporaryUserId, 'La cuenta creada no pudo autenticarse.')

  const { data: assuranceLevel, error: assuranceLevelError } = await professionalClient.auth.mfa.getAuthenticatorAssuranceLevel()
  if (assuranceLevelError) throw assuranceLevelError
  ensure(assuranceLevel.currentLevel === 'aal1', 'La instancia Auth no informó el nivel AAL1 esperado.')
  const { data: availableFactors, error: availableFactorsError } = await professionalClient.auth.mfa.listFactors()
  if (availableFactorsError) throw availableFactorsError
  ensure(availableFactors.totp.length === 0, 'La cuenta temporal no debía tener factores TOTP previos.')

  const { data: hiddenFormVersions, error: hiddenFormVersionsError } = await professionalClient
    .from('form_versions')
    .select('id')
    .eq('form_id', temporaryVersionedFormId)
  if (hiddenFormVersionsError) throw hiddenFormVersionsError
  ensure(hiddenFormVersions.length === 0, 'Un profesional pudo consultar el historial interno de versiones.')

  const { data: visibleEntities, error: entitiesError } = await professionalClient
    .from('entities')
    .select('id')
  if (entitiesError) throw entitiesError
  ensure(visibleEntities.length === 1 && visibleEntities[0].id === 'gov-bolivar-2026', 'Falló el aislamiento por entidad.')

  const { error: forbiddenError } = await professionalClient.rpc('admin_create_user', {
    p_email: `forbidden.${Date.now()}@controlg.test`,
    p_password: temporaryPassword,
    p_full_name: 'Intento no autorizado',
    p_role: 'admin',
    p_entity_id: null,
  })
  ensure(forbiddenError, 'Un profesional pudo crear cuentas administrativas.')

  uploadedPath = `gov-bolivar-2026/${temporaryUserId}/verification/pixel.png`
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
  const { error: uploadError } = await professionalClient.storage
    .from('field-photos')
    .upload(uploadedPath, pixel, { contentType: 'image/png', upsert: true })
  if (uploadError) throw uploadError

  evidenceId = randomUUID()
  const pixelSha256 = createHash('sha256').update(pixel).digest('hex')
  const { error: evidenceError } = await professionalClient.from('evidence_files').insert({
    id: evidenceId,
    entity_id: 'gov-bolivar-2026',
    local_id: evidenceId,
    parent_type: 'form_response',
    parent_local_id: localId,
    field_id: 'photo',
    bucket_id: 'field-photos',
    storage_path: uploadedPath,
    media_type: 'photo',
    mime_type: 'image/png',
    size_bytes: pixel.length,
    sha256: pixelSha256,
    captured_at: new Date().toISOString(),
    created_by: temporaryUserId,
  })
  if (evidenceError) throw evidenceError

  foreignEvidenceId = randomUUID()
  const { error: foreignEvidenceError } = await serviceClient.from('evidence_files').insert({
    id: foreignEvidenceId,
    entity_id: 'gov-bolivar-2026',
    local_id: foreignEvidenceId,
    parent_type: 'other',
    parent_local_id: `foreign-${localId}`,
    bucket_id: 'field-photos',
    storage_path: `gov-bolivar-2026/admin-verification/${foreignEvidenceId}.txt`,
    media_type: 'document',
    mime_type: 'text/plain',
    size_bytes: 1,
    sha256: '0'.repeat(64),
    captured_at: new Date().toISOString(),
    created_by: session.user.id,
  })
  if (foreignEvidenceError) throw foreignEvidenceError

  const { data: professionalEvidence, error: professionalEvidenceError } = await professionalClient
    .from('evidence_files')
    .select('id')
    .in('id', [evidenceId, foreignEvidenceId])
  if (professionalEvidenceError) throw professionalEvidenceError
  ensure(
    professionalEvidence.length === 1 && professionalEvidence[0].id === evidenceId,
    'El profesional pudo leer el manifiesto de evidencia de otro usuario.',
  )

  const { error: forbiddenIndicatorError } = await professionalClient.from('indicator_definitions').insert({
    entity_id: 'gov-bolivar-2026',
    code: `forbidden_${Date.now()}`,
    name: 'Intento no autorizado',
    question: 'No debe crearse',
    source_table: 'form_responses',
    calculation_type: 'count',
    methodology: 'Prueba',
  })
  ensure(forbiddenIndicatorError, 'Un profesional pudo crear indicadores institucionales.')

  const { data: visibleForms, error: visibleFormsError } = await professionalClient
    .from('forms')
    .select('id')
    .eq('entity_id', 'gov-bolivar-2026')
    .eq('status', 'published')
  if (visibleFormsError) throw visibleFormsError
  ensure(
    visibleForms.length === 1 && visibleForms[0].id === assignedForm.id,
    'El profesional no recibió exclusivamente el formulario asignado.',
  )

  const { data: visibleLayers, error: visibleLayersError } = await professionalClient
    .from('map_layers')
    .select('id,entity_id')
    .eq('status', 'active')
  if (visibleLayersError) throw visibleLayersError
  ensure(
    visibleLayers.some(layer => layer.id === 'layer-bolivar-municipios-dane-2025')
      && visibleLayers.every(layer => layer.entity_id === 'gov-bolivar-2026'),
    'El profesional no recibió exclusivamente las capas GIS de su entidad.',
  )

  const { error: forbiddenLayerError } = await professionalClient.from('map_layers').insert({
    id: `forbidden-layer-${randomUUID()}`,
    entity_id: 'gov-bolivar-2026',
    name: 'Intento GIS no autorizado',
    layer_type: 'points',
    geojson: { type: 'Point', coordinates: [-75.48, 10.39] },
  })
  ensure(forbiddenLayerError, 'Un profesional pudo crear capas GIS institucionales.')

  arcGisConnectionId = randomUUID()
  arcGisMappingId = randomUUID()
  const { error: arcGisConnectionError } = await adminClient.from('arcgis_connections').insert({
    id: arcGisConnectionId,
    entity_id: 'gov-bolivar-2026',
    name: `Verificación ArcGIS ${Date.now()} ${arcGisConnectionId.slice(0, 8)}`,
    portal_url: 'https://www.arcgis.com',
    auth_mode: 'public',
    direction: 'import',
    status: 'active',
    created_by: session.user.id,
  })
  if (arcGisConnectionError) throw arcGisConnectionError
  const { error: arcGisMappingError } = await adminClient.from('arcgis_field_mappings').insert({
    id: arcGisMappingId,
    connection_id: arcGisConnectionId,
    service_url: 'https://services.arcgis.com/control-g-verification/ArcGIS/rest/services/Verification/FeatureServer/0',
    layer_id: 0,
    direction: 'import',
    field_mapping: {},
    attachment_policy: 'none',
    filter_expression: '1=1',
    batch_size: 100,
    enabled: true,
  })
  if (arcGisMappingError) throw arcGisMappingError

  const idempotencyKey = `verification:${randomUUID()}`
  const { data: firstArcGisJob, error: firstArcGisJobError } = await adminClient.rpc('enqueue_arcgis_job', {
    p_mapping_id: arcGisMappingId,
    p_direction: 'import',
    p_idempotency_key: idempotencyKey,
  })
  if (firstArcGisJobError) throw firstArcGisJobError
  arcGisJobId = firstArcGisJob
  const { data: repeatedArcGisJob, error: repeatedArcGisJobError } = await adminClient.rpc('enqueue_arcgis_job', {
    p_mapping_id: arcGisMappingId,
    p_direction: 'import',
    p_idempotency_key: idempotencyKey,
  })
  if (repeatedArcGisJobError) throw repeatedArcGisJobError
  ensure(arcGisJobId && repeatedArcGisJob === arcGisJobId, 'La cola ArcGIS no respetó la clave de idempotencia.')

  const { error: forbiddenArcGisJobError } = await professionalClient.rpc('enqueue_arcgis_job', {
    p_mapping_id: arcGisMappingId,
    p_direction: 'import',
    p_idempotency_key: `forbidden:${randomUUID()}`,
  })
  ensure(forbiddenArcGisJobError, 'Un profesional pudo crear trabajos ArcGIS.')
  const { data: hiddenArcGisJobs, error: hiddenArcGisJobsError } = await professionalClient
    .from('arcgis_jobs').select('id').eq('id', arcGisJobId)
  if (hiddenArcGisJobsError) throw hiddenArcGisJobsError
  ensure(hiddenArcGisJobs.length === 0, 'Un profesional pudo consultar la cola ArcGIS administrativa.')

  const arcGisItemPayload = JSON.stringify({ type: 'Feature', verification: true })
  const { error: arcGisItemError } = await adminClient.from('arcgis_job_items').upsert({
    id: `${arcGisJobId}:verification:import`,
    job_id: arcGisJobId,
    entity_id: 'gov-bolivar-2026',
    source_record_id: 'verification',
    operation: 'import',
    status: 'completed',
    attempt_count: 1,
    payload_sha256: createHash('sha256').update(arcGisItemPayload).digest('hex'),
  }, { onConflict: 'job_id,source_record_id,operation' })
  if (arcGisItemError) throw arcGisItemError
  const { error: cancelArcGisJobError } = await adminClient.rpc('cancel_arcgis_job', { p_job_id: arcGisJobId })
  if (cancelArcGisJobError) throw cancelArcGisJobError
  const { data: cancelledArcGisJob, error: cancelledArcGisJobError } = await adminClient
    .from('arcgis_jobs').select('status').eq('id', arcGisJobId).single()
  if (cancelledArcGisJobError) throw cancelledArcGisJobError
  ensure(cancelledArcGisJob.status === 'cancelled', 'La RPC ArcGIS no canceló el trabajo pendiente.')

  const capturedAt = new Date().toISOString()
  const routeCapture = {
    captureType: 'geotrace',
    geometryType: 'LineString',
    coordinates: [[-75.479, 10.391], [-75.478, 10.392], [-75.477, 10.393]],
    vertices: [
      { longitude: -75.479, latitude: 10.391, accuracyM: 7.5, altitudeM: 12, timestamp: Date.now() },
      { longitude: -75.478, latitude: 10.392, accuracyM: 8, altitudeM: 12, timestamp: Date.now() + 1_000 },
      { longitude: -75.477, latitude: 10.393, accuracyM: 9, altitudeM: 12, timestamp: Date.now() + 2_000 },
    ],
    complete: true,
    capturedAt,
    updatedAt: capturedAt,
  }
  const polygonCapture = {
    captureType: 'geoshape',
    geometryType: 'Polygon',
    coordinates: [[-75.480, 10.390], [-75.476, 10.390], [-75.476, 10.394], [-75.480, 10.394]],
    vertices: [
      { longitude: -75.480, latitude: 10.390, accuracyM: 6, altitudeM: 12, timestamp: Date.now() },
      { longitude: -75.476, latitude: 10.390, accuracyM: 7, altitudeM: 12, timestamp: Date.now() + 1_000 },
      { longitude: -75.476, latitude: 10.394, accuracyM: 8, altitudeM: 12, timestamp: Date.now() + 2_000 },
      { longitude: -75.480, latitude: 10.394, accuracyM: 9, altitudeM: 12, timestamp: Date.now() + 3_000 },
    ],
    complete: true,
    capturedAt,
    updatedAt: capturedAt,
  }
  const responseAnswers = { verification: true, photo: uploadedPath, verification_route: routeCapture, verification_zone: polygonCapture }
  const response = {
    form_id: assignedForm.id,
    entity_id: 'gov-bolivar-2026',
    family_id: null,
    professional_id: temporaryUserId,
    municipality_id: 'bolivar-mahates',
    local_id: localId,
    answers: responseAnswers,
    answers_json: JSON.stringify(responseAnswers),
    latitude: 10.391,
    longitude: -75.479,
    captured_at: capturedAt,
    form_version: 1,
    accuracy_m: 7.5,
    altitude_m: 12,
    location_provider: 'verification_gnss',
    device_timestamp: new Date().toISOString(),
    mocked_signal: false,
    geo_quality_status: 'good',
    geo_quality_notes: 'Verificación automatizada',
    original_latitude: 10.391,
    original_longitude: -75.479,
    status: 'synced',
  }
  const { data: firstSync, error: firstSyncError } = await professionalClient
    .from('form_responses')
    .upsert(response, { onConflict: 'local_id' })
    .select('id')
    .single()
  if (firstSyncError) throw firstSyncError

  const { data: repeatedSync, error: repeatedSyncError } = await professionalClient
    .from('form_responses')
    .upsert({ ...response, answers: { ...responseAnswers, verification: 'repeated' } }, { onConflict: 'local_id' })
    .select('id')
    .single()
  if (repeatedSyncError) throw repeatedSyncError
  ensure(firstSync.id === repeatedSync.id, 'La sincronización repetida creó un duplicado.')

  const { data: spatialFeatures, error: spatialFeaturesError } = await professionalClient
    .from('spatial_features')
    .select('id,response_id,geometry_type,vertex_count,length_m,area_m2,maximum_accuracy_m')
    .eq('response_id', firstSync.id)
    .order('geometry_type')
  if (spatialFeaturesError) throw spatialFeaturesError
  ensure(
    spatialFeatures.length === 2
      && spatialFeatures.some(feature => feature.geometry_type === 'LineString' && feature.vertex_count === 3 && feature.length_m > 0)
      && spatialFeatures.some(feature => feature.geometry_type === 'Polygon' && feature.vertex_count === 4 && feature.area_m2 > 0)
      && spatialFeatures.every(feature => feature.maximum_accuracy_m > 0),
    'El trigger PostGIS no extrajo el recorrido y el polígono con sus métricas.',
  )
  const { error: forbiddenSpatialInsertError } = await professionalClient.from('spatial_features').insert({
    id: `forbidden-spatial-${randomUUID()}`,
    entity_id: 'gov-bolivar-2026',
    response_id: firstSync.id,
    response_local_id: localId,
    form_id: assignedForm.id,
    field_id: 'forbidden',
    professional_id: temporaryUserId,
    geometry_type: 'LineString',
    geometry: 'LINESTRING(-75.479 10.391,-75.478 10.392)',
    geojson: { type: 'Feature', geometry: { type: 'LineString', coordinates: [[-75.479, 10.391], [-75.478, 10.392]] }, properties: {} },
    vertex_count: 2,
    captured_at: capturedAt,
  })
  ensure(forbiddenSpatialInsertError, 'Un profesional pudo escribir directamente en la tabla espacial derivada.')

  const { data: spatialResponse, error: spatialResponseError } = await serviceClient
    .from('form_responses')
    .select('id,latitude,longitude,location,accuracy_m,location_provider,geo_quality_status,original_latitude,original_longitude')
    .eq('local_id', localId)
    .single()
  if (spatialResponseError) throw spatialResponseError
  ensure(
    spatialResponse.latitude === 10.391
      && spatialResponse.longitude === -75.479
      && spatialResponse.location
      && spatialResponse.accuracy_m === 7.5
      && spatialResponse.location_provider === 'verification_gnss'
      && spatialResponse.geo_quality_status === 'good'
      && spatialResponse.original_latitude === 10.391,
    'PostGIS o la trazabilidad de calidad GPS no se conservaron.',
  )

  reportRunId = randomUUID()
  const { error: reportRunError } = await adminClient.from('report_runs').insert({
    id: reportRunId,
    entity_id: 'gov-bolivar-2026',
    report_type: 'verification',
    output_format: 'pdf',
    cutoff_at: new Date().toISOString(),
    methodology_version: 'control-g-analytics-v1',
    status: 'completed',
    row_count: 1,
    created_by: session.user.id,
    completed_at: new Date().toISOString(),
  })
  if (reportRunError) throw reportRunError

  const { data: loggedAccess, error: sensitiveAccessError } = await adminClient.rpc('record_sensitive_access', {
    p_action: 'verification_export',
    p_resource_type: 'analytics_report',
    p_resource_id: reportRunId,
    p_purpose: 'Verificación integral automatizada',
    p_metadata: { non_sensitive: true },
  })
  if (sensitiveAccessError) throw sensitiveAccessError
  sensitiveAccessId = loggedAccess
  ensure(sensitiveAccessId, 'No se registró la finalidad del acceso sensible.')

  const snapshotCutoff = new Date().toISOString()
  const snapshotFilter = { verification_run: localId, formId: assignedForm.id }
  const { data: snapshotSummary, error: snapshotError } = await adminClient.rpc('run_indicator_snapshots', {
    p_entity_id: 'gov-bolivar-2026',
    p_cutoff_at: snapshotCutoff,
    p_filter_context: snapshotFilter,
  })
  if (snapshotError) throw snapshotError
  ensure(snapshotSummary?.snapshot_count >= 5 && snapshotSummary?.engine === 'control-g-server-v1', 'El servidor no generó snapshots reproducibles.')
  const { data: snapshotRows, error: snapshotRowsError } = await adminClient.from('indicator_snapshots')
    .select('id,indicator_value,sample_size,suppressed,calculation_metadata,indicator_definitions!inner(code)')
    .eq('entity_id', 'gov-bolivar-2026')
    .contains('filter_context', { verification_run: localId })
  if (snapshotRowsError) throw snapshotRowsError
  snapshotIds = snapshotRows.map(item => item.id)
  ensure(snapshotRows.length === snapshotSummary.snapshot_count, 'El resumen de snapshots no coincide con las filas persistidas.')
  const gpsSnapshot = snapshotRows.find(item => item.indicator_definitions?.code === 'gps_coverage' && item.sample_size === 1)
  ensure(gpsSnapshot?.indicator_value === 100 && gpsSnapshot.suppressed === true && gpsSnapshot.calculation_metadata?.engine === 'control-g-server-v1', 'El snapshot GPS o la supresión de grupo pequeño no son reproducibles.')
  const { error: forbiddenSnapshotError } = await professionalClient.rpc('run_indicator_snapshots', {
    p_entity_id: 'gov-bolivar-2026', p_cutoff_at: snapshotCutoff, p_filter_context: { forbidden: true },
  })
  ensure(forbiddenSnapshotError, 'Un profesional pudo ejecutar snapshots institucionales.')

  retentionPolicyId = `verification-retention-${randomUUID()}`
  const { error: retentionPolicyError } = await adminClient.from('retention_policies').insert({
    id: retentionPolicyId,
    entity_id: 'gov-bolivar-2026',
    data_class: 'form_responses',
    retention_days: 0,
    legal_basis: 'Vista previa automatizada de verificación; no modifica datos.',
    disposition: 'review',
    status: 'active',
    effective_from: new Date().toISOString().slice(0, 10),
    created_by: session.user.id,
  })
  if (retentionPolicyError) throw retentionPolicyError
  const { data: retentionPreview, error: retentionPreviewError } = await adminClient.rpc('run_retention_policy', {
    p_policy_id: retentionPolicyId, p_execute: false, p_confirmation: null,
  })
  if (retentionPreviewError) throw retentionPreviewError
  retentionRunIds.push(retentionPreview.run_id)
  ensure(retentionPreview.mode === 'preview' && retentionPreview.eligible_count >= 1 && retentionPreview.affected_count === 0, 'La vista previa de retención modificó datos o no calculó vencimientos.')
  const { error: forbiddenRetentionError } = await professionalClient.rpc('run_retention_policy', {
    p_policy_id: retentionPolicyId, p_execute: false, p_confirmation: null,
  })
  ensure(forbiddenRetentionError, 'Un profesional pudo ejecutar la vista previa de retención.')

  console.log('Supabase verificado: Auth/MFA, RPC, RLS, asignaciones, Storage, PostGIS/GPS/líneas/polígonos, evidencias, países, snapshots reproducibles, retención auditada, versiones inmutables, reportes, cola ArcGIS e idempotencia funcionan.')
} finally {
  if (arcGisConnectionId) {
    await serviceClient.from('arcgis_connections').delete().eq('id', arcGisConnectionId)
    await serviceClient.from('audit_log').delete().in('record_id', [arcGisConnectionId, arcGisMappingId, arcGisJobId].filter(Boolean))
  }
  if (sensitiveAccessId) await serviceClient.from('sensitive_access_log').delete().eq('id', sensitiveAccessId)
  if (reportRunId) await serviceClient.from('report_runs').delete().eq('id', reportRunId)
  if (retentionRunIds.length) await serviceClient.from('retention_runs').delete().in('id', retentionRunIds)
  if (retentionPolicyId) {
    await serviceClient.from('audit_log').delete().eq('record_id', retentionPolicyId)
    await serviceClient.from('retention_policies').delete().eq('id', retentionPolicyId)
  }
  if (snapshotIds.length) {
    await serviceClient.from('indicator_snapshots').delete().in('id', snapshotIds)
    await serviceClient.from('audit_log').delete().eq('action', 'indicator_snapshots_generated').contains('metadata', { filter_context: { verification_run: localId } })
  }
  if (foreignEvidenceId) await serviceClient.from('evidence_files').delete().eq('id', foreignEvidenceId)
  if (evidenceId) await serviceClient.from('evidence_files').delete().eq('id', evidenceId)
  await serviceClient.from('form_responses').delete().eq('local_id', localId)
  if (uploadedPath) await serviceClient.storage.from('field-photos').remove([uploadedPath])
  if (temporaryFormAssignmentId) await serviceClient.from('form_assignments').delete().eq('id', temporaryFormAssignmentId)
  if (temporaryVersionedFormId) await serviceClient.from('forms').delete().eq('id', temporaryVersionedFormId)
  if (temporaryUserId) {
    await serviceClient.from('audit_log').delete().eq('record_id', temporaryUserId)
    await serviceClient.from('user_profiles').delete().eq('user_id', temporaryUserId)
    await serviceClient.auth.admin.deleteUser(temporaryUserId)
  }
  if (bootstrapAdminId) {
    await serviceClient.from('audit_log').delete().eq('record_id', bootstrapAdminId)
    await serviceClient.from('user_profiles').delete().eq('user_id', bootstrapAdminId)
    await serviceClient.auth.admin.deleteUser(bootstrapAdminId)
  }
}
