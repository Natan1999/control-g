#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })
config()

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const adminEmail = (process.env.CONTROL_G_ADMIN_EMAIL || 'admin@drandigital.com').trim().toLowerCase()

if (!url || !serviceRoleKey) {
  console.error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno local seguro.')
  process.exit(1)
}
if (serviceRoleKey === process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY no puede ser la clave anónima.')
  process.exit(1)
}

const clipboardCheck = spawnSync('which', ['pbcopy'], { encoding: 'utf8' })
if (clipboardCheck.status !== 0) {
  console.error('No se encontró el portapapeles seguro de macOS (pbcopy). No se modificó la cuenta.')
  process.exit(1)
}

const client = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function findUserByEmail(email) {
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    const found = data.users.find(user => user.email?.toLowerCase() === email)
    if (found) return found
    if (data.users.length < 100) break
  }
  return null
}

try {
  const user = await findUserByEmail(adminEmail)
  if (!user) throw new Error('No existe la cuenta de superadministración solicitada.')

  const { data: profile, error: profileError } = await client
    .from('user_profiles')
    .select('id, role, entity_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (profileError) throw profileError
  if (!profile || profile.role !== 'admin' || profile.entity_id !== null) {
    throw new Error('La cuenta existe, pero no tiene el perfil de superadministrador global esperado.')
  }

  const { error: activationError } = await client
    .from('user_profiles')
    .update({ status: 'active', must_change_password: true })
    .eq('id', profile.id)
  if (activationError) throw activationError

  const temporaryPassword = `CG!${randomBytes(18).toString('base64url')}9aA`
  const { error: authError } = await client.auth.admin.updateUserById(user.id, {
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { ...user.user_metadata, must_change_password: true },
  })
  if (authError) throw authError

  const copied = spawnSync('pbcopy', [], { input: temporaryPassword, encoding: 'utf8' })
  if (copied.status !== 0) {
    throw new Error('La contraseña cambió, pero no fue posible copiarla al portapapeles. Ejecuta nuevamente el procedimiento.')
  }

  console.log(`Acceso restablecido para ${adminEmail}. La clave temporal está únicamente en el portapapeles.`)
  console.log('Pégala una vez en el login, cámbiala desde Configuración y limpia el portapapeles.')
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
