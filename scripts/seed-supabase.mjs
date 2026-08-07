#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })
config()

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const initialPassword = process.env.CONTROL_G_INITIAL_PASSWORD
const entityId = process.env.CONTROL_G_ENTITY_ID || 'gov-bolivar-2026'

if (!url || !serviceRoleKey || !initialPassword) {
  console.error('Faltan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o CONTROL_G_INITIAL_PASSWORD.')
  process.exit(1)
}
if (initialPassword.length < 12) {
  console.error('CONTROL_G_INITIAL_PASSWORD debe tener al menos 12 caracteres.')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const accounts = [
  { email: process.env.CONTROL_G_ADMIN_EMAIL || 'admin@drandigital.com', fullName: 'Administración Control G', role: 'admin', entityId: null },
  { email: process.env.CONTROL_G_COORDINATOR_EMAIL || 'coordinacion.bolivar@controlg.app', fullName: 'Coordinación Gobernación de Bolívar', role: 'coordinator', entityId },
  { email: process.env.CONTROL_G_SUPPORT_EMAIL || 'apoyo.bolivar@controlg.app', fullName: 'Apoyo Gobernación de Bolívar', role: 'support', entityId },
  { email: process.env.CONTROL_G_PROFESSIONAL_EMAIL || 'campo.bolivar@controlg.app', fullName: 'Profesional de Campo Bolívar', role: 'professional', entityId },
]

async function findUser(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    const user = data.users.find(item => item.email?.toLowerCase() === email.toLowerCase())
    if (user) return user
    if (data.users.length < 100) break
  }
  return null
}

async function upsertAccount(account) {
  let user = await findUser(account.email)
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: initialPassword,
      email_confirm: true,
      user_metadata: { full_name: account.fullName, role: account.role, entity_id: account.entityId, must_change_password: true },
    })
    if (error) throw error
    user = data.user
    console.log(`Cuenta creada: ${account.email}`)
  } else {
    console.log(`Cuenta existente: ${account.email}`)
  }

  const { error: profileError } = await supabase.from('user_profiles').upsert({
    user_id: user.id,
    entity_id: account.entityId,
    full_name: account.fullName,
    email: account.email,
    role: account.role,
    status: 'active',
    must_change_password: true,
  }, { onConflict: 'user_id' })
  if (profileError) throw profileError
  return user
}

for (const account of accounts) {
  const user = await upsertAccount(account)
  if (account.role === 'professional' && account.entityId) {
    const { data: municipalities, error: municipalityError } = await supabase
      .from('entity_municipalities')
      .select('id')
      .eq('entity_id', account.entityId)
    if (municipalityError) throw municipalityError

    const assignments = (municipalities || []).map(municipality => ({
      entity_id: account.entityId,
      professional_id: user.id,
      municipality_id: municipality.id,
    }))
    if (assignments.length) {
      const { error: assignmentError } = await supabase
        .from('professional_assignments')
        .upsert(assignments, { onConflict: 'professional_id,municipality_id' })
      if (assignmentError) throw assignmentError
    }
  }
}
console.log(`Listo: ${accounts.length} cuentas, perfiles y asignaciones verificados.`)
