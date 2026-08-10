import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Search,
  XCircle,
} from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import {
  BUCKET_IDS,
  COLLECTION_IDS,
  DATABASE_ID,
  databases,
  Query,
  storage,
} from '@/lib/backend'
import { useAuthStore } from '@/stores/authStore'
import type { FormField, FormPage } from '@/types'

interface ResponseRow {
  $id: string
  form_id: string
  entity_id: string
  professional_id: string
  answers: Record<string, any>
  answers_json?: string
  latitude?: number
  longitude?: number
  status: string
  review_notes?: string
  captured_at: string
  synced_at?: string
}

interface FormInfo {
  title: string
  fields: FormField[]
}

const statusStyle: Record<string, string> = {
  synced: 'bg-amber-50 text-amber-700 border-amber-200',
  reviewed: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
}

const statusLabel: Record<string, string> = {
  synced: 'Por revisar',
  reviewed: 'Revisado',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

function parseAnswers(response: ResponseRow) {
  if (response.answers && typeof response.answers === 'object') return response.answers
  try { return JSON.parse(response.answers_json || '{}') }
  catch { return {} }
}

function parseFields(document: any): FormField[] {
  try {
    const parsed = JSON.parse(document.definition || document.pages_json || '[]')
    const pages: FormPage[] = Array.isArray(parsed) ? parsed : parsed.pages || []
    return pages.flatMap(page => page.fields || [])
  } catch {
    return []
  }
}

function displayValue(value: any): string {
  if (value === null || value === undefined || value === '') return 'Sin respuesta'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (Array.isArray(value)) return value.map(displayValue).join(', ')
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

export default function FormResponsesPage() {
  const { user } = useAuthStore()
  const [responses, setResponses] = useState<ResponseRow[]>([])
  const [forms, setForms] = useState<Record<string, FormInfo>>({})
  const [professionals, setProfessionals] = useState<Record<string, string>>({})
  const [entities, setEntities] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({})
  const [mediaLoading, setMediaLoading] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviewing, setReviewing] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const scoped = user.role === 'admin' || !user.entityId
        ? []
        : [Query.equal('entity_id', user.entityId)]
      const [responseResult, formResult, profileResult, entityResult] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORM_RESPONSES, [
          ...scoped,
          Query.orderDesc('captured_at'),
          Query.limit(1000),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORMS, [
          ...scoped,
          Query.limit(1000),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.USER_PROFILES, [
          ...scoped,
          Query.limit(1000),
        ]),
        user.role === 'admin'
          ? databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ENTITIES, [Query.limit(500)])
          : Promise.resolve({ documents: [], total: 0 }),
      ])

      setResponses(responseResult.documents as unknown as ResponseRow[])
      setForms(Object.fromEntries(formResult.documents.map((form: any) => [
        form.$id,
        { title: form.title || form.name || 'Formulario', fields: parseFields(form) },
      ])))
      setProfessionals(Object.fromEntries(profileResult.documents.map((profile: any) => [
        profile.user_id,
        profile.full_name || profile.email || 'Profesional',
      ])))
      setEntities(Object.fromEntries(entityResult.documents.map((entity: any) => [entity.$id, entity.name])))
    } catch (loadError) {
      console.error('Error loading form responses:', loadError)
      setError('No fue posible consultar las respuestas. Verifica la conexión con Supabase.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return responses.filter(response => {
      if (statusFilter !== 'all' && response.status !== statusFilter) return false
      if (!term) return true
      return `${forms[response.form_id]?.title || ''} ${professionals[response.professional_id] || ''} ${entities[response.entity_id] || ''}`
        .toLowerCase()
        .includes(term)
    })
  }, [entities, forms, professionals, responses, search, statusFilter])

  async function updateReview(response: ResponseRow, status: 'approved' | 'rejected') {
    if (!user?.id) return
    let notes = ''
    if (status === 'rejected') {
      notes = window.prompt('Indica el motivo del rechazo para orientar al profesional:')?.trim() || ''
      if (!notes) return
    }
    setReviewing(response.$id)
    setError('')
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.FORM_RESPONSES, response.$id, {
        status,
        review_notes: notes || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      setResponses(current => current.map(item => item.$id === response.$id
        ? { ...item, status, review_notes: notes }
        : item))
    } catch (reviewError) {
      console.error('Error reviewing form response:', reviewError)
      setError('No fue posible guardar la revisión.')
    } finally {
      setReviewing(null)
    }
  }

  async function openEvidence(responseId: string, field: FormField, path: string) {
    const key = `${responseId}:${field.id}`
    if (mediaUrls[key]) {
      window.open(mediaUrls[key], '_blank', 'noopener,noreferrer')
      return
    }
    setMediaLoading(key)
    try {
      const bucket = field.type === 'signature' ? BUCKET_IDS.SIGNATURES : BUCKET_IDS.FIELD_PHOTOS
      const url = await storage.createSignedUrl(bucket, path)
      setMediaUrls(current => ({ ...current, [key]: url }))
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (mediaError) {
      console.error('Error opening evidence:', mediaError)
      setError('No fue posible abrir la evidencia.')
    } finally {
      setMediaLoading(null)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <TopBar title="Respuestas de formularios" subtitle="Caracterizaciones recibidas desde campo, incluso después de trabajar sin conexión" />
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 bg-white border border-slate-100 rounded-2xl p-3 shadow-sm">
            <div className="relative">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar formulario, profesional o entidad"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
            >
              <option value="all">Todos los estados</option>
              <option value="synced">Por revisar</option>
              <option value="approved">Aprobados</option>
              <option value="rejected">Rechazados</option>
            </select>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-2">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {loading ? (
            <div className="py-20 flex items-center justify-center gap-3 text-slate-500">
              <Loader2 size={22} className="animate-spin" /> Consultando respuestas...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-center px-6">
              <ClipboardCheck size={42} className="mx-auto text-slate-300 mb-3" />
              <h2 className="font-black text-slate-800">Aún no hay respuestas para mostrar</h2>
              <p className="text-sm text-slate-500 mt-2">Las capturas aparecerán aquí después de sincronizarse desde el dispositivo del profesional.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(response => {
                const form = forms[response.form_id] || { title: 'Formulario', fields: [] }
                const answers = parseAnswers(response)
                const fields = form.fields.length > 0
                  ? form.fields
                  : Object.keys(answers).filter(key => key !== '_metadata').map(key => ({ id: key, label: key, type: 'text', required: false } as FormField))
                const isExpanded = expanded === response.$id
                return (
                  <article key={response.$id} className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpanded(isExpanded ? null : response.$id)}
                      className="w-full p-5 sm:p-6 text-left flex items-start justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-black text-slate-900">{form.title}</h2>
                          <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${statusStyle[response.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                            {statusLabel[response.status] || response.status}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                          <span><strong>Profesional:</strong> {professionals[response.professional_id] || response.professional_id}</span>
                          <span><strong>Capturado:</strong> {new Date(response.captured_at).toLocaleString('es-CO')}</span>
                          {user?.role === 'admin' && <span><strong>Entidad:</strong> {entities[response.entity_id] || response.entity_id}</span>}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={20} className="text-slate-400 shrink-0" /> : <ChevronDown size={20} className="text-slate-400 shrink-0" />}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-100 p-5 sm:p-6 bg-slate-50/60">
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {fields.filter(field => field.type !== 'note').map(field => {
                            const value = answers[field.id]
                            const isMedia = (field.type === 'photo' || field.type === 'signature') && typeof value === 'string'
                            const key = `${response.$id}:${field.id}`
                            return (
                              <div key={field.id} className="bg-white border border-slate-100 rounded-2xl p-4 min-w-0">
                                <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{field.label}</dt>
                                <dd className="mt-2 text-sm text-slate-800 whitespace-pre-wrap break-words">
                                  {isMedia ? (
                                    <div className="space-y-3">
                                      {mediaUrls[key] && <img src={mediaUrls[key]} alt={field.label} className="w-full max-h-56 object-contain rounded-xl bg-slate-100" />}
                                      <button
                                        type="button"
                                        onClick={() => openEvidence(response.$id, field, value)}
                                        disabled={mediaLoading === key}
                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs disabled:opacity-50"
                                      >
                                        {mediaLoading === key ? <Loader2 size={15} className="animate-spin" /> : mediaUrls[key] ? <ExternalLink size={15} /> : <ImageIcon size={15} />}
                                        {mediaUrls[key] ? 'Abrir evidencia' : 'Cargar evidencia'}
                                      </button>
                                    </div>
                                  ) : displayValue(value)}
                                </dd>
                              </div>
                            )
                          })}
                        </dl>

                        {(response.latitude || response.longitude) && (
                          <p className="mt-4 text-xs text-slate-500">Ubicación: {response.latitude}, {response.longitude}</p>
                        )}
                        {response.review_notes && (
                          <p className="mt-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs"><strong>Observación:</strong> {response.review_notes}</p>
                        )}
                        <div className="mt-5 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => updateReview(response, 'approved')}
                            disabled={reviewing === response.$id}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50"
                          >
                            <CheckCircle2 size={17} /> Aprobar
                          </button>
                          <button
                            type="button"
                            onClick={() => updateReview(response, 'rejected')}
                            disabled={reviewing === response.$id}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold disabled:opacity-50"
                          >
                            <XCircle size={17} /> Rechazar
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
