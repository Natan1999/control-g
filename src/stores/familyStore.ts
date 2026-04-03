import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BeneficiaryFamily } from '@/types'
import { localDB } from '@/lib/dexie-db'
import { processSyncQueue } from '@/lib/sync-engine'
import { useAuthStore } from './authStore'
import { listBeneficiaryFamilies, type BeneficiaryFamilyAppwrite } from '@/lib/appwrite-db'
import { SERVICE_MOMENTS, getNextMoment } from '@/config/moments'

function mapAppwriteToFamily(doc: BeneficiaryFamilyAppwrite): BeneficiaryFamily {
  return {
    id: doc.$id,
    projectId: doc.project_id,
    organizationId: doc.organization_id,
    zoneId: doc.zone_id || undefined,
    headFirstName: doc.head_first_name,
    headFirstLastname: doc.head_first_lastname,
    headIdNumber: doc.head_id_number || undefined,
    headPhone: doc.head_phone || undefined,
    departmentId: doc.department_id || undefined,
    municipalityId: doc.municipality_id || undefined,
    vereda: doc.vereda || undefined,
    address: doc.address || undefined,
    exAntesCompleted: doc.ex_antes_completed,
    exAntesResponseId: doc.ex_antes_response_id || undefined,
    encounter1Completed: doc.encounter_1_completed,
    encounter1ResponseId: doc.encounter_1_response_id || undefined,
    encounter2Completed: doc.encounter_2_completed,
    encounter2ResponseId: doc.encounter_2_response_id || undefined,
    encounter3Completed: doc.encounter_3_completed,
    encounter3ResponseId: doc.encounter_3_response_id || undefined,
    exPostCompleted: doc.ex_post_completed,
    exPostResponseId: doc.ex_post_response_id || undefined,
    totalMembers: doc.total_members,
    status: doc.status,
    consentGiven: doc.consent_given,
    createdAt: doc.$createdAt,
    members: []
  }
}

export type BeneficiaryFamilyData = Omit<BeneficiaryFamily, 'id' | 'createdAt' | 'members'>

interface FamilyState {
  families: BeneficiaryFamily[]
  isLoading: boolean
  fetchFamilies: (projectId: string) => Promise<void>
  registerFamilyOffline: (familyData: BeneficiaryFamilyData) => Promise<void>
  advanceMoment: (familyId: string, momentField: keyof BeneficiaryFamily, metadata?: any) => Promise<void>
}

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
      families: [],
      isLoading: false,
      
      fetchFamilies: async (projectId: string) => {
        set({ isLoading: true })
        try {
          // Offline-first: Siempre cargar de localDB primero
          const localFamilies = await localDB.families
            .where('project_id')
            .equals(projectId)
            .toArray()
          
          if (localFamilies.length > 0) {
            const mapped: BeneficiaryFamily[] = localFamilies.map(f => ({
              id: f.local_id,
              projectId: f.project_id,
              organizationId: f.organization_id,
              headFirstName: f.head_first_name,
              headFirstLastname: f.head_first_lastname,
              headIdNumber: f.head_id_number || undefined,
              headPhone: f.head_phone || undefined,
              vereda: f.vereda || undefined,
              address: f.address || undefined,
              exAntesCompleted: f.moment !== 'EX_ANTES',
              encounter1Completed: !['EX_ANTES', 'ENCOUNTER_1'].includes(f.moment),
              encounter2Completed: !['EX_ANTES', 'ENCOUNTER_1', 'ENCOUNTER_2'].includes(f.moment),
              encounter3Completed: f.moment === 'EX_POST',
              exPostCompleted: false, 
              totalMembers: 0, // Simplified offline, updated on sync
              consentGiven: true, // Assuming true if registered offline, as it's mandatory
              status: 'active',
              createdAt: new Date(f.created_at).toISOString(),
              members: []
            }))
            set({ families: mapped })
          }

          // Si hay internet, intentar refrescar cache
          if (navigator.onLine) {
            const user = useAuthStore.getState().user
            if (user?.organizationId) {
               // Esto disparará una actualización de localDB en background
               const documents = await listBeneficiaryFamilies(user.organizationId, projectId)
               // El engine se encargará de persistir, pero podemos actualizar UI inmediatamente
               const familyList = documents.map(mapAppwriteToFamily)
               set({ families: familyList })
            }
          }
        } catch (err) {
          console.error("Error fetching families:", err)
        } finally {
          set({ isLoading: false })
        }
      },

      registerFamilyOffline: async (familyData: Omit<BeneficiaryFamily, 'id' | 'createdAt'>) => {
        const user = useAuthStore.getState().user
        if (!user) return

        const localId = `local_fam_${Date.now()}`
        const newFamilyLocal = {
          local_id: localId,
          project_id: familyData.projectId,
          organization_id: user.organizationId || '',
          technician_id: user.id,
          head_first_name: familyData.headFirstName,
          head_first_lastname: familyData.headFirstLastname,
          head_id_number: familyData.headIdNumber || null,
          head_phone: familyData.headPhone || null,
          vereda: familyData.vereda || null,
          address: familyData.address || null,
          moment: 'EX_ANTES',
          sync_status: 'pending' as const,
          retry_count: 0,
          created_at: Date.now()
        }

        await localDB.families.put(newFamilyLocal)
        
        // Actualizar UI
        set(state => ({
          families: [
            { ...familyData, id: localId, createdAt: new Date().toISOString(), members: [] },
            ...state.families
          ]
        }))

        // Trigger Sync
        if (navigator.onLine) {
          processSyncQueue().catch(console.error)
        }
      },
      
      advanceMoment: async (familyId, momentField, metadata = {}) => {
        const user = useAuthStore.getState().user
        if (!user) return

        const localResponseId = `local_resp_${Date.now()}`

        try {
            await localDB.responses.put({
                local_id: localResponseId,
                form_id: `form_${String(momentField)}`,
                project_id: metadata.projectId || user.projectId || '',
                organization_id: user.organizationId || '',
                technician_id: user.id,
                zone_id: null,
                data: JSON.stringify({ 
                    familyId, 
                    moment: momentField, 
                    completedAt: new Date().toISOString(),
                    ...metadata 
                }),
                latitude: null,
                longitude: null,
                accuracy: null,
                status: 'synced',
                source: 'digital',
                device_info: navigator.userAgent,
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                sync_status: 'pending',
                retry_count: 0,
                created_at: Date.now()
            })
            
            // Actualizar el momento en la tabla de familias local también
            const localFam = await localDB.families.get(familyId)
            if (localFam) {
               // Lógica de progresión basada en la configuración real de momentos
               const currentMomentId = localFam.moment || 'EX_ANTES'
               const nextMoment = getNextMoment(currentMomentId)
               
               await localDB.families.update(familyId, { 
                 moment: nextMoment ? nextMoment.id : currentMomentId,
                 sync_status: 'pending' // Re-sync family to update status in cloud
               })
            }

            if (navigator.onLine) {
              processSyncQueue().catch(console.error);
            }
        } catch(err) {
            console.error("No se pudo guardar la respuesta offline", err);
        }

        // 2. Avanzar estado UI
        set(state => ({
          families: state.families.map(f => {
            if (f.id === familyId) {
              return { 
                ...f, 
                [momentField]: true, 
                [`${String(momentField).replace('Completed', '')}ResponseId`]: localResponseId 
              } as BeneficiaryFamily
            }
            return f
          })
        }))
      }
    }),
    {
      name: 'control-g-families',
    }
  )
)
