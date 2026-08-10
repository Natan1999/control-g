import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Loader2, Search, UserCheck, X } from 'lucide-react'
import { COLLECTION_IDS, DATABASE_ID, databases, ID, Query } from '@/lib/backend'
import { useAuthStore } from '@/stores/authStore'

interface AssignableForm {
  id?: string
  $id?: string
  title: string
  entityId?: string
  entity_id?: string
}

interface Props {
  form: AssignableForm
  onClose: () => void
  onSaved: (count: number) => void
}

export default function FormAssignmentDialog({ form, onClose, onSaved }: Props) {
  const { user } = useAuthStore()
  const [professionals, setProfessionals] = useState<any[]>([])
  const [existingAssignments, setExistingAssignments] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const formId = form.id || form.$id || ''
  const entityId = form.entityId || form.entity_id || ''

  useEffect(() => {
    async function load() {
      if (!formId || !entityId) {
        setError('El formulario no tiene una entidad válida.')
        setLoading(false)
        return
      }
      try {
        const [profiles, assignments] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTION_IDS.USER_PROFILES, [
            Query.equal('entity_id', entityId),
            Query.equal('role', 'professional'),
            Query.equal('status', 'active'),
            Query.limit(500),
          ]),
          databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORM_ASSIGNMENTS, [
            Query.equal('form_id', formId),
            Query.limit(500),
          ]),
        ])
        setProfessionals(profiles.documents)
        setExistingAssignments(assignments.documents)
        setSelected(new Set(
          assignments.documents
            .filter((assignment: any) => assignment.status === 'active')
            .map((assignment: any) => assignment.professional_id),
        ))
      } catch (loadError) {
        console.error('Error loading form assignments:', loadError)
        setError('No fue posible cargar las asignaciones. Verifica que la migración esté aplicada.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [entityId, formId])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return professionals
    return professionals.filter(professional =>
      `${professional.full_name || ''} ${professional.email || ''}`.toLowerCase().includes(term),
    )
  }, [professionals, search])

  function toggle(professionalId: string) {
    setSelected(current => {
      const next = new Set(current)
      if (next.has(professionalId)) next.delete(professionalId)
      else next.add(professionalId)
      return next
    })
  }

  async function save() {
    if (!user?.id || !formId || !entityId) return
    setSaving(true)
    setError('')
    try {
      const byProfessional = new Map(
        existingAssignments.map(assignment => [assignment.professional_id, assignment]),
      )
      const removals = existingAssignments
        .filter(assignment => assignment.status === 'active' && !selected.has(assignment.professional_id))
        .map(assignment => databases.deleteDocument(
          DATABASE_ID,
          COLLECTION_IDS.FORM_ASSIGNMENTS,
          assignment.$id,
        ))
      const additions = Array.from(selected).map(professionalId => {
        const existing = byProfessional.get(professionalId)
        if (existing) {
          if (existing.status === 'active') return Promise.resolve(existing)
          return databases.updateDocument(DATABASE_ID, COLLECTION_IDS.FORM_ASSIGNMENTS, existing.$id, {
            status: 'active',
            assigned_by: user.id,
          })
        }
        return databases.createDocument(DATABASE_ID, COLLECTION_IDS.FORM_ASSIGNMENTS, ID.unique(), {
          entity_id: entityId,
          form_id: formId,
          professional_id: professionalId,
          assigned_by: user.id,
          status: 'active',
        })
      })
      await Promise.all([...removals, ...additions])
      onSaved(selected.size)
      onClose()
    } catch (saveError) {
      console.error('Error saving form assignments:', saveError)
      setError('No fue posible guardar las asignaciones. Intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl max-h-[90vh] bg-white rounded-[28px] shadow-2xl overflow-hidden flex flex-col">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-700 text-xs font-black uppercase tracking-widest">
              <UserCheck size={16} /> Asignación de campo
            </div>
            <h2 className="font-black text-slate-900 text-lg mt-2">{form.title}</h2>
            <p className="text-xs text-slate-500 mt-1">
              Solo los profesionales seleccionados podrán descargar y diligenciar este formulario.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 sm:p-6 flex-1 overflow-y-auto">
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar profesional por nombre o correo"
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center gap-3 text-slate-500 text-sm">
              <Loader2 size={20} className="animate-spin" /> Cargando profesionales...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No hay profesionales activos para asignar.
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(professional => {
                const professionalId = professional.user_id
                const checked = selected.has(professionalId)
                return (
                  <button
                    key={professional.$id}
                    type="button"
                    onClick={() => toggle(professionalId)}
                    className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      checked ? 'border-blue-300 bg-blue-50' : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
                      checked ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {checked ? <CheckCircle2 size={18} /> : (professional.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-900 truncate">{professional.full_name}</div>
                      <div className="text-xs text-slate-500 truncate">{professional.email}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {error && <p className="mt-4 text-sm font-semibold text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl">{error}</p>}
        </div>

        <div className="p-5 sm:p-6 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-500">{selected.size} profesionales seleccionados</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold">Cancelar</button>
            <button
              onClick={save}
              disabled={loading || saving}
              className="px-5 py-2.5 rounded-xl bg-[#0038A8] text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              Guardar asignación
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
