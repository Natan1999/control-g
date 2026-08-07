import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://controlg2.dran.cloud'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseAnonKey && import.meta.env.DEV) {
  console.warn('VITE_SUPABASE_ANON_KEY no está configurada. El backend no estará disponible.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey || 'missing-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'control-g-supabase-auth',
  },
  global: {
    headers: { 'x-client-info': 'control-g/2.0' },
  },
})

export const SUPABASE_URL = supabaseUrl

export default supabase
