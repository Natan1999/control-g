import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type Role = 'admin' | 'coordinator' | 'support' | 'professional'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return json({ error: 'Función sin configuración o sesión válida.' }, 401)
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: callerData, error: callerError } = await callerClient.auth.getUser()
  if (callerError || !callerData.user) return json({ error: 'Sesión inválida.' }, 401)

  const { data: callerProfile } = await adminClient
    .from('user_profiles')
    .select('role,entity_id,status')
    .eq('user_id', callerData.user.id)
    .single()
  if (!callerProfile || callerProfile.status !== 'active' || !['admin', 'coordinator'].includes(callerProfile.role)) {
    return json({ error: 'No tienes permiso para crear usuarios.' }, 403)
  }

  let payload: { email?: string; password?: string; fullName?: string; role?: Role; entityId?: string | null }
  try { payload = await request.json() }
  catch { return json({ error: 'Solicitud inválida.' }, 400) }

  const email = payload.email?.trim().toLowerCase()
  const fullName = payload.fullName?.trim()
  const role = payload.role || 'professional'
  const entityId = payload.entityId || null
  if (!email || !fullName || !payload.password || payload.password.length < 10) {
    return json({ error: 'Correo, nombre y contraseña de al menos 10 caracteres son obligatorios.' }, 400)
  }
  if (!['admin', 'coordinator', 'support', 'professional'].includes(role)) {
    return json({ error: 'Rol inválido.' }, 400)
  }
  if (callerProfile.role === 'coordinator') {
    if (!['support', 'professional'].includes(role) || entityId !== callerProfile.entity_id) {
      return json({ error: 'Un coordinador solo puede crear equipo dentro de su entidad.' }, 403)
    }
  }
  if (role !== 'admin' && !entityId) return json({ error: 'La entidad es obligatoria para este rol.' }, 400)

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: payload.password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role, entity_id: entityId, must_change_password: true },
  })
  if (createError || !created.user) {
    const duplicate = createError?.message?.toLowerCase().includes('already')
    return json({ error: duplicate ? 'Ya existe una cuenta con este correo.' : createError?.message || 'No se pudo crear la cuenta.' }, duplicate ? 409 : 400)
  }

  const { error: profileError } = await adminClient.from('user_profiles').insert({
    user_id: created.user.id,
    entity_id: entityId,
    full_name: fullName,
    email,
    role,
    status: 'active',
    must_change_password: true,
  })
  if (profileError) {
    await adminClient.auth.admin.deleteUser(created.user.id)
    return json({ error: profileError.message }, 400)
  }

  return json({ user: created.user }, 201)
})
