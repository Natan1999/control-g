import { useState, useEffect } from 'react'
import { Plus, Building2, X, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TopBar } from '@/components/layout/Sidebar'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { ID, Query } from 'appwrite'

const DEPARTAMENTOS = ['Bolívar', 'Atlántico', 'Magdalena', 'Sucre', 'Córdoba', 'Antioquia', 'Cundinamarca', 'Valle del Cauca']
const MUNICIPIOS_BOLIVAR = [
  'Cartagena', 'Barranquilla', 'Turbaco', 'El Carmen de Bolívar', 'San Juan Nepomuceno',
  'Altos del Rosario', 'Mahates', 'San Jacinto', 'Mompós', 'Arjona', 'Magangué',
  'San Estanislao', 'Santa Rosa', 'Villanueva', 'Zambrano', 'Córdoba', 'Margarita',
]

interface EntityForm {
  name: string; nit: string; contract_number: string; contract_object: string
  operator_name: string; department: string; period_start: string; period_end: string
  families_per_municipality: number; coordinator_email: string
  municipalities: string[]
}

const EMPTY_FORM: EntityForm = {
  name: '', nit: '', contract_number: '', contract_object: '', operator_name: '',
  department: 'Bolívar', period_start: '', period_end: '',
  families_per_municipality: 35, coordinator_email: '', municipalities: [],
}

export default function AdminEntitiesPage() {
  const [entities, setEntities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<EntityForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [munSearch, setMunSearch] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  useEffect(() => { loadEntities() }, [])

  async function loadEntities() {
    try {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ENTITIES, [Query.orderDesc('$createdAt'), Query.limit(50)])
      setEntities(res.documents)
    } catch { setEntities([]) }
    finally { setLoading(false) }
  }

  const toggleMun = (m: string) =>
    setForm(f => ({
      ...f,
      municipalities: f.municipalities.includes(m)
        ? f.municipalities.filter(x => x !== m)
        : [...f.municipalities, m],
    }))

  async function handleSave() {
    if (!form.name || !form.contract_number || !form.operator_name || !form.period_start || !form.period_end) {
      showToast('Completa todos los campos obligatorios')
      return
    }
    setSaving(true)
    try {
      const entity = await databases.createDocument(DATABASE_ID, COLLECTION_IDS.ENTITIES, ID.unique(), {
        name: form.name, nit: form.nit, contract_number: form.contract_number,
        contract_object: form.contract_object, operator_name: form.operator_name,
        department: form.department, period_start: form.period_start, period_end: form.period_end,
        families_per_municipality: form.families_per_municipality, status: 'active',
      })
      // Create municipalities
      for (const mun of form.municipalities) {
        await databases.createDocument(DATABASE_ID, COLLECTION_IDS.ENTITY_MUNICIPALITIES, ID.unique(), {
          entity_id: entity.$id, municipality_name: mun, department: form.department,
          families_target: form.families_per_municipality,
        })
      }
      showToast(`Entidad "${form.name}" creada exitosamente`)
      setShowForm(false)
      setForm(EMPTY_FORM)
      loadEntities()
    } catch (err: any) {
      showToast('Error al guardar: ' + (err?.message ?? 'intenta de nuevo'))
    }
    setSaving(false)
  }

  async function toggleStatus(entity: any) {
    const newStatus = entity.status === 'active' ? 'suspended' : 'active'
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.ENTITIES, entity.$id, { status: newStatus })
      setEntities(prev => prev.map(e => e.$id === entity.$id ? { ...e, status: newStatus } : e))
    } catch { showToast('Error al actualizar estado') }
  }

  const filtered = MUNICIPIOS_BOLIVAR.filter(m => m.toLowerCase().includes(munSearch.toLowerCase()))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <TopBar
        title="Entidades"
        subtitle="Contratos y clientes del sistema"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-semibold"
            style={{ background: '#1B3A4B' }}
          >
            <Plus size={16} /> Nueva Entidad
          </button>
        }
      />

      {loading ? (
        <div className="mt-8 text-center text-muted-foreground">Cargando...</div>
      ) : entities.length === 0 ? (
        <div className="mt-12 text-center">
          <Building2 size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No hay entidades registradas.</p>
          <button onClick={() => setShowForm(true)} className="px-5 py-2.5 text-white rounded-xl font-semibold" style={{ background: '#1B3A4B' }}>
            Crear primera entidad
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {entities.map((e: any) => (
            <div key={e.$id} className="bg-white rounded-2xl border border-border p-5 shadow-sm flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-foreground">{e.name}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {e.status === 'active' ? 'Activo' : 'Suspendido'}
                  </span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
                  <div>Contrato: <span className="font-medium text-foreground">{e.contract_number}</span></div>
                  <div>Operador: {e.operator_name} {e.nit && `· NIT: ${e.nit}`}</div>
                  <div>Período: {e.period_start} — {e.period_end}</div>
                  <div>Departamento: {e.department} · Meta: {e.families_per_municipality} familias/municipio</div>
                </div>
              </div>
              <button
                onClick={() => toggleStatus(e)}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  e.status === 'active' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'
                }`}
              >
                {e.status === 'active' ? 'Suspender' : 'Activar'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Entity Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false) }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
                <h2 className="font-bold text-lg">Crear nueva entidad</h2>
                <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-muted rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nombre de la entidad *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Ej: Secretaría de Seguridad de Bolívar"
                      className="mt-1 w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">NIT</label>
                    <input value={form.nit} onChange={e => setForm(f => ({ ...f, nit: e.target.value }))}
                      placeholder="806.007.XXX"
                      className="mt-1 w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Número de contrato *</label>
                    <input value={form.contract_number} onChange={e => setForm(f => ({ ...f, contract_number: e.target.value }))}
                      placeholder="13-PSC-2025"
                      className="mt-1 w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Objeto del contrato</label>
                    <textarea value={form.contract_object} onChange={e => setForm(f => ({ ...f, contract_object: e.target.value }))}
                      placeholder="Prestación de servicios para soporte en captura de información..."
                      rows={3}
                      className="mt-1 w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contratista / Operador *</label>
                    <input value={form.operator_name} onChange={e => setForm(f => ({ ...f, operator_name: e.target.value }))}
                      placeholder="FUNSERVAR"
                      className="mt-1 w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Departamento</label>
                    <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30 bg-white">
                      {DEPARTAMENTOS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fecha inicio *</label>
                    <input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fecha fin *</label>
                    <input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Familias meta por municipio</label>
                    <input type="number" value={form.families_per_municipality} onChange={e => setForm(f => ({ ...f, families_per_municipality: +e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email del Coordinador</label>
                    <input type="email" value={form.coordinator_email} onChange={e => setForm(f => ({ ...f, coordinator_email: e.target.value }))}
                      placeholder="coordinador@entidad.gov.co"
                      className="mt-1 w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30" />
                  </div>
                </div>

                {/* Municipalities */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Municipios de cobertura ({form.municipalities.length} seleccionados)</label>
                  <input value={munSearch} onChange={e => setMunSearch(e.target.value)}
                    placeholder="Buscar municipio..."
                    className="mt-1 w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30" />
                  <div className="mt-2 flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                    {filtered.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMun(m)}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                          form.municipalities.includes(m)
                            ? 'border-[#1B3A4B] bg-[#1B3A4B] text-white'
                            : 'border-border text-muted-foreground hover:border-[#1B3A4B]/40'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium">
                    Cancelar
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-60"
                    style={{ background: '#1B3A4B' }}>
                    {saving ? 'Guardando...' : 'Crear Entidad'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-5 py-3 rounded-2xl shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
