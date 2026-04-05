import { useState, useEffect } from 'react'
import { MapPin, Users, UserCheck, X, ChevronDown } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper } from '@/components/shared'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query, ID } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'

export default function MunicipalitiesPage() {
  const { user } = useAuthStore()
  const [municipalities, setMunicipalities] = useState<any[]>([])
  const [professionals, setProfessionals] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [familyCounts, setFamilyCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  // Modal state
  const [assignModal, setAssignModal] = useState<{ open: boolean; municipalityId: string; municipalityName: string }>({
    open: false, municipalityId: '', municipalityName: '',
  })
  const [selectedProfId, setSelectedProfId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (user?.entityId) loadAll()
  }, [user?.entityId])

  async function loadAll() {
    setLoading(true)
    try {
      const [munRes, profRes, assignRes, famRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ENTITY_MUNICIPALITIES, [
          Query.equal('entity_id', user!.entityId!), Query.limit(100),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.USER_PROFILES, [
          Query.equal('entity_id', user!.entityId!),
          Query.equal('role', 'professional'),
          Query.limit(100),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.PROFESSIONAL_ASSIGNMENTS, [
          Query.equal('entity_id', user!.entityId!), Query.limit(500),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FAMILIES, [
          Query.equal('entity_id', user!.entityId!), Query.limit(500),
        ]),
      ])

      setMunicipalities(munRes.documents)
      setProfessionals(profRes.documents)
      setAssignments(assignRes.documents)

      // Count families per municipality
      const counts: Record<string, number> = {}
      famRes.documents.forEach((f: any) => {
        counts[f.municipality_id] = (counts[f.municipality_id] || 0) + 1
      })
      setFamilyCounts(counts)
    } catch (err) {
      console.error('Error cargando municipios:', err)
    } finally {
      setLoading(false)
    }
  }

  function getAssignedProfessionals(municipalityId: string) {
    const profIds = assignments
      .filter((a: any) => a.municipality_id === municipalityId)
      .map((a: any) => a.professional_id)
    return professionals.filter((p: any) => profIds.includes(p.$id) || profIds.includes(p.user_id))
  }

  function openAssignModal(municipalityId: string, municipalityName: string) {
    setAssignModal({ open: true, municipalityId, municipalityName })
    setSelectedProfId('')
    setAssignError('')
  }

  async function handleAssign() {
    if (!selectedProfId) {
      setAssignError('Selecciona un profesional')
      return
    }
    setAssigning(true)
    setAssignError('')
    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_IDS.PROFESSIONAL_ASSIGNMENTS,
        ID.unique(),
        {
          entity_id: user?.entityId,
          professional_id: selectedProfId,
          municipality_id: assignModal.municipalityId,
        }
      )
      setToast('Profesional asignado correctamente')
      setTimeout(() => setToast(''), 3500)
      setAssignModal({ open: false, municipalityId: '', municipalityName: '' })
      loadAll()
    } catch (err) {
      console.error('Error asignando:', err)
      setAssignError('Error al asignar. Intenta de nuevo.')
    } finally {
      setAssigning(false)
    }
  }

  return (
    <PageWrapper>
      <TopBar
        title="Municipios"
        subtitle="Asignación de municipios y profesionales"
      />

      <div className="p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <div className="animate-spin w-6 h-6 border-2 border-[#1B3A4B] border-t-transparent rounded-full mr-3" />
            Cargando municipios...
          </div>
        ) : municipalities.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <MapPin size={48} className="mx-auto mb-4 opacity-25" />
            <p className="font-semibold text-base">No hay municipios configurados</p>
            <p className="text-sm mt-1">El Administrador debe configurar los municipios de esta entidad.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {municipalities.map((mun: any) => {
              const assigned = getAssignedProfessionals(mun.$id)
              const familiesRegistered = familyCounts[mun.$id] || 0
              const familiesTarget = mun.families_target || 0

              return (
                <div key={mun.$id} className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1B3A4B]/10 flex items-center justify-center flex-shrink-0">
                      <MapPin size={18} className="text-[#1B3A4B]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm leading-snug">{mun.municipality_name}</h3>
                      <p className="text-xs text-muted-foreground">{mun.department}</p>
                    </div>
                  </div>

                  {/* Family count */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users size={12} /> Familias registradas
                      </span>
                      <span className="font-semibold text-foreground">{familiesRegistered} / {familiesTarget}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1B3A4B] rounded-full transition-all"
                        style={{ width: familiesTarget > 0 ? `${Math.min(100, (familiesRegistered / familiesTarget) * 100)}%` : '0%' }}
                      />
                    </div>
                  </div>

                  {/* Assigned professionals */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Profesionales asignados</p>
                    {assigned.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Sin profesionales asignados</p>
                    ) : (
                      <div className="space-y-1.5">
                        {assigned.map((p: any) => (
                          <div key={p.$id} className="flex items-center gap-2 text-xs">
                            <div className="w-6 h-6 rounded-full bg-[#27AE60]/15 flex items-center justify-center text-[#27AE60] font-bold text-[10px]">
                              {(p.full_name || '?').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-foreground font-medium">{p.full_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Assign button */}
                  <button
                    onClick={() => openAssignModal(mun.$id, mun.municipality_name)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-[#1B3A4B] text-[#1B3A4B] text-xs font-semibold hover:bg-[#1B3A4B] hover:text-white transition-colors"
                  >
                    <UserCheck size={14} /> Asignar Profesional
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-[#1B3A4B] text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Assign Modal */}
      {assignModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold">Asignar profesional</h2>
              <button onClick={() => setAssignModal({ open: false, municipalityId: '', municipalityName: '' })} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Municipio: <span className="font-semibold text-foreground">{assignModal.municipalityName}</span>
            </p>
            <div className="relative mb-4">
              <select
                value={selectedProfId}
                onChange={e => setSelectedProfId(e.target.value)}
                className="w-full appearance-none px-4 py-2.5 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30 pr-9"
              >
                <option value="">Seleccionar profesional...</option>
                {professionals.map((p: any) => (
                  <option key={p.$id} value={p.$id}>{p.full_name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            {assignError && <p className="text-sm text-red-500 mb-3">{assignError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setAssignModal({ open: false, municipalityId: '', municipalityName: '' })}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAssign}
                disabled={assigning}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1B3A4B] text-white text-sm font-medium hover:bg-[#2a5570] transition-colors disabled:opacity-60"
              >
                {assigning ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : 'Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
