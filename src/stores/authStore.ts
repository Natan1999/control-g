/**
 * Control G — Auth Store (Zustand + Appwrite)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserRole } from '@/types'
import {
  login as appwriteLogin,
  logout as appwriteLogout,
  getSession,
  type UserProfile,
} from '@/lib/appwrite-auth'
import { Network } from '@capacitor/network'
import { updateLocalCache } from '@/lib/sync-engine'

function profileToUser(profile: UserProfile, email: string): User {
  return {
    id:           profile.user_id,
    entityId:     profile.entity_id ?? undefined,
    fullName:     profile.full_name,
    email,
    phone:        profile.phone ?? undefined,
    role:         profile.role as UserRole,
    avatarUrl:    profile.avatar_url ?? undefined,
    signatureUrl: profile.signature_url ?? undefined,
    status:       profile.status,
    lastSeenAt:   profile.last_seen_at ?? undefined,
    lastSyncAt:   profile.last_sync_at ?? undefined,
    createdAt:    profile.$createdAt,
  }
}

interface AuthState {
  user:            User | null
  profileId:       string | null
  isAuthenticated: boolean
  isLoading:       boolean
  error:           string | null

  signIn:     (email: string, password: string) => Promise<void>
  signOut:    () => Promise<void>
  restore:    () => Promise<void>
  clearError: () => void
  updateUser: (updates: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:            null,
      profileId:       null,
      isAuthenticated: false,
      isLoading:       false,
      error:           null,

      signIn: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const authUser = await appwriteLogin(email, password)
          if (!authUser.profile) {
            throw new Error('Tu cuenta no tiene un perfil configurado. Contacta al administrador.')
          }
          const user = profileToUser(authUser.profile, authUser.email)
          set({ user, profileId: authUser.profile.$id, isAuthenticated: true, isLoading: false, error: null })
          // Pre-cache offline data for field professionals
          if (user.entityId) {
            updateLocalCache(user.entityId).catch(() => {})
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error al iniciar sesión'
          set({ isLoading: false, error: msg, isAuthenticated: false, user: null })
          throw err
        }
      },

      signOut: async () => {
        set({ isLoading: true })
        try {
          await appwriteLogout()
        } catch {
          // Session may have already expired
        } finally {
          set({ user: null, profileId: null, isAuthenticated: false, isLoading: false, error: null })
        }
      },

      restore: async () => {
        const { isAuthenticated, user: currentUser } = get()
        if (!isAuthenticated || !currentUser) return
        
        set({ isLoading: true })
        try {
          // Check connectivity first
          const status = await Network.getStatus()
          if (!status.connected) {
            console.log('Restoring session from cache (offline mode)')
            set({ isLoading: false })
            return
          }

          const authUser = await getSession()
          if (authUser?.profile) {
            const user = profileToUser(authUser.profile, authUser.email)
            set({ user, profileId: authUser.profile.$id, isAuthenticated: true, isLoading: false })
          } else {
            set({ user: null, profileId: null, isAuthenticated: false, isLoading: false })
          }
        } catch (err) {
          console.error('Session restore error:', err)
          // If offline, keep current state
          const status = await Network.getStatus()
          if (!status.connected) {
             set({ isLoading: false })
             return
          }
          set({ user: null, profileId: null, isAuthenticated: false, isLoading: false })
        }
      },

      updateUser: (updates) =>
        set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'control-g-auth',
      partialize: (s) => ({ user: s.user, profileId: s.profileId, isAuthenticated: s.isAuthenticated }),
    }
  )
)
