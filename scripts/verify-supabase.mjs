#!/usr/bin/env node
import { randomUUID } from 'node:crypto'
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
let bootstrapAdminId = null

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

  const response = {
    form_id: assignedForm.id,
    entity_id: 'gov-bolivar-2026',
    family_id: null,
    professional_id: temporaryUserId,
    municipality_id: 'bolivar-mahates',
    local_id: localId,
    answers: { verification: true, photo: uploadedPath },
    answers_json: JSON.stringify({ verification: true, photo: uploadedPath }),
    latitude: 10.391,
    longitude: -75.479,
    captured_at: new Date().toISOString(),
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
    .upsert({ ...response, answers: { verification: 'repeated' } }, { onConflict: 'local_id' })
    .select('id')
    .single()
  if (repeatedSyncError) throw repeatedSyncError
  ensure(firstSync.id === repeatedSync.id, 'La sincronización repetida creó un duplicado.')

  const { data: spatialResponse, error: spatialResponseError } = await serviceClient
    .from('form_responses')
    .select('id,latitude,longitude,location')
    .eq('local_id', localId)
    .single()
  if (spatialResponseError) throw spatialResponseError
  ensure(
    spatialResponse.latitude === 10.391 && spatialResponse.longitude === -75.479 && spatialResponse.location,
    'PostGIS no generó la geografía WGS84 de la respuesta sincronizada.',
  )

  console.log('Supabase verificado: Auth, RPC, RLS, formularios asignados, Storage, PostGIS, capas GIS e idempotencia funcionan.')
} finally {
  await serviceClient.from('form_responses').delete().eq('local_id', localId)
  if (uploadedPath) await serviceClient.storage.from('field-photos').remove([uploadedPath])
  if (temporaryFormAssignmentId) await serviceClient.from('form_assignments').delete().eq('id', temporaryFormAssignmentId)
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
