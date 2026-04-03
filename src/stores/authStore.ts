/**
 * Control G — Auth Store (Zustand + Appwrite)
 * =============================================
 * Gestiona el estado de autenticación conectado
 * con Appwrite Auth y la colección user_profiles.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserRole } from '@/types'
import {
  login as appwriteLogin,
  logout as appwriteLogout,
  getSession,
  updateProfile,
  type UserProfile,
} from '@/lib/appwrite-auth'

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convierte un UserProfile de Appwrite al tipo User de la app */
function profileToUser(profile: UserProfile, email: string): User {
  return {
    id:             profile.user_id,
    organizationId: profile.organization_id ?? undefined,
    fullName:       profile.full_name,
    email,
    phone:          profile.phone ?? undefined,
    role:           profile.role as UserRole,
    avatarUrl:      profile.avatar_url ?? undefined,
    status:         profile.status,
    lastSeenAt:     profile.last_seen_at ?? undefined,
    lastSyncAt:     profile.last_sync_at ?? undefined,
    createdAt:      profile.$createdAt,
  }
}

// ─── Store ──────────────────────────────────────────────────────────────────

interface AuthState {
  user:            User | null
  profileId:       string | null   // $id del documento en user_profiles
  isAuthenticated: boolean
  isLoading:       boolean
  error:           string | null

  // Actions
  signIn:      (email: string, password: string) => Promise<void>
  signOut:     () => Promise<void>
  restore:     () => Promise<void>
  clearError:  () => void
  updateUser:  (updates: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:            null,
      profileId:       null,
      isAuthenticated: false,
      isLoading:       false,
      error:           null,

      // ── Iniciar sesión con Appwrite ──────────────────────────────────────
      signIn: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const authUser = await appwriteLogin(email, password)

          if (!authUser.profile) {
            throw new Error(
              'Tu cuenta no tiene un perfil configurado. Contacta al administrador.'
            )
          }

          const user = profileToUser(authUser.profile, authUser.email)
          set({
            user,
            profileId:       authUser.profile.$id,
            isAuthenticated: true,
            isLoading:       false,
            error:           null,
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error al iniciar sesión'
          set({ isLoading: false, error: msg, isAuthenticated: false, user: null })
          throw err
        }
      },

      // ── Cerrar sesión ────────────────────────────────────────────────────
      signOut: async () => {
        set({ isLoading: true })
        try {
          await appwriteLogout()
        } catch {
          // Si ya expiró la sesión, continuar de todas formas
        } finally {
          set({
            user:            null,
            profileId:       null,
            isAuthenticated: false,
            isLoading:       false,
            error:           null,
          })
        }
      },

      // ── Restaurar sesión al recargar la página ────────────────────────────
      restore: async () => {
        // Solo intentar si el store persisted dice que hay sesión
        if (!get().isAuthenticated) return
        set({ isLoading: true })
        try {
          const authUser = await getSession()
          if (authUser?.profile) {
            const user = profileToUser(authUser.profile, authUser.email)
            set({
              user,
              profileId:       authUser.profile.$id,
              isAuthenticated: true,
              isLoading:       false,
            })
          } else {
            // Sesión expirada
            set({
              user:            null,
              profileId:       null,
              isAuthenticated: false,
              isLoading:       false,
            })
          }
        } catch {
          set({ user: null, profileId: null, isAuthenticated: false, isLoading: false })
        }
      },

      // ── Actualizar datos locales del usuario ──────────────────────────────
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'control-g-auth',
      partialize: (s) => ({
        user:            s.user,
        profileId:       s.profileId,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
)

// ─── Demo Users (solo para desarrollo sin Appwrite configurado) ──────────────

export const demoUsers: Record<UserRole, User> = {
  superadmin: {
    id: 'sa-001', fullName: 'Natan Chiquillo', email: 'natan@drandigital.com',
    role: 'superadmin', status: 'active', createdAt: new Date().toISOString(),
  },
  coordinator: {
    id: 'co-001', organizationId: 'org-001', fullName: 'María Rodríguez',
    email: 'maria@alcaldiacartagena.gov.co', role: 'coordinator', status: 'active',
    createdAt: new Date().toISOString(),
  },
  assistant: {
    id: 'as-001', organizationId: 'org-001', fullName: 'Carlos Mendoza',
    email: 'carlos@alcaldiacartagena.gov.co', role: 'assistant', status: 'active',
    createdAt: new Date().toISOString(),
  },
  technician: {
    id: 'te-001', organizationId: 'org-001', fullName: 'Ana García',
    email: 'ana@tecnicos.com', phone: '+57 315 123 4567', role: 'technician',
    status: 'active', createdAt: new Date().toISOString(),
  },
}

// Alias legacy para compatibilidad
export const useAuthStoreCompat = useAuthStore
