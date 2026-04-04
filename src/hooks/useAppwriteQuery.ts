/**
 * Control G — React Query hooks for Appwrite
 * Optimized data fetching with automatic caching
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query } from 'appwrite'
import type { Models } from 'appwrite'

// ── Hooks de consulta ─────────────────────────────────────────────────────────

/** Proyectos de la organización */
export function useProjects(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['projects', organizationId],
    queryFn: async () => {
      if (!organizationId) return { documents: [], total: 0 }
      const res = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.PROJECTS,
        [Query.equal('organization_id', organizationId), Query.orderDesc('$createdAt'), Query.limit(50)]
      )
      return res
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2, // 2 minutos
  })
}

/** Formularios de la organización */
export function useForms(organizationId: string | undefined, status?: string) {
  return useQuery({
    queryKey: ['forms', organizationId, status],
    queryFn: async () => {
      if (!organizationId) return { documents: [], total: 0 }
      const queries = [
        Query.equal('organization_id', organizationId),
        Query.orderDesc('$createdAt'),
        Query.limit(100)
      ]
      if (status) queries.push(Query.equal('status', status))
      return await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORMS, queries)
    },
    enabled: !!organizationId,
  })
}

/** Respuestas de formularios */
export function useFormResponses(organizationId: string | undefined, filter?: {
  status?: string
  limit?: number
}) {
  return useQuery({
    queryKey: ['form_responses', organizationId, filter],
    queryFn: async () => {
      if (!organizationId) return { documents: [], total: 0 }
      const queries = [
        Query.equal('organization_id', organizationId),
        Query.orderDesc('$createdAt'),
        Query.limit(filter?.limit || 100)
      ]
      if (filter?.status) queries.push(Query.equal('status', filter.status))
      return await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORM_RESPONSES, queries)
    },
    enabled: !!organizationId,
    staleTime: 1000 * 30, // 30 segundos (datos más dinámicos)
  })
}

/** Miembros de un proyecto */
export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project_members', projectId],
    queryFn: async () => {
      if (!projectId) return []
      const res = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.PROJECT_MEMBERS,
        [Query.equal('project_id', projectId), Query.limit(200)]
      )
      return res.documents
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  })
}

/** Notificaciones del usuario */
export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) return { documents: [], total: 0 }
      return await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.NOTIFICATIONS,
        [Query.equal('user_id', userId), Query.equal('read', false), Query.orderDesc('$createdAt'), Query.limit(20)]
      )
    },
    enabled: !!userId,
    staleTime: 1000 * 15, // 15 segundos
    refetchInterval: 1000 * 60, // auto-refetch cada minuto
  })
}

// ── Mutations ──────────────────────────────────────────────────────────────────

export function useUpdateResponseStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, reviewedBy, rejectionReason }: {
      id: string
      status: string
      reviewedBy: string
      rejectionReason?: string
    }) => {
      return await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_IDS.FORM_RESPONSES,
        id,
        {
          status,
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
          ...(rejectionReason ? { rejection_reason: rejectionReason } : {}),
        }
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['form_responses'] })
    },
  })
}
