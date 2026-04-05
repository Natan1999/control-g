import { useState, useEffect } from 'react'
import { Users, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'
import type { ProfessionalProgress } from '@/types'

interface PendingActivity {
  $id: string
  family_id: string
  professional_id: string
  activity_type: string
  activity_date: string
  familyName?: string
  professionalName?: string
}

export default function ApoyoDashboard() {
  const { user } = useAuthStore()
  const [totalFamilies, setTotalFamilies] = useState(0)
  const [completedFamilies, setCompletedFamilies] = useState(0)
  const [syncedActivities, setSyncedActivities] = useState(0)
  const [activeObservations, setActiveObservations] = useState(0)
  const [professionals, setProfessionals] = useState<ProfessionalProgress[]>([])
  const [pendingActivities, setPendingActivities] = useState<PendingActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [user?.entityId])

  const activityTypeLabel: Record<string, string> = {
    ex_ante: 'Caracterización Ex-Antes',
    encounter_1: 'Momento de Encuentro 1',
    encounter_2: 'Momento de Encuentro 2',
    encounter_3: 'Momento de Encuentro 3',
    ex_post: 'Caracterización Ex-Post',
  }

  async function load() {
    if (!user?.entityId) { setLoading(false); return }
    setLoading(true)
    try {
      const [familiesRes, activitiesRes, obsRes, profRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FAMILIES, [
          Query.equal('entity_id', user.entityId), Query.limit(500),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ACTIVITIES, [
          Query.equal('entity_id', user.entityId),
          Query.equal('status', 'synced'),
          Query.limit(50),
          Query.orderDesc('$createdAt'),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.OBSERVATIONS, [
          Query.equal('entity_id', user.entityId),
          Query.equal('read', false),
          Query.limit(1),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.USER_PROFILES, [
          Query.equal('entity_id', user.entityId),
          Query.equal('role', 'professional'),
          Query.limit(50),
        ]),
      ])

      const families = familiesRes.documents
      const completed = families.filter((f: any) => f.overall_status === 'completed').length
      setTotalFamilies(families.length)
      setCompletedFamilies(completed)
      setSyncedActivities(activitiesRes.total)
      setActiveObservations(obsRes.total)

      // Build professional progress (read-only)
      const progressList: ProfessionalProgress[] = profRes.documents.map((prof: any) => {
        const pf = families.filter((f: any) => f.professional_id === prof.user_id)
        const exAnte = pf.filter((f: any) => f.ex_ante_status === 'completed').length
        const e1 = pf.filter((f: any) => f.encounter_1_status === 'completed').length
        const e2 = pf.filter((f: any) => f.encounter_2_status === 'completed').length
        const e3 = pf.filter((f: any) => f.encounter_3_status === 'completed').length
        const exPost = pf.filter((f: any) => f.ex_post_status === 'completed').length
        const total = pf.length * 5
        const done = exAnte + e1 + e2 + e3 + exPost
        return {
          professionalId: prof.user_id,
          professionalName: prof.full_name,
          municipalities: [],
          familiesTarget: pf.length,
          exAnte, encounter1: e1, encounter2: e2, encounter3: e3, exPost,
          percentageComplete: total > 0 ? Math.round((done / total) * 100) : 0,
          lastSyncAt: prof.last_sync_at,
        }
      })
      setProfessionals(progressList)

      // Enrich pending activities with family and professional names
      const profMap: Record<string, string> = {}
      profRes.documents.forEach((p: any) => { profMap[p.user_id] = p.full_name })
      const familyMap: Record<string, string> = {}
      families.forEach((f: any) => {
        familyMap[f.$id] = `${f.first_name ?? ''} ${f.first_lastname ?? ''}`.trim() || f.$id
      })

      const enriched: PendingActivity[] = activitiesRes.documents.map((a: any) => ({
        $id: a.$id,
        family_id: a.family_id,
        professional_id: a.professional_id,
        activity_type: a.activity_type,
        activity_date: a.activity_date,
        familyName: familyMap[a.family_id] ?? a.family_id,
        professionalName: profMap[a.professional_id] ?? a.professional_id,
      }))
      setPendingActivities(enriched)
    } catch { /* silent */ }
    setLoading(false)
  }

  const kpis = [
    { label: 'Total Familias', value: totalFamilies, icon: <Users size={20} />, color: '#1B3A4B' },
    { label: 'Completadas', value: completedFamilies, icon: <CheckCircle size={20} />, color: '#27AE60' },
    { label: 'En Revisión', value: syncedActivities, icon: <Clock size={20} />, color: '#F39C12' },
    { label: 'Observaciones Activas', value: activeObservations, icon: <AlertCircle size={20} />, color: '#E74C3C' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <TopBar
        title="Dashboard Apoyo"
        subtitle="Revisión y control de avance"
        actions={
          <button onClick={load} className="p-2 hover:bg-muted rounded-lg transition-colors" title="Actualizar">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white mb-3" style={{ background: kpi.color }}>
              {kpi.icon}
            </div>
            <div className="text-2xl font-black text-foreground">{loading ? '—' : kpi.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Professional progress table (read-only) */}
      <div className="bg-white rounded-2xl border border-border shadow-sm mt-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-bold">Avance por Profesional</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Cargando datos...</div>
        ) : professionals.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No hay profesionales registrados en esta entidad.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Profesional', 'Familias', 'Ex-Antes', 'M1', 'M2', 'M3', 'Ex-Post', '% Avance'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {professionals.map(p => (
                  <tr key={p.professionalId} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{p.professionalName}</td>
                    <td className="px-4 py-3 text-center">{p.familiesTarget}</td>
                    <td className="px-4 py-3 text-center">{p.exAnte}/{p.familiesTarget}</td>
                    <td className="px-4 py-3 text-center">{p.encounter1}/{p.familiesTarget}</td>
                    <td className="px-4 py-3 text-center">{p.encounter2}/{p.familiesTarget}</td>
                    <td className="px-4 py-3 text-center">{p.encounter3}/{p.familiesTarget}</td>
                    <td className="px-4 py-3 text-center">{p.exPost}/{p.familiesTarget}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[60px]">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${p.percentageComplete}%`, background: p.percentageComplete === 100 ? '#27AE60' : '#1B3A4B' }}
                          />
                        </div>
                        <span className="text-xs font-semibold w-10 text-right">{p.percentageComplete}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pendientes de revisión */}
      <div className="bg-white rounded-2xl border border-border shadow-sm mt-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold">Pendientes de revisión</h2>
          {!loading && (
            <span className="text-xs bg-yellow-100 text-yellow-700 font-semibold px-2 py-0.5 rounded-full">
              {syncedActivities}
            </span>
          )}
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Cargando...</div>
        ) : pendingActivities.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No hay actividades pendientes de revisión.</div>
        ) : (
          <div className="divide-y divide-border">
            {pendingActivities.map(act => (
              <div key={act.$id} className="px-6 py-3.5 flex items-center justify-between hover:bg-muted/20 transition-colors">
                <div>
                  <div className="text-sm font-semibold">{act.familyName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {activityTypeLabel[act.activity_type] ?? act.activity_type} · {act.professionalName}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground flex-shrink-0 ml-4">
                  {act.activity_date ? new Date(act.activity_date).toLocaleDateString('es-CO') : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
