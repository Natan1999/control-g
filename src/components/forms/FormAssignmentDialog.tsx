import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  CheckCircle2,
  Flag,
  Loader2,
  MapPin,
  Search,
  Target,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
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

const PRIORITIES = [
  { value: 1, label: 'Urgente' },
  { value: 2, label: 'Alta' },
  { value: 3, label: 'Normal' },
  { value: 4, label: 'Baja' },
  { value: 5, label: 'Opcional' },
]

function toDateTimeLocal(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function toISOStringOrNull(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export default function FormAssignmentDialog({ form, onClose, onSaved }: Props) {
  const { user } = useAuthStore()
  const [professionals, setProfessionals] = useState<any[]>([])
  const [municipalities, setMunicipalities] = useState<any[]>([])
  const [professionalTerritories, setProfessionalTerritories] = useState<Map<string, Set<string>>>(new Map())
  const [existingAssignments, setExistingAssignments] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [territoryId, setTerritoryId] = useState('')
  const [groupCode, setGroupCode] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [priority, setPriority] = useState(3)
  const [quota, setQuota] = useState('')
  const [instructions, setInstructions] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const formId = form.id || form.$id || ''
  const entityId = form.entityId || form.entity_id || ''
  const municipalityNames = useMemo(() => new Map(municipalities.map(item => [item.$id, item.municipality_name])), [municipalities])

  useEffect(() => {
    async function load() {
      if (!formId || !entityId) {
        setError('El formulario no tiene una entidad válida.')
        setLoading(false)
        return
      }
      try {
        const [profiles, assignments, territoryResult, professionalAssignmentResult] = await Promise.all([
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
          databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ENTITY_MUNICIPALITIES, [
            Query.equal('entity_id', entityId),
            Query.orderAsc('municipality_name'),
            Query.limit(500),
          ]),
          databases.listDocuments(DATABASE_ID, COLLECTION_IDS.PROFESSIONAL_ASSIGNMENTS, [
            Query.equal('entity_id', entityId),
            Query.limit(2000),
          ]),
        ])
        const territoryMap = new Map<string, Set<string>>()
        professionalAssignmentResult.documents.forEach((assignment: any) => {
          const current = territoryMap.get(assignment.professional_id) || new Set<string>()
          current.add(assignment.municipality_id)
          territoryMap.set(assignment.professional_id, current)
        })
        const activeAssignments = assignments.documents.filter((assignment: any) => assignment.status === 'active')
        const seed = activeAssignments[0]
        setProfessionals(profiles.documents)
        setMunicipalities(territoryResult.documents)
        setProfessionalTerritories(territoryMap)
        setExistingAssignments(assignments.documents)
        setSelected(new Set(activeAssignments.map((assignment: any) => assignment.professional_id)))
        if (seed) {
          const commonTerritory = activeAssignments.every((item: any) => (item.territory_id || '') === (seed.territory_id || ''))
          const commonGroup = activeAssignments.every((item: any) => (item.group_code || '') === (seed.group_code || ''))
          const commonStartsAt = activeAssignments.every((item: any) => (item.starts_at || '') === (seed.starts_at || ''))
          const commonEndsAt = activeAssignments.every((item: any) => (item.ends_at || '') === (seed.ends_at || ''))
          const commonPriority = activeAssignments.every((item: any) => Number(item.priority || 3) === Number(seed.priority || 3))
          const commonQuota = activeAssignments.every((item: any) => (item.quota ?? '') === (seed.quota ?? ''))
          const commonInstructions = activeAssignments.every((item: any) => (item.instructions || '') === (seed.instructions || ''))
          if (commonTerritory) setTerritoryId(seed.territory_id || '')
          if (commonGroup) setGroupCode(seed.group_code || '')
          if (commonStartsAt) setStartsAt(toDateTimeLocal(seed.starts_at))
          if (commonEndsAt) setEndsAt(toDateTimeLocal(seed.ends_at))
          if (commonPriority) setPriority(Number(seed.priority || 3))
          if (commonQuota) setQuota(seed.quota ? String(seed.quota) : '')
          if (commonInstructions) setInstructions(seed.instructions || '')
        }
      } catch (loadError) {
        console.error('Error loading form assignments:', loadError)
        setError('No fue posible cargar las asignaciones. Verifica que la migración avanzada esté aplicada.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [entityId, formId])

  const eligibleProfessionals = useMemo(() => territoryId
    ? professionals.filter(professional => professionalTerritories.get(professional.user_id)?.has(territoryId))
    : professionals, [professionalTerritories, professionals, territoryId])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return eligibleProfessionals
    return eligibleProfessionals.filter(professional => {
      const territories = Array.from(professionalTerritories.get(professional.user_id) || [])
        .map(id => municipalityNames.get(id) || '')
        .join(' ')
      return `${professional.full_name || ''} ${professional.email || ''} ${territories}`.toLowerCase().includes(term)
    })
  }, [eligibleProfessionals, municipalityNames, professionalTerritories, search])

  function toggle(professionalId: string) {
    setSelected(current => {
      const next = new Set(current)
      if (next.has(professionalId)) next.delete(professionalId)
      else next.add(professionalId)
      return next
    })
  }

  function changeTerritory(nextTerritoryId: string) {
    setTerritoryId(nextTerritoryId)
    if (!nextTerritoryId) return
    setSelected(current => new Set(Array.from(current).filter(professionalId => professionalTerritories.get(professionalId)?.has(nextTerritoryId))))
  }

  function selectVisible() {
    setSelected(current => {
      const next = new Set(current)
      filtered.forEach(professional => next.add(professional.user_id))
      return next
    })
  }

  async function save() {
    if (!user?.id || !formId || !entityId) return
    const parsedQuota = quota === '' ? null : Number(quota)
    const startIso = toISOStringOrNull(startsAt)
    const endIso = toISOStringOrNull(endsAt)
    if (quota !== '' && (!Number.isInteger(parsedQuota) || Number(parsedQuota) <= 0)) {
      setError('La cuota debe ser un número entero mayor que cero.')
      return
    }
    if (groupCode.trim().length === 1) {
      setError('El nombre del grupo debe tener al menos dos caracteres.')
      return
    }
    if (startIso && endIso && new Date(startIso) >= new Date(endIso)) {
      setError('La fecha final debe ser posterior a la fecha inicial.')
      return
    }
    if (territoryId && Array.from(selected).some(professionalId => !professionalTerritories.get(professionalId)?.has(territoryId))) {
      setError('Todos los profesionales seleccionados deben estar habilitados para el territorio.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const byProfessional = new Map(existingAssignments.map(assignment => [assignment.professional_id, assignment]))
      const removals = existingAssignments
        .filter(assignment => assignment.status === 'active' && !selected.has(assignment.professional_id))
        .map(assignment => databases.updateDocument(DATABASE_ID, COLLECTION_IDS.FORM_ASSIGNMENTS, assignment.$id, {
          status: 'inactive',
          assigned_by: user.id,
        }))
      const assignmentPayload = {
        status: 'active',
        assigned_by: user.id,
        starts_at: startIso,
        ends_at: endIso,
        priority,
        quota: parsedQuota,
        territory_id: territoryId || null,
        group_code: groupCode.trim() || null,
        instructions: instructions.trim() || null,
      }
      const additions = Array.from(selected).map(professionalId => {
        const existing = byProfessional.get(professionalId)
        if (existing) return databases.updateDocument(DATABASE_ID, COLLECTION_IDS.FORM_ASSIGNMENTS, existing.$id, assignmentPayload)
        return databases.createDocument(DATABASE_ID, COLLECTION_IDS.FORM_ASSIGNMENTS, ID.unique(), {
          entity_id: entityId,
          form_id: formId,
          professional_id: professionalId,
          ...assignmentPayload,
        })
      })
      await Promise.all([...removals, ...additions])
      onSaved(selected.size)
      onClose()
    } catch (saveError) {
      console.error('Error saving form assignments:', saveError)
      setError('No fue posible guardar las asignaciones. Revisa territorio, fechas y migración de Supabase.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-700"><UserCheck size={16} /> Asignación operativa</div>
            <h2 className="mt-2 text-lg font-black text-slate-900">{form.title}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Solo el personal seleccionado descargará este formulario. Los cambios quedan trazables y disponibles offline.</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100" aria-label="Cerrar"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <section className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2" aria-label="Parámetros de la asignación">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500"><span className="mb-1.5 flex items-center gap-1"><MapPin size={13} /> Territorio</span><select value={territoryId} onChange={event => changeTerritory(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold normal-case tracking-normal text-slate-800"><option value="">Todos / sin restricción</option>{municipalities.map(item => <option key={item.$id} value={item.$id}>{item.municipality_name}</option>)}</select></label>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500"><span className="mb-1.5 flex items-center gap-1"><Users size={13} /> Grupo operativo</span><input value={groupCode} maxLength={80} onChange={event => setGroupCode(event.target.value)} placeholder="Ej. Brigada Sur A" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold normal-case tracking-normal text-slate-800" /></label>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500"><span className="mb-1.5 flex items-center gap-1"><Calendar size={13} /> Inicio</span><input type="datetime-local" value={startsAt} onChange={event => setStartsAt(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold normal-case tracking-normal text-slate-800" /></label>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500"><span className="mb-1.5 flex items-center gap-1"><Calendar size={13} /> Cierre</span><input type="datetime-local" value={endsAt} onChange={event => setEndsAt(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold normal-case tracking-normal text-slate-800" /></label>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500"><span className="mb-1.5 flex items-center gap-1"><Flag size={13} /> Prioridad</span><select value={priority} onChange={event => setPriority(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold normal-case tracking-normal text-slate-800">{PRIORITIES.map(item => <option key={item.value} value={item.value}>{item.value}. {item.label}</option>)}</select></label>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500"><span className="mb-1.5 flex items-center gap-1"><Target size={13} /> Cuota por profesional</span><input type="number" min="1" step="1" value={quota} onChange={event => setQuota(event.target.value)} placeholder="Sin límite" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold normal-case tracking-normal text-slate-800" /></label>
            <label className="sm:col-span-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Instrucciones para campo<textarea value={instructions} maxLength={1000} onChange={event => setInstructions(event.target.value)} rows={2} placeholder="Protocolo, población objetivo o recomendación visible al profesional" className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium normal-case leading-5 tracking-normal text-slate-800" /></label>
            <p className="sm:col-span-2 text-[10px] leading-4 text-slate-500">Estos parámetros se aplican en bloque a las personas seleccionadas. La cuota orienta y detiene nuevas capturas conocidas, pero una evidencia ya recolectada offline nunca se descarta al sincronizar.</p>
          </section>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nombre, correo o territorio" className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
            <button type="button" onClick={selectVisible} disabled={!filtered.length} className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-black text-blue-800 disabled:opacity-50">Seleccionar visibles</button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500"><Loader2 size={20} className="animate-spin" /> Cargando profesionales...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No hay profesionales activos habilitados para este filtro territorial.</div>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {filtered.map(professional => {
                const professionalId = professional.user_id
                const checked = selected.has(professionalId)
                const territories = Array.from(professionalTerritories.get(professionalId) || []).map(id => municipalityNames.get(id)).filter(Boolean)
                return (
                  <button key={professional.$id} type="button" onClick={() => toggle(professionalId)} className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all ${checked ? 'border-blue-300 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}>
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black ${checked ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'}`}>{checked ? <CheckCircle2 size={18} /> : (professional.full_name || '?').charAt(0).toUpperCase()}</div>
                    <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold text-slate-900">{professional.full_name}</div><div className="truncate text-xs text-slate-500">{professional.email}</div><div className="mt-1 truncate text-[10px] text-slate-400">{territories.length ? territories.join(', ') : 'Sin territorio asignado'}</div></div>
                  </button>
                )
              })}
            </div>
          )}
          {error && <p className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p>}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <span className="text-xs font-bold text-slate-500">{selected.size} profesionales seleccionados</span>
          <div className="flex gap-2"><button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Cancelar</button><button onClick={() => void save()} disabled={loading || saving} className="flex items-center gap-2 rounded-xl bg-[#0038A8] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving && <Loader2 size={16} className="animate-spin" />} Guardar asignación</button></div>
        </div>
      </div>
    </div>
  )
}
