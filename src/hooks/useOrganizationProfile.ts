import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { COLLECTION_IDS, DATABASE_ID, databases } from '@/lib/backend'
import { isOnline } from '@/lib/network'
import { getOrganizationProfile, organizationCacheValue } from '@/lib/organization-profile'

// Only operational configuration is cached here. This is not an authorization
// source; Supabase/RLS still enforces every server-side permission.
export function useOrganizationProfile() {
  const entityId = useAuthStore(state => state.user?.entityId)
  const query = useQuery({
    queryKey: ['organization-profile', entityId],
    enabled: Boolean(entityId), staleTime: 60_000, retry: false,
    networkMode: 'always',
    queryFn: async () => {
      const key = `cg_operation_profile_${entityId}`
      let cached: { name: string; countryCode?: string; region?: string; settings: Record<string, unknown> } | null = null
      try { cached = JSON.parse(localStorage.getItem(key) || 'null') } catch { /* corrupt cache is ignored */ }
      if (!(await isOnline())) return cached
      try {
        const entity = await databases.getDocument(DATABASE_ID, COLLECTION_IDS.ENTITIES, entityId!)
        const value = organizationCacheValue(entity)
        try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* online use remains available */ }
        return value
      } catch (error) {
        if (cached) return cached
        throw error
      }
    },
  })
  return {
    ...getOrganizationProfile(query.data?.settings), name: query.data?.name || '', countryCode: query.data?.countryCode || 'CO', region: query.data?.region || '',
    loading: Boolean(entityId) && query.isPending,
  }
}
