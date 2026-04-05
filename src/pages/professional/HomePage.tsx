import { useState, useEffect } from 'react'
import { Users, CheckCircle, TrendingUp, AlertTriangle, Clock } from 'lucide-react'
import { MobileTopBar, BottomNav } from '@/components/layout/BottomNav'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'

interface FamilyDoc {
  $id: string
  first_name?: string
  first_lastname?: string
  overall_status: string
  ex_ante_status: string
  encounter_1_status: string
  encounter_2_status: string
  encounter_3_status: string
  ex_post_status: string
  municipality_id?: string
  $updatedAt: string
}

interface ObsDoc {
  $id: string
  content: string
  type: string
}

interface RecentActivity {
  familyId: string
  familyName: string
  activityType: string
  updatedAt: string
}

const ACTIVITY_LABELS: Record<string, string> = {
  ex_ante: 'Caracterización Ex-Antes',
  encounter_1: 'Momento de Encuentro 1',
  encounter_2: 'Momento de Encuentro 2',
  encounter_3: 'Momento de Encuentro 3',
  ex_post: 'Caracterización Ex-Post',
}

function getLastCompletedActivity(f: FamilyDoc): string | null {
  if (f.ex_post_status === 'completed') return 'ex_post'
  if (f.encounter_3_status === 'completed') return 'encounter_3'
  if (f.encounter_2_status === 'completed') return 'encounter_2'
  if (f.encounter_1_status === 'completed') return 'encounter_1'
  if (f.ex_ante_status === 'completed') return 'ex_ante'
  return null
}

export default function FieldHome() {
  const { user } = useAuthStore()
  const [families, setFamilies] = useState<FamilyDoc[]>([])
  const [observations, setObservations] = useState<ObsDoc[]>([])
  const [municipalityName, setMunicipalityName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [user?.id])

  async function load() {
    if (!user?.id) { setLoading(false); return }
    setLoading(true)
    try {
      const [famRes, obsRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FAMILIES, [
          Query.equal('professional_id', user.id),
          Query.limit(200),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.OBSERVATIONS, [
          Query.equal('to_user_id', user.id),
          Query.equal('read', false),
          Query.limit(20),
          Query.orderDesc('$createdAt'),
        ]),
      ])
      const fams = famRes.documents as unknown as FamilyDoc[]
      setFamilies(fams)
      setObservations(obsRes.documents as unknown as ObsDoc[])

      // Get municipality name from first family's municipality_id
      if (fams.length > 0 && fams[0].municipality_id) {
        try {
          const muni = await databases.getDocument(DATABASE_ID, COLLECTION_IDS.ENTITY_MUNICIPALITIES, fams[0].municipality_id)
          setMunicipalityName((muni as any).municipality_name ?? '')
        } catch { /* silent */ }
      }
    } catch { /* silent */ }
    setLoading(false)
  }

  const total = families.length
  const completed = families.filter(f => f.overall_status === 'completed').length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const firstName = user?.fullName?.split(' ')[0] ?? 'Profesional'

  // Last 5 families with any completed activity
  const recentActivities: RecentActivity[] = families
    .filter(f => getLastCompletedActivity(f) !== null)
    .sort((a, b) => new Date(b.$updatedAt).getTime() - new Date(a.$updatedAt).getTime())
    .slice(0, 5)
    .map(f => ({
      familyId: f.$id,
      familyName: `${f.first_name ?? ''} ${f.first_lastname ?? ''}`.trim() || f.$id,
      activityType: getLastCompletedActivity(f)!,
      updatedAt: f.$updatedAt,
    }))

  const kpis = [
    { label: 'Asignadas', value: total, color: '#1B3A4B', icon: <Users size={16} /> },
    { label: 'Completadas', value: completed, color: '#27AE60', icon: <CheckCircle size={16} /> },
    { label: '% Avance', value: `${pct}%`, color: '#3D7B9E', icon: <TrendingUp size={16} /> },
    { label: 'Pendientes sync', value: 0, color: '#95A5A6', icon: <Clock size={16} /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileTopBar />

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Hero */}
        <div className="px-5 pt-5 pb-8" style={{ background: 'linear-gradient(135deg, #1B3A4B 0%, #2C6E8A 100%)' }}>
          <p className="text-white/60 text-sm">Buenos días</p>
          <h1 className="text-white text-2xl font-black mt-0.5">Hola, {firstName}</h1>
          {municipalityName && (
            <p className="text-white/70 text-sm mt-1">{municipalityName}</p>
          )}

          {/* Progress */}
          <div className="mt-4 bg-white/15 backdrop-blur-sm rounded-2xl p-4">
            <div className="text-white/70 text-xs font-medium mb-2">Progreso general</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-white font-bold text-sm">{pct}%</span>
            </div>
            <div className="text-white/60 text-xs mt-1">{completed} de {total} familias completadas</div>
          </div>
        </div>

        {/* KPI mini-cards */}
        <div className="px-4 -mt-4">
          <div className="bg-white rounded-2xl shadow-md border border-border overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-y divide-border">
              {kpis.map((k, i) => (
                <div key={i} className="p-4">
                  <div className="flex items-center gap-1.5 text-xs font-medium mb-1" style={{ color: k.color }}>
                    {k.icon} {k.label}
                  </div>
                  <div className="text-2xl font-black text-foreground">
                    {loading ? '—' : k.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Observations warnings */}
        {!loading && observations.length > 0 && (
          <div className="mx-4 mt-5">
            <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle size={15} className="text-yellow-500" />
              Observaciones recibidas
            </h2>
            <div className="space-y-2.5">
              {observations.map(obs => (
                <div key={obs.$id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={16} className="text-yellow-600" />
                  </div>
                  <p className="text-sm text-yellow-800 leading-relaxed">{obs.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Últimas actividades */}
        <div className="mx-4 mt-5">
          <h2 className="text-sm font-bold text-foreground mb-3">Últimas actividades</h2>
          {loading ? (
            <div className="space-y-2.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="bg-white rounded-xl border border-border h-[60px] animate-pulse" />
              ))}
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="bg-white rounded-xl border border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">No hay actividades completadas aún.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentActivities.map(ra => (
                <div key={ra.familyId} className="bg-white rounded-xl border border-border px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#1B3A4B20' }}>
                    <CheckCircle size={18} style={{ color: '#1B3A4B' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{ra.familyName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {ACTIVITY_LABELS[ra.activityType] ?? ra.activityType}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
