import { useState, useEffect } from 'react'
import { Users, CheckCircle, Clock, TrendingUp, RefreshCw } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'
import type { ProfessionalProgress } from '@/types'

interface Summary {
  totalFamilies: number
  completedFamilies: number
  inProgressFamilies: number
  pendingFamilies: number
}

export default function CoordDashboard() {
  const { user } = useAuthStore()
  const [summary, setSummary] = useState<Summary>({ totalFamilies: 0, completedFamilies: 0, inProgressFamilies: 0, pendingFamilies: 0 })
  const [professionals, setProfessionals] = useState<ProfessionalProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [entityName, setEntityName] = useState('')

  useEffect(() => { load() }, [user?.entityId])

  async function load() {
    if (!user?.entityId) { setLoading(false); return }
    setLoading(true)
    try {
      try {
        const entity = await databases.getDocument(DATABASE_ID, COLLECTION_IDS.ENTITIES, user.entityId)
        setEntityName(entity.name)
      } catch { setEntityName('') }

      const familiesRes = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FAMILIES, [
        Query.equal('entity_id', user.entityId), Query.limit(500),
      ])
      const families = familiesRes.documents
      const completed = families.filter((f: any) => f.overall_status === 'completed').length
      const inProgress = families.filter((f: any) => f.overall_status === 'in_progress').length
      setSummary({ totalFamilies: families.length, completedFamilies: completed, inProgressFamilies: inProgress, pendingFamilies: families.length - completed - inProgress })

      const usersRes = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.USER_PROFILES, [
        Query.equal('entity_id', user.entityId), Query.equal('role', 'professional'), Query.limit(50),
      ])

      const progressList: ProfessionalProgress[] = usersRes.documents.map((prof: any) => {
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
    } catch { }
    setLoading(false)
  }

  const pct = summary.totalFamilies > 0 ? Math.round((summary.completedFamilies / summary.totalFamilies) * 100) : 0

  const kpis = [
    { label: 'Familias meta', value: summary.totalFamilies, icon: <Users size={20} />, color: '#1B3A4B' },
    { label: 'Completadas', value: summary.completedFamilies, icon: <CheckCircle size={20} />, color: '#27AE60' },
    { label: 'En progreso', value: summary.inProgressFamilies, icon: <Clock size={20} />, color: '#F39C12' },
    { label: '% Avance', value: `${pct}%`, icon: <TrendingUp size={20} />, color: '#3D7B9E' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <TopBar
        title="Dashboard Coordinador"
        subtitle={entityName || 'Seguimiento en tiempo real'}
        actions={
          <button onClick={load} className="p-2 hover:bg-muted rounded-lg transition-colors" title="Actualizar">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white mb-3" style={{ background: kpi.color }}>
              {kpi.icon}
            </div>
            <div className="text-2xl font-black text-foreground">{kpi.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Avance general de la operación</span>
          <span className="text-sm font-bold" style={{ color: '#1B3A4B' }}>{pct}%</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: '#1B3A4B' }} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm mt-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-bold">Avance por Profesional</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Cargando datos...</div>
        ) : professionals.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No hay profesionales asignados aún. Ve a <strong>Equipo</strong> para invitar profesionales.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Profesional','Familias','Ex-Antes','M1','M2','M3','Ex-Post','% Avance'].map(h => (
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
                          <div className="h-full rounded-full" style={{ width: `${p.percentageComplete}%`, background: p.percentageComplete === 100 ? '#27AE60' : '#1B3A4B' }} />
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
    </div>
  )
}
