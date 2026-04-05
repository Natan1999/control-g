import { useState, useEffect } from 'react'
import { Users, Mail, X, ChevronRight } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'

interface ProfessionalRow {
  userId: string
  fullName: string
  email: string
  familiesCount: number
  activitiesCompleted: number
  families: FamilyRow[]
}

interface FamilyRow {
  $id: string
  name: string
  overall_status: string
  ex_ante_status: string
  encounter_1_status: string
  encounter_2_status: string
  encounter_3_status: string
  ex_post_status: string
}

export default function ApoyoProfessionalsPage() {
  const { user } = useAuthStore()
  const [professionals, setProfessionals] = useState<ProfessionalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPro, setSelectedPro] = useState<ProfessionalRow | null>(null)

  useEffect(() => { load() }, [user?.entityId])

  async function load() {
    if (!user?.entityId) { setLoading(false); return }
    setLoading(true)
    try {
      const [profRes, familiesRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.USER_PROFILES, [
          Query.equal('entity_id', user.entityId),
          Query.equal('role', 'professional'),
          Query.limit(50),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FAMILIES, [
          Query.equal('entity_id', user.entityId),
          Query.limit(500),
        ]),
      ])

      const allFamilies = familiesRes.documents as any[]

      const rows: ProfessionalRow[] = profRes.documents.map((prof: any) => {
        const pf = allFamilies.filter(f => f.professional_id === prof.user_id)
        const completed =
          pf.filter(f => f.ex_ante_status === 'completed').length +
          pf.filter(f => f.encounter_1_status === 'completed').length +
          pf.filter(f => f.encounter_2_status === 'completed').length +
          pf.filter(f => f.encounter_3_status === 'completed').length +
          pf.filter(f => f.ex_post_status === 'completed').length

        const families: FamilyRow[] = pf.map(f => ({
          $id: f.$id,
          name: `${f.first_name ?? ''} ${f.first_lastname ?? ''}`.trim() || f.$id,
          overall_status: f.overall_status ?? 'pending',
          ex_ante_status: f.ex_ante_status ?? 'pending',
          encounter_1_status: f.encounter_1_status ?? 'pending',
          encounter_2_status: f.encounter_2_status ?? 'pending',
          encounter_3_status: f.encounter_3_status ?? 'pending',
          ex_post_status: f.ex_post_status ?? 'pending',
        }))

        return {
          userId: prof.user_id,
          fullName: prof.full_name,
          email: prof.email ?? '—',
          familiesCount: pf.length,
          activitiesCompleted: completed,
          families,
        }
      })

      setProfessionals(rows)
    } catch { /* silent */ }
    setLoading(false)
  }

  const statusDot = (s: string) =>
    s === 'completed'
      ? <span className="w-3 h-3 rounded-full bg-green-500 inline-block" title="Completado" />
      : <span className="w-3 h-3 rounded-full bg-gray-300 inline-block border border-gray-400" title="Pendiente" />

  const overallBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      completed: { label: 'Completado', color: '#27AE60' },
      in_progress: { label: 'En Progreso', color: '#F39C12' },
      pending: { label: 'Pendiente', color: '#95A5A6' },
    }
    const cfg = map[status] ?? map.pending
    return (
      <span
        className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
        style={{ background: cfg.color }}
      >
        {cfg.label}
      </span>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto relative">
      <TopBar title="Profesionales" subtitle="Listado con avance y estado" />

      <div className="mt-6 bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Cargando profesionales...</div>
        ) : professionals.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No hay profesionales registrados en esta entidad.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {professionals.map(pro => (
              <div
                key={pro.userId}
                className="px-6 py-4 flex items-center justify-between hover:bg-muted/20 cursor-pointer transition-colors"
                onClick={() => setSelectedPro(pro)}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: '#1B3A4B' }}
                  >
                    {pro.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{pro.fullName}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Mail size={11} /> {pro.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-foreground">{pro.familiesCount}</div>
                    <div className="text-xs text-muted-foreground">Familias</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-foreground">{pro.activitiesCompleted}</div>
                    <div className="text-xs text-muted-foreground">Actividades</div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Side panel */}
      {selectedPro && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setSelectedPro(null)} />
          <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            <div
              className="px-6 py-5 flex items-center justify-between text-white"
              style={{ background: '#1B3A4B' }}
            >
              <div>
                <div className="font-bold text-lg">{selectedPro.fullName}</div>
                <div className="text-white/70 text-sm mt-0.5">{selectedPro.email}</div>
              </div>
              <button
                onClick={() => setSelectedPro(null)}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-6 px-6 py-4 border-b border-border">
              <div className="text-center">
                <div className="text-2xl font-black" style={{ color: '#1B3A4B' }}>{selectedPro.familiesCount}</div>
                <div className="text-xs text-muted-foreground">Familias asignadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black" style={{ color: '#27AE60' }}>{selectedPro.activitiesCompleted}</div>
                <div className="text-xs text-muted-foreground">Actividades completadas</div>
              </div>
            </div>

            <div className="flex-1 px-6 py-4">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Users size={15} /> Familias asignadas
              </h3>
              {selectedPro.families.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin familias asignadas.</p>
              ) : (
                <div className="space-y-3">
                  {selectedPro.families.map(fam => (
                    <div key={fam.$id} className="bg-gray-50 rounded-xl border border-border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-sm truncate">{fam.name}</div>
                        {overallBadge(fam.overall_status)}
                      </div>
                      <div className="flex items-center gap-2">
                        {statusDot(fam.ex_ante_status)}
                        {statusDot(fam.encounter_1_status)}
                        {statusDot(fam.encounter_2_status)}
                        {statusDot(fam.encounter_3_status)}
                        {statusDot(fam.ex_post_status)}
                        <span className="text-[10px] text-muted-foreground ml-1">Ex · M1 · M2 · M3 · EP</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
