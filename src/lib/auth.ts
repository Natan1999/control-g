import type { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { BackendError } from './backend'
import type { UserRole } from '@/types'

export type { UserRole }
export type UserStatus = 'active' | 'inactive' | 'suspended'

export interface UserProfile {
  $id: string
  $createdAt: string
  $updatedAt: string
  user_id: string
  entity_id: string | null
  full_name: string
  email: string | null
  phone: string | null
  role: UserRole
  avatar_url: string | null
  signature_url: string | null
  status: UserStatus
  last_seen_at: string | null
  last_sync_at: string | null
}

export interface AuthUser {
  $id: string
  email: string
  name: string
  emailVerification: boolean
  profile?: UserProfile
}

function mapProfile(row: Record<string, any>): UserProfile {
  return {
    ...row,
    $id: row.id,
    $createdAt: row.created_at,
    $updatedAt: row.updated_at,
  } as UserProfile
}

function mapAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const normalized = message.toLowerCase()
  if (normalized.includes('invalid login') || normalized.includes('invalid credentials')) {
    return new Error('Credenciales incorrectas. Verifica tu correo y contraseña.')
  }
  if (normalized.includes('email not confirmed')) return new Error('Debes confirmar tu correo antes de ingresar.')
  if (normalized.includes('rate limit')) return new Error('Demasiados intentos. Espera un momento e intenta de nuevo.')
  return new Error(message || 'Error inesperado de autenticación.')
}

async function toAuthUser(user: SupabaseUser): Promise<AuthUser> {
  let profile: UserProfile | undefined
  try {
    profile = await getUserProfile(user.id)
  } catch {
    // A profile is required by the UI; the caller provides the actionable message.
  }
  return {
    $id: user.id,
    email: user.email || '',
    name: profile?.full_name || user.user_metadata?.full_name || user.email || '',
    emailVerification: Boolean(user.email_confirmed_at),
    profile,
  }
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
  if (error || !data.user) throw mapAuthError(error)
  return toAuthUser(data.user)
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw mapAuthError(error)
}

export async function getCurrentUser(): Promise<AuthUser> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw mapAuthError(error || new Error('No existe una sesión activa.'))
  return toAuthUser(data.user)
}

export async function getSession(): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.user) return null
  return toAuthUser(data.session.user)
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase.from('user_profiles').select('*').eq('user_id', userId).single()
  if (error || !data) throw new BackendError('Tu cuenta no tiene un perfil configurado.', error?.code || 404)
  return mapProfile(data)
}

export async function updateProfile(
  profileId: string,
  data: Partial<Pick<UserProfile, 'full_name' | 'phone' | 'avatar_url' | 'signature_url' | 'last_seen_at' | 'last_sync_at'>>,
): Promise<UserProfile> {
  const { data: updated, error } = await supabase.from('user_profiles').update(data).eq('id', profileId).select('*').single()
  if (error) throw new BackendError(error.message, error.code)
  return mapProfile(updated)
}

export async function updatePassword(currentPassword: string, newPassword: string): Promise<void> {
  const { data: current, error: currentError } = await supabase.auth.getUser()
  const email = current.user?.email
  if (currentError || !email) throw mapAuthError(currentError || new Error('No existe una sesión activa.'))

  const { error: reauthenticationError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  })
  if (reauthenticationError) throw new Error('La contraseña actual es incorrecta.')

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw mapAuthError(error)
}

export async function completePasswordRecovery(newPassword: string): Promise<void> {
  const { data, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !data.session) {
    throw new Error('El enlace de recuperación no es válido o ya venció. Solicita uno nuevo.')
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw mapAuthError(error)
}

export async function sendPasswordRecovery(email: string, redirectUrl: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: redirectUrl })
  if (error) throw mapAuthError(error)
}
