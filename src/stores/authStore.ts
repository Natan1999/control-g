import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserRole } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (user: User, token: string) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  updateUser: (updates: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: (user, token) => set({ user, token, isAuthenticated: true, isLoading: false }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      setLoading: (isLoading) => set({ isLoading }),
      updateUser: (updates) => set(state => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),
    }),
    {
      name: 'control-g-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
)

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
