#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })
config()

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
if (!url || !anonKey) {
  console.error('Faltan SUPABASE_URL/VITE_SUPABASE_URL y la clave anónima.')
  process.exit(1)
}

const client = createClient(url, anonKey, { auth: { persistSession: false } })
const { data, error } = await client.from('entities').select('id,name,status').limit(1)
if (error) {
  const message = error.message.includes('502') || error.message.includes('Bad gateway')
    ? 'el host respondió 502 Bad Gateway (el origen de Supabase está fuera de servicio)'
    : error.message.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)
  console.error(`Supabase no disponible: ${message}`)
  process.exit(1)
}
console.log(`Supabase disponible. Entidades visibles sin sesión: ${data.length}.`)
