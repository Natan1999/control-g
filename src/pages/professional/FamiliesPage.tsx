import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CheckCircle, Circle } from 'lucide-react'
import { MobileTopBar, BottomNav } from '@/components/layout/BottomNav'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

interface FamilyDoc {
  $id: string
  first_name?: string
  second_name?: string
  first_lastname?: string
  second_lastname?: string
  id_number?: string
  overall_status: string
  ex_ante_status: string
  encounter_1_status: string
  encounter_2_status: string
  encounter_3_status: string
  ex_post_status: string
}

type FilterTab = 'all' | 'pending' | 'in_progress' | 'completed'

function getOverallStatus(f: FamilyDoc): string {
  return f.overall_status ?? 'pending'
}

function getNextActivityPath(f: FamilyDoc): { label: string; path: string } | null {
  if (f.ex_ante_status !== 'completed') {
    return { label: 'Iniciar Caracterización Ex-Antes', path: `/field/activity/${f.$id}/ex_ante` }
  }
  if (f.encounter_1_status !== 'completed') {
    return { label: 'Realizar Momento 1', path: `/field/activity/${f.$id}/encounter_1` }
  }
  if (f.encounter_2_status !== 'completed') {
    return { label: 'Realizar Momento 2', path: `/field/activity/${f.$id}/encounter_2` }
  }
  if (f.encounter_3_status !== 'completed') {
    return { label: 'Realizar Momento 3', path: `/field/activity/${f.$id}/encounter_3` }
  }
  if (f.ex_post_status !== 'completed') {
    return { label: 'Realizar Ex-Post', path: `/field/activity/${f.$id}/ex_post` }
  }
  return null
}

function StatusDots({ family }: { family: FamilyDoc }) {
  const steps = [
    { key: 'ex_ante_status', label: 'Ex' },
    { key: 'encounter_1_status', label: 'M1' },
    { key: 'encounter_2_status', label: 'M2' },
    { key: 'encounter_3_status', label: 'M3' },
    { key: 'ex_post_status', label: 'EP' },
  ]
  return (
    <div className="flex items-center gap-2 mt-2">
      {steps.map(s => {
        const done = (family as any)[s.key] === 'completed'
        return (
          <div key={s.key} className="flex flex-col items-center gap-0.5">
            {done
              ? <CheckCircle size={16} className="text-green-500" />
              : <Circle size={16} className="text-gray-300" />
            }
            <span className="text-[9px] text-muted-foreground font-semibold">{s.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function FieldFamiliesPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [families, setFamilies] = useState<FamilyDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  useEffect(() => { load() }, [user?.id])

  async function load() {
    if (!user?.id) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FAMILIES, [
        Query.equal('professional_id', user.id),
        Query.limit(100),
      ])
      setFamilies(res.documents as unknown as FamilyDoc[])
    } catch { /* silent */ }
    setLoading(false)
  }

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'pending', label: 'Pendiente' },
    { key: 'in_progress', label: 'En Progreso' },
    { key: 'completed', label: 'Completadas' },
  ]

  const filtered = families.filter(f => {
    const name = `${f.first_name ?? ''} ${f.first_lastname ?? ''} ${f.id_number ?? ''}`.toLowerCase()
    const matchSearch = name.includes(search.toLowerCase())
    const matchTab = activeTab === 'all' || getOverallStatus(f) === activeTab
    return matchSearch && matchTab
  })

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: 'PENDIENTE', color: '#95A5A6' },
    in_progress: { label: 'EN PROGRESO', color: '#F39C12' },
    completed: { label: 'COMPLETADO', color: '#27AE60' },
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileTopBar title="Mis Familias" />

      <div className="flex-1 overflow-y-auto pb-24 px-4">
        {/* Search */}
        <div className="relative mt-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o documento..."
            className="w-full pl-9 pr-4 py-3 rounded-xl border border-input bg-white text-sm focus:outline-none focus:ring-2 shadow-sm"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0',
                activeTab === tab.key
                  ? 'text-white'
                  : 'bg-white border border-border text-muted-foreground hover:bg-muted'
              )}
              style={activeTab === tab.key ? { background: '#1B3A4B' } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Family list */}
        <div className="mt-4 space-y-3">
          {loading ? (
            [0, 1, 2].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-border h-[120px] animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border p-8 text-center">
              <p className="text-sm text-muted-foreground font-semibold">No se encontraron familias</p>
            </div>
          ) : (
            filtered.map(f => {
              const status = getOverallStatus(f)
              const cfg = statusConfig[status] ?? statusConfig.pending
              const next = getNextActivityPath(f)
              const familyName = `${f.first_name ?? ''} ${f.first_lastname ?? ''}`.trim() || 'Sin nombre'

              return (
                <div key={f.$id} className="bg-white rounded-2xl border border-border p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-foreground">{familyName}</div>
                      {f.id_number && (
                        <div className="text-xs text-muted-foreground mt-0.5">CC. {f.id_number}</div>
                      )}
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white flex-shrink-0"
                      style={{ background: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  <StatusDots family={f} />

                  <div className="mt-3">
                    {next ? (
                      <button
                        onClick={() => navigate(next.path)}
                        className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
                        style={{ background: '#1B3A4B' }}
                      >
                        {next.label}
                      </button>
                    ) : (
                      <div className="text-center text-sm font-bold text-green-600">
                        COMPLETADO ✅
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
