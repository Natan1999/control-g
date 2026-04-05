import { useState, useEffect } from 'react'
import { Users, Search, X, ChevronDown, UserPlus } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper } from '@/components/shared'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query, ID } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'

type OverallFilter = 'all' | 'pending' | 'in_progress' | 'completed'

const FILTER_LABELS: Record<OverallFilter, string> = {
  all: 'Todas',
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  completed: 'Completadas',
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:     { label: 'PENDIENTE',    cls: 'bg-gray-100 text-gray-600' },
  in_progress: { label: 'EN PROGRESO',  cls: 'bg-orange-100 text-orange-700' },
  completed:   { label: 'COMPLETADO',   cls: 'bg-green-100 text-green-700' },
}

const ID_TYPES = ['CC', 'TI', 'CE', 'PA', 'RC', 'PEP', 'PPT']

const ACTIVITY_LABELS = [
  { key: 'ex_ante_status',    label: 'Ex' },
  { key: 'encounter_1_status', label: 'M1' },
  { key: 'encounter_2_status', label: 'M2' },
  { key: 'encounter_3_status', label: 'M3' },
  { key: 'ex_post_status',    label: 'EP' },
]

function ActivityDots({ family }: { family: any }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      {ACTIVITY_LABELS.map(({ key, label }) => {
        const done = family[key] === 'completed'
        return (
          <div key={key} className="flex items-center gap-0.5 text-xs">
            <span className={`font-medium ${done ? 'text-green-600' : 'text-gray-400'}`}>{label}</span>
            <span className={`text-sm leading-none ${done ? 'text-green-500' : 'text-gray-300'}`}>{done ? '✅' : '◻'}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function FamiliesPage() {
  const { user } = useAuthStore()
  const [families, setFamilies] = useState<any[]>([])
  const [municipalities, setMunicipalities] = useState<any[]>([])
  const [professionals, setProfessionals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<OverallFilter>('all')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [toast, setToast] = useState('')

  const defaultForm = {
    first_name: '', second_name: '', first_lastname: '', second_lastname: '',
    id_document_type: 'CC', id_number: '', phone: '', address: '',
    municipality_id: '', professional_id: '',
  }
  const [form, setForm] = useState({ ...defaultForm })

  useEffect(() => {
    if (user?.entityId) loadAll()
  }, [user?.entityId])

  async function loadAll() {
    setLoading(true)
    try {
      const [famRes, munRes, profRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FAMILIES, [
          Query.equal('entity_id', user!.entityId!), Query.limit(200),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ENTITY_MUNICIPALITIES, [
          Query.equal('entity_id', user!.entityId!), Query.limit(100),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.USER_PROFILES, [
          Query.equal('entity_id', user!.entityId!),
          Query.equal('role', 'professional'),
          Query.limit(100),
        ]),
      ])
      setFamilies(famRes.documents)
      setMunicipalities(munRes.documents)
      setProfessionals(profRes.documents)
    } catch (err) {
      console.error('Error cargando familias:', err)
    } finally {
      setLoading(false)
    }
  }

  function getMunicipalityName(id: string) {
    return municipalities.find(m => m.$id === id)?.municipality_name ?? '—'
  }

  function getProfessionalName(id: string) {
    return professionals.find(p => p.$id === id || p.user_id === id)?.full_name ?? '—'
  }

  const filtered = families.filter(f => {
    const name = `${f.first_name ?? ''} ${f.first_lastname ?? ''} ${f.full_name ?? ''}`.toLowerCase()
    const matchSearch = name.includes(search.toLowerCase()) || (f.id_number ?? '').includes(search)
    const matchFilter = filter === 'all' || f.overall_status === filter
    return matchSearch && matchFilter
  })

  async function handleSave() {
    if (!form.first_name.trim() || !form.first_lastname.trim() || !form.id_number.trim()) {
      setSaveError('Nombre, apellido y documento son requeridos')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_IDS.FAMILIES,
        ID.unique(),
        {
          entity_id: user?.entityId,
          municipality_id: form.municipality_id || null,
          professional_id: form.professional_id || null,
          first_name: form.first_name,
          second_name: form.second_name || null,
          first_lastname: form.first_lastname,
          second_lastname: form.second_lastname || null,
          id_document_type: form.id_document_type,
          id_number: form.id_number,
          phone: form.phone || null,
          address: form.address || null,
          overall_status: 'pending',
          ex_ante_status: 'pending',
          encounter_1_status: 'pending',
          encounter_2_status: 'pending',
          encounter_3_status: 'pending',
          ex_post_status: 'pending',
          dependents: 0,
          companion_required: false,
          consent_given: false,
        }
      )
      setToast('Familia registrada exitosamente')
      setTimeout(() => setToast(''), 3500)
      setShowModal(false)
      setForm({ ...defaultForm })
      loadAll()
    } catch (err) {
      console.error('Error guardando familia:', err)
      setSaveError('Error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageWrapper>
      <TopBar
        title="Familias"
        subtitle="Listado completo con estado de las 5 actividades"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#1B3A4B] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2a5570] transition-colors"
          >
            <UserPlus size={16} /> Agregar familia
          </button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Search & Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o documento..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30"
            />
          </div>
          <div className="flex gap-1.5">
            {(Object.keys(FILTER_LABELS) as OverallFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${filter === f ? 'bg-[#1B3A4B] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <div className="animate-spin w-6 h-6 border-2 border-[#1B3A4B] border-t-transparent rounded-full mr-3" />
            Cargando familias...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users size={44} className="mx-auto mb-4 opacity-25" />
            <p className="font-semibold">No se encontraron familias</p>
            <p className="text-sm mt-1">Ajusta los filtros o agrega una nueva familia.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((f: any) => {
              const status = STATUS_BADGE[f.overall_status] ?? STATUS_BADGE.pending
              const displayName = f.full_name || `${f.first_name ?? ''} ${f.first_lastname ?? ''}`.trim() || '—'
              return (
                <div key={f.$id} className="bg-card rounded-2xl border border-border p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-foreground">{displayName}</p>
                        <span className="text-xs text-muted-foreground">{f.id_document_type} {f.id_number}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {getMunicipalityName(f.municipality_id)} · {getProfessionalName(f.professional_id)}
                      </div>
                      <ActivityDots family={f} />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${status.cls}`}>
                      {status.label}
                    </span>
                  </div>
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

      {/* Add Family Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Agregar Familia</h2>
              <button onClick={() => { setShowModal(false); setForm({ ...defaultForm }); setSaveError('') }} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Primer nombre *</label>
                  <input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                    placeholder="Ej: María"
                    className="w-full px-3 py-2 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Segundo nombre</label>
                  <input value={form.second_name} onChange={e => setForm(p => ({ ...p, second_name: e.target.value }))}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Primer apellido *</label>
                  <input value={form.first_lastname} onChange={e => setForm(p => ({ ...p, first_lastname: e.target.value }))}
                    placeholder="Ej: García"
                    className="w-full px-3 py-2 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Segundo apellido</label>
                  <input value={form.second_lastname} onChange={e => setForm(p => ({ ...p, second_lastname: e.target.value }))}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Tipo de documento *</label>
                  <div className="relative">
                    <select value={form.id_document_type} onChange={e => setForm(p => ({ ...p, id_document_type: e.target.value }))}
                      className="w-full appearance-none px-3 py-2 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30 pr-8">
                      {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Número de documento *</label>
                  <input value={form.id_number} onChange={e => setForm(p => ({ ...p, id_number: e.target.value }))}
                    placeholder="Ej: 1234567890"
                    className="w-full px-3 py-2 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Teléfono</label>
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Dirección</label>
                  <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Municipio</label>
                <div className="relative">
                  <select value={form.municipality_id} onChange={e => setForm(p => ({ ...p, municipality_id: e.target.value }))}
                    className="w-full appearance-none px-3 py-2 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30 pr-8">
                    <option value="">Seleccionar municipio...</option>
                    {municipalities.map((m: any) => <option key={m.$id} value={m.$id}>{m.municipality_name}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Profesional asignado</label>
                <div className="relative">
                  <select value={form.professional_id} onChange={e => setForm(p => ({ ...p, professional_id: e.target.value }))}
                    className="w-full appearance-none px-3 py-2 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30 pr-8">
                    <option value="">Seleccionar profesional...</option>
                    {professionals.map((p: any) => <option key={p.$id} value={p.$id}>{p.full_name}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {saveError && <p className="text-sm text-red-500">{saveError}</p>}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowModal(false); setForm({ ...defaultForm }); setSaveError('') }}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1B3A4B] text-white text-sm font-medium hover:bg-[#2a5570] transition-colors disabled:opacity-60"
              >
                {saving ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : 'Guardar familia'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
