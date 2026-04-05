import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Camera, CheckCircle, Circle } from 'lucide-react'
import { MobileTopBar, BottomNav } from '@/components/layout/BottomNav'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'

interface FamilyDoc {
  $id: string
  first_name?: string
  first_lastname?: string
  id_number?: string
  overall_status: string
  ex_ante_status: string
  encounter_1_status: string
  encounter_2_status: string
  encounter_3_status: string
  ex_post_status: string
}

function getNextActivity(f: FamilyDoc): { label: string; path: string } | null {
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

export default function FieldCapturePage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const freePhotoRef = useRef<HTMLInputElement>(null)
  const [families, setFamilies] = useState<FamilyDoc[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [user?.id])

  async function load() {
    if (!user?.id) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FAMILIES, [
        Query.equal('professional_id', user.id),
        Query.limit(100),
      ])
      setFamilies((res.documents as unknown as FamilyDoc[]).filter(f => f.overall_status !== 'completed'))
    } catch { /* silent */ }
    setLoading(false)
  }

  const filtered = families.filter(f => {
    const name = `${f.first_name ?? ''} ${f.first_lastname ?? ''} ${f.id_number ?? ''}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileTopBar title="Capturar" />

      <div className="flex-1 overflow-y-auto pb-24 px-4">
        {/* Instructions */}
        <div className="mt-4 bg-white rounded-2xl border border-border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#1B3A4B' }}>
              <Camera size={20} className="text-white" />
            </div>
            <div>
              <div className="font-semibold text-sm">Captura de actividad</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Selecciona una familia para realizar la siguiente actividad
              </div>
            </div>
          </div>
        </div>

        {/* Free photo button */}
        <div className="mt-4">
          <input
            ref={freePhotoRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => {
              if (e.target.files?.[0]) {
                // Evidence photo not tied to a specific activity
                alert('Foto capturada como evidencia libre')
              }
            }}
          />
          <button
            onClick={() => freePhotoRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed rounded-xl text-sm font-semibold transition-colors hover:bg-white"
            style={{ borderColor: '#1B3A4B', color: '#1B3A4B' }}
          >
            <Camera size={18} /> Tomar foto libre (evidencia)
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar familia..."
            className="w-full pl-9 pr-4 py-3 rounded-xl border border-input bg-white text-sm focus:outline-none focus:ring-2 shadow-sm"
          />
        </div>

        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-4 mb-2">
          Familias con actividades pendientes
        </h2>

        <div className="space-y-3">
          {loading ? (
            [0, 1, 2].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-border h-[90px] animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border p-8 text-center">
              <CheckCircle size={36} className="mx-auto mb-2 text-green-400" />
              <p className="text-sm text-muted-foreground font-semibold">
                {search ? 'No se encontraron familias' : 'Todas las familias están completadas'}
              </p>
            </div>
          ) : (
            filtered.map(f => {
              const next = getNextActivity(f)
              const familyName = `${f.first_name ?? ''} ${f.first_lastname ?? ''}`.trim() || 'Sin nombre'

              return (
                <div key={f.$id} className="bg-white rounded-2xl border border-border p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="font-bold text-sm">{familyName}</div>
                      {f.id_number && (
                        <div className="text-xs text-muted-foreground mt-0.5">CC. {f.id_number}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {(['ex_ante_status', 'encounter_1_status', 'encounter_2_status', 'encounter_3_status', 'ex_post_status'] as const).map(k => (
                        (f as any)[k] === 'completed'
                          ? <CheckCircle key={k} size={12} className="text-green-500" />
                          : <Circle key={k} size={12} className="text-gray-300" />
                      ))}
                    </div>
                  </div>
                  {next && (
                    <button
                      onClick={() => navigate(next.path)}
                      className="w-full py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                      style={{ background: '#1B3A4B' }}
                    >
                      {next.label}
                    </button>
                  )}
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
