import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  Plus, Save, Eye, Hash, Type, AlignLeft, Calendar, Clock, 
  ChevronDown, CheckSquare, List, Radio as RadioIcon, 
  Camera, PenTool, MapPin, Layers, Calculator, Info, 
  FileText, Phone, Mail, Trash2, Settings2, GripVertical,
  ChevronRight, ChevronLeft, Layout, Globe, X, BookOpen, MapPinned, ShieldCheck, AlertTriangle, Share2,
  Send, CheckCircle2, RotateCcw, Rocket, LockKeyhole
} from 'lucide-react'
import { motion, Reorder, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { TopBar } from '@/components/layout/Sidebar'
import { databases, DATABASE_ID, COLLECTION_IDS, formEditorialOperations, type FormEditorialStatus } from '@/lib/backend'
import { Query } from '@/lib/backend'
import { useAuthStore } from '@/stores/authStore'
import { FormField, FormDefinition, FormPage, FormFieldType, FormVisibilityOperator, ActivityType, Entity } from '@/types'
import { cloneTemplatePages, FORM_TEMPLATES, type ControlGFormTemplate } from '@/config/form-templates'
import FormRenderer from '@/components/forms/FormRenderer'
import { analyzeFormQuality, buildFormPrivacyChecklist, formQualityScore } from '@/lib/form-quality'
import { estimateFormOfflineFootprint, formatFormBytes } from '@/lib/form-runtime'

const COLORS = {
  primary: '#0038A8',   // Royal Blue
  secondary: '#D4AF37', // Gold
  accent: '#1B3A4B',    // Slate
  surface: '#F8FAFC',
  border: '#E2E8F0',
}

const EDITORIAL_STATUS: Record<FormEditorialStatus, { label: string; description: string; tone: string }> = {
  draft: {
    label: 'Borrador',
    description: 'Editable y privado. Guárdalo y envíalo a revisión cuando esté listo.',
    tone: 'bg-slate-100 text-slate-700',
  },
  in_review: {
    label: 'En revisión',
    description: 'La edición está bloqueada. Una persona diferente debe revisar el instrumento.',
    tone: 'bg-blue-50 text-blue-800',
  },
  changes_requested: {
    label: 'Cambios solicitados',
    description: 'Corrige las observaciones, guarda una nueva revisión y vuelve a enviarla.',
    tone: 'bg-amber-50 text-amber-900',
  },
  approved: {
    label: 'Aprobado',
    description: 'Superó la revisión. Aún no está disponible en campo hasta publicarlo.',
    tone: 'bg-violet-50 text-violet-800',
  },
  published: {
    label: 'Publicado',
    description: 'La versión vigente es inmutable y ya puede asignarse. Al guardar cambios se crea una nueva versión borrador.',
    tone: 'bg-emerald-50 text-emerald-800',
  },
  withdrawn: {
    label: 'Retirado',
    description: 'La solicitud editorial fue retirada.',
    tone: 'bg-slate-100 text-slate-500',
  },
}

const FIELD_TYPES: { type: FormFieldType; label: string; icon: any; category: string }[] = [
  { type: 'text',          label: 'Texto Corto',     icon: Type,          category: 'Básico' },
  { type: 'longtext',      label: 'Texto Largo',     icon: AlignLeft,     category: 'Básico' },
  { type: 'number',        label: 'Cifra Numérica',  icon: Hash,          category: 'Básico' },
  { type: 'date',          label: 'Fecha',           icon: Calendar,      category: 'Básico' },
  { type: 'time',          label: 'Hora',            icon: Clock,         category: 'Básico' },
  { type: 'select',        label: 'Lista Desplegable', icon: ChevronDown,    category: 'Selección' },
  { type: 'multi_select',  label: 'Multiselección',  icon: List,          category: 'Selección' },
  { type: 'radio',         label: 'Botón Radial',    icon: RadioIcon,     category: 'Selección' },
  { type: 'checkbox',      label: 'Casilla Verif.',  icon: CheckSquare,   category: 'Selección' },
  { type: 'photo',         label: 'Captura Foto',    icon: Camera,        category: 'Media' },
  { type: 'signature',     label: 'Firma Digital',   icon: PenTool,       category: 'Media' },
  { type: 'gps',           label: 'Ubicación GPS',   icon: MapPin,        category: 'Geografía' },
  { type: 'geotrace',      label: 'Recorrido GPS',   icon: Share2,        category: 'Geografía' },
  { type: 'geoshape',      label: 'Área / Polígono', icon: MapPinned,     category: 'Geografía' },
  { type: 'municipality',  label: 'Municipio DANE',  icon: Globe,         category: 'Geografía' },
  { type: 'repeat_group',  label: 'Grupo Familiar',  icon: Layers,        category: 'Complejo' },
  { type: 'calculation',   label: 'Cálculo Auto.',   icon: Calculator,    category: 'Lógica' },
  { type: 'note',          label: 'Nota/Instruc.',   icon: Info,          category: 'Varios' },
  { type: 'file',          label: 'Archivo PDF',     icon: FileText,      category: 'Media' },
  { type: 'phone',         label: 'Teléfono',        icon: Phone,         category: 'Contacto' },
  { type: 'email',         label: 'Email',           icon: Mail,          category: 'Contacto' },
]

export default function FormBuilderPage() {
  const { user } = useAuthStore()
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState<Partial<FormDefinition>>({
    title: 'Nueva Caracterización',
    type: 'ex_ante',
    pages: [{ id: 'p1', title: 'Página 1', fields: [] }],
    status: 'draft',
    version: 1
  })
  const [activePageIdx, setActivePageIdx] = useState(0)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!id)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const [toast, setToast] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [workingFormId, setWorkingFormId] = useState<string | null>(id || null)
  const [changeId, setChangeId] = useState<string | null>(null)
  const [changeRevision, setChangeRevision] = useState<number | null>(null)
  const [workflowStatus, setWorkflowStatus] = useState<FormEditorialStatus>(id ? 'published' : 'draft')
  const [reviewNotes, setReviewNotes] = useState('')
  
  // Super Admin specific state
  const [entities, setEntities] = useState<Entity[]>([])
  const [selectedEntityId, setSelectedEntityId] = useState<string>(user?.entityId || '')

  useEffect(() => {
    if (user?.role === 'admin') {
      const fetchEntities = async () => {
        try {
          const res = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ENTITIES, [
            Query.orderDesc('$createdAt'),
            Query.limit(100)
          ])
          setEntities(res.documents as unknown as Entity[])
        } catch (err) {
          console.error('Error fetching entities:', err)
        }
      }
      fetchEntities()
    }
  }, [user?.role])

  useEffect(() => {
    if (id) {
      const fetchForm = async () => {
        setLoading(true)
        try {
          const doc = await databases.getDocument(DATABASE_ID, COLLECTION_IDS.FORMS, id)
          const data = doc as unknown as any
          const changeResult = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_IDS.FORM_CHANGE_REQUESTS,
            [
              Query.equal('form_id', id),
              Query.equal('status', ['draft', 'in_review', 'changes_requested', 'approved']),
              Query.orderDesc('$updatedAt'),
              Query.limit(1),
            ],
          )
          const candidate = changeResult.documents[0] as any
          
          let pages = []
          try {
            pages = (candidate?.definition || data.definition) ? JSON.parse(candidate?.definition || data.definition) : []
          } catch (pErr) {
            console.warn('Malformed form definition, resetting to empty:', pErr)
          }

          setForm({
            ...data,
            title: candidate?.title || data.title,
            description: candidate?.description ?? data.description,
            type: candidate?.type || data.type,
            pages
          })
          setSelectedEntityId(data.entity_id)
          setWorkingFormId(data.$id)
          setChangeId(candidate?.$id || null)
          setChangeRevision(candidate?.revision ?? null)
          setWorkflowStatus(candidate?.status || (data.status === 'published' ? 'published' : 'draft'))
          setReviewNotes(candidate?.review_notes || '')
        } catch (err) {
          console.error('Error fetching form:', err)
          setToast('Error al cargar el formulario')
        } finally {
          setLoading(false)
        }
      }
      fetchForm()
    }
  }, [id])

  useEffect(() => {
    if (user?.entityId && !selectedEntityId && !id) {
      setSelectedEntityId(user.entityId)
    }
  }, [user?.entityId, selectedEntityId, id])

  const activePage = form.pages![activePageIdx]
  const qualityIssues = useMemo(() => analyzeFormQuality(form.pages || []), [form.pages])
  const qualityScore = useMemo(() => formQualityScore(form.pages || []), [form.pages])
  const privacyChecklist = useMemo(() => buildFormPrivacyChecklist(form.pages || []), [form.pages])
  const offlineEstimate = useMemo(() => estimateFormOfflineFootprint(form.pages || []), [form.pages])
  const simulationDefinition = useMemo<FormDefinition>(() => ({
    id: workingFormId || 'form-simulation',
    entityId: selectedEntityId || 'entity-simulation',
    title: form.title || 'Formulario sin título',
    description: form.description,
    type: form.type || 'ex_ante',
    pages: form.pages || [],
    status: 'draft',
    version: form.version || 1,
    createdAt: form.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }), [form, selectedEntityId, workingFormId])
  const editorReadOnly = workflowStatus === 'in_review' || workflowStatus === 'approved'
  const workflow = EDITORIAL_STATUS[workflowStatus]

  const addField = (type: FormFieldType) => {
    const newField: FormField = {
      id: `f_${Date.now()}`,
      type,
      label: `Nueva pregunta (${type})`,
      required: false,
      options: ['select', 'multi_select', 'radio', 'checkbox'].includes(type) 
        ? [{ label: 'Opción 1', value: 'op1' }] 
        : undefined
    }
    const newPages = [...form.pages!]
    newPages[activePageIdx].fields.push(newField)
    setForm({ ...form, pages: newPages })
    setSelectedFieldId(newField.id)
  }

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    const newPages = [...form.pages!]
    newPages[activePageIdx].fields = newPages[activePageIdx].fields.map(f => 
      f.id === fieldId ? { ...f, ...updates } : f
    )
    setForm({ ...form, pages: newPages })
  }

  const deleteField = (fieldId: string) => {
    const newPages = [...form.pages!]
    newPages[activePageIdx].fields = newPages[activePageIdx].fields.filter(f => f.id !== fieldId)
    setForm({ ...form, pages: newPages })
    setSelectedFieldId(null)
  }

  const addPage = () => {
    setForm({
      ...form,
      pages: [...form.pages!, { id: `p_${Date.now()}`, title: `Página ${form.pages!.length + 1}`, fields: [] }]
    })
    setActivePageIdx(form.pages!.length)
  }

  const applyTemplate = (template: ControlGFormTemplate) => {
    const hasContent = form.pages?.some(page => page.fields.length > 0)
    if (hasContent && !window.confirm('La plantilla reemplazará las páginas y preguntas actuales. ¿Deseas continuar?')) return
    setForm({
      ...form,
      title: template.title,
      description: template.description,
      type: template.type,
      pages: cloneTemplatePages(template),
    })
    setActivePageIdx(0)
    setSelectedFieldId(null)
    setShowTemplates(false)
    setToast('Plantilla aplicada. Puedes adaptar cada pregunta antes de publicar.')
    window.setTimeout(() => setToast(''), 3500)
  }

  const editorialErrorMessage = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error || '')
    const messages: Record<string, string> = {
      FORM_CHANGE_LOCKED: 'El borrador está en revisión o aprobado y no admite cambios.',
      FORM_DRAFT_CONFLICT: 'Otra persona actualizó el borrador. Recarga antes de guardar de nuevo.',
      FORM_REVIEWER_MUST_DIFFER: 'La revisión debe realizarla otra persona coordinadora o el superadministrador.',
      FORM_REVIEW_COMMENT_REQUIRED: 'Explica los cambios solicitados con al menos cinco caracteres.',
      FORM_BASE_VERSION_CHANGED: 'La versión publicada cambió. Crea un nuevo borrador sobre la versión vigente.',
      FORM_RETIRED: 'Este formulario está archivado y no admite nuevas versiones.',
      FORM_TRANSITION_INVALID: 'La transición editorial ya no es válida. Recarga el formulario.',
      FORM_EDITOR_FORBIDDEN: 'No tienes permiso para administrar formularios de esta entidad.',
    }
    return Object.entries(messages).find(([code]) => message.includes(code))?.[1]
      || 'No fue posible completar la acción editorial.'
  }

  const saveDraft = useCallback(async () => {
    if (workflowStatus === 'in_review' || workflowStatus === 'approved') {
      setToast('El borrador está bloqueado mientras se revisa o espera publicación.')
      return null
    }
    if (!selectedEntityId) {
      setToast('Debes seleccionar una entidad')
      return null
    }
    setSaving(true)
    try {
      const result = await formEditorialOperations.saveDraft({
        formId: workingFormId,
        entityId: selectedEntityId,
        title: String(form.title || '').trim(),
        description: form.description,
        type: String(form.type || 'ex_ante'),
        definition: JSON.stringify(form.pages || []),
        changeId,
        expectedRevision: changeRevision,
      })
      setWorkingFormId(result.form_id)
      setChangeId(result.change_id)
      setChangeRevision(result.revision)
      setWorkflowStatus(result.status)
      setToast('Borrador guardado y protegido. Todavía no está visible en campo.')
      if (!workingFormId) {
        const base = user?.role === 'admin' ? '/admin/forms' : '/coord/forms'
        navigate(`${base}/edit/${result.form_id}`, { replace: true })
      }
      return result
    } catch (err) {
      console.error(err)
      setToast(editorialErrorMessage(err))
      return null
    } finally {
      setSaving(false)
    }
  }, [changeId, changeRevision, form, navigate, selectedEntityId, user?.role, workflowStatus, workingFormId])

  const handleSubmitReview = async () => {
    const blockingIssue = qualityIssues.find(issue => issue.severity === 'error')
    if (blockingIssue) {
      setToast(`Antes de enviar a revisión: ${blockingIssue.message}`)
      return
    }
    const draft = await saveDraft()
    if (!draft) return
    setSaving(true)
    try {
      const result = await formEditorialOperations.transition(draft.change_id, 'in_review')
      setWorkflowStatus(result.status)
      setToast('Formulario enviado a revisión. La edición quedó bloqueada.')
    } catch (error) {
      setToast(editorialErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleEditorialTransition = async (status: 'approved' | 'changes_requested' | 'published') => {
    if (!changeId) return
    setSaving(true)
    try {
      const result = await formEditorialOperations.transition(changeId, status, reviewNotes)
      setWorkflowStatus(result.status)
      if (status === 'approved') setToast('Revisión aprobada. El formulario aún no está publicado.')
      if (status === 'changes_requested') setToast('El borrador volvió a edición con las observaciones registradas.')
      if (status === 'published') {
        setChangeId(null)
        setChangeRevision(null)
        setReviewNotes('')
        setToast(`Versión ${result.published_version} publicada de forma inmutable.`)
      }
    } catch (error) {
      setToast(editorialErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50 overflow-hidden">
      <TopBar 
        title={form.title || 'Diseño de Formulario'}
        subtitle={id ? `Editando: ${form.title}` : (user?.role === 'admin' ? "Constructor de formularios para cualquier entidad" : "Constructor universal de caracterizaciones")}
        actions={
          <div className="flex items-center gap-1 sm:gap-3">
             {user?.role === 'admin' && (
              <select
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                disabled={Boolean(workingFormId) || editorReadOnly}
                aria-label="Entidad del formulario"
                className="hidden md:block max-w-52 px-4 py-2 bg-slate-100 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Seleccionar Entidad...</option>
                {entities.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => setShowTemplates(true)}
              disabled={editorReadOnly}
              aria-label="Abrir biblioteca de plantillas"
              className="w-10 h-10 sm:w-auto sm:h-auto flex items-center justify-center gap-2 sm:px-4 sm:py-2 text-[#1B3A4B] font-bold hover:bg-[#E9F1F3] rounded-xl transition-all"
            >
              <BookOpen size={18} />
              <span className="hidden xl:inline">Plantillas</span>
            </button>
            <button 
              onClick={() => { setPreview(!preview); setSelectedFieldId(null) }}
              aria-label={preview ? 'Volver a editar' : 'Simular formulario'}
              className="w-10 h-10 sm:w-auto sm:h-auto flex items-center justify-center gap-2 sm:px-4 sm:py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              {preview ? <Layout size={18} /> : <Eye size={18} />}
              <span className="hidden sm:inline">{preview ? 'Editar' : 'Simular'}</span>
            </button>
            {!editorReadOnly && workflowStatus !== 'published' && (
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={saving}
                aria-label="Guardar y enviar formulario a revisión"
                className="w-10 h-10 sm:w-auto sm:h-auto flex items-center justify-center gap-2 sm:px-4 sm:py-2.5 text-[#1B3A4B] bg-[#E9F1F3] font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50"
              >
                <Send size={18} />
                <span className="hidden xl:inline">Enviar a revisión</span>
              </button>
            )}
            {workflowStatus === 'approved' ? (
              <button
                type="button"
                onClick={() => handleEditorialTransition('published')}
                disabled={saving}
                aria-label="Publicar versión aprobada"
                className="w-10 h-10 sm:w-auto sm:h-auto flex items-center justify-center gap-2 sm:px-6 sm:py-2.5 text-white bg-emerald-700 font-bold rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                <Rocket size={18} />
                <span className="hidden sm:inline">Publicar</span>
              </button>
            ) : !editorReadOnly && (
              <button
                type="button"
                onClick={() => void saveDraft()}
                disabled={saving}
                aria-label={saving ? 'Guardando borrador' : 'Guardar borrador'}
                className="w-10 h-10 sm:w-auto sm:h-auto flex items-center justify-center gap-2 sm:px-6 sm:py-2.5 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
                style={{ background: COLORS.primary }}
              >
                <Save size={18} />
                <span className="hidden sm:inline">{saving ? 'Guardando...' : workflowStatus === 'published' ? 'Nueva versión' : 'Guardar'}</span>
              </button>
            )}
          </div>
        }
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbox */}
        {!preview && !editorReadOnly && <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 flex-col shadow-sm z-10">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Herramientas</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {['Básico', 'Selección', 'Media', 'Geografía', 'Lógica', 'Complejo', 'Contacto', 'Varios'].map(cat => (
              <div key={cat}>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3 px-2 flex items-center gap-2">
                  <span className="w-1 h-3 bg-blue-500 rounded-full" /> {cat}
                </h4>
                <div className="grid grid-cols-1 gap-1">
                  {FIELD_TYPES.filter(t => t.category === cat).map(t => (
                    <button
                      key={t.type}
                      onClick={() => addField(t.type)}
                      className="flex items-center gap-3 p-2.5 rounded-xl text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-all font-medium text-xs group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <t.icon size={16} />
                      </div>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>}

        {/* Center Canvas */}
        <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-12 bg-slate-50/30">
          <div className="max-w-3xl mx-auto space-y-8">
            {!preview && !editorReadOnly && (
              <div className="lg:hidden sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-slate-50/95 backdrop-blur border-b border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Agregar campo</p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {FIELD_TYPES.map(fieldType => (
                    <button
                      key={fieldType.type}
                      onClick={() => addField(fieldType.type)}
                      className="flex-shrink-0 w-20 min-h-16 rounded-xl border border-slate-200 bg-white px-2 py-2 flex flex-col items-center justify-center gap-1 text-[10px] font-semibold text-slate-600 active:bg-blue-50 active:text-blue-700"
                    >
                      <fieldType.icon size={17} />
                      <span className="leading-tight text-center">{fieldType.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Header Settings */}
            <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-[32px] border border-slate-100 shadow-sm border-t-4" style={{ borderColor: COLORS.primary }}>
               <input 
                value={form.title} 
                onChange={e => setForm({...form, title: e.target.value})}
                disabled={editorReadOnly}
                placeholder="Título del Formulario"
                className="text-xl sm:text-2xl font-black text-slate-900 w-full focus:outline-none mb-2"
               />
               <textarea
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                disabled={editorReadOnly}
                placeholder="Descripción o instrucciones para el profesional..."
                className="text-sm text-slate-400 w-full resize-none focus:outline-none bg-transparent"
                rows={2}
               />
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                   Tipo de caracterización
                   <select
                     value={form.type}
                     onChange={e => setForm({ ...form, type: e.target.value as ActivityType })}
                     disabled={editorReadOnly}
                     className="mt-2 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 normal-case tracking-normal"
                   >
                     <option value="ex_ante">Ex-Antes</option>
                     <option value="encounter_1">Momento 1</option>
                     <option value="encounter_2">Momento 2</option>
                     <option value="encounter_3">Momento 3</option>
                     <option value="ex_post">Ex-Post</option>
                   </select>
                 </label>
                 {user?.role === 'admin' && (
                   <label className="md:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     Entidad
                     <select
                       value={selectedEntityId}
                       onChange={e => setSelectedEntityId(e.target.value)}
                       disabled={Boolean(workingFormId) || editorReadOnly}
                       className="mt-2 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 normal-case tracking-normal"
                     >
                       <option value="">Seleccionar entidad...</option>
                       {entities.map(entity => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                     </select>
                   </label>
                 )}
               </div>
            </div>

            {!preview && (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="editorial-workflow-title">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-2xl">
                    <h2 id="editorial-workflow-title" className="flex items-center gap-2 text-sm font-black text-[#1B3A4B]">
                      {editorReadOnly ? <LockKeyhole size={18} /> : <CheckCircle2 size={18} />} Control editorial
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{workflow.description}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-black ${workflow.tone}`}>{workflow.label}</span>
                </div>

                {reviewNotes && (
                  <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
                    <strong>Observaciones de revisión:</strong> {reviewNotes}
                  </div>
                )}

                {workflowStatus === 'in_review' && (
                  <div className="mt-4 grid gap-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Concepto de revisión
                      <textarea
                        value={reviewNotes}
                        onChange={event => setReviewNotes(event.target.value)}
                        rows={3}
                        placeholder="Registra hallazgos, riesgos o ajustes requeridos."
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium normal-case tracking-normal text-slate-800 focus:border-blue-400 focus:outline-none"
                      />
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <button type="button" onClick={() => handleEditorialTransition('changes_requested')} disabled={saving} className="min-h-11 rounded-xl border border-amber-200 bg-amber-50 px-4 text-xs font-black text-amber-900 disabled:opacity-50">
                        <RotateCcw size={16} className="mr-2 inline" /> Solicitar cambios
                      </button>
                      <button type="button" onClick={() => handleEditorialTransition('approved')} disabled={saving} className="min-h-11 rounded-xl bg-[#1B3A4B] px-4 text-xs font-black text-white disabled:opacity-50">
                        <CheckCircle2 size={16} className="mr-2 inline" /> Aprobar revisión
                      </button>
                    </div>
                  </div>
                )}

                {workflowStatus === 'approved' && (
                  <div className="mt-4 flex flex-col gap-3 rounded-xl bg-violet-50 p-4 text-xs leading-5 text-violet-950 sm:flex-row sm:items-center sm:justify-between">
                    <span>Publicar copiará esta versión aprobada al formulario de campo y conservará las versiones anteriores.</span>
                    <button type="button" onClick={() => handleEditorialTransition('published')} disabled={saving} className="min-h-11 shrink-0 rounded-xl bg-emerald-700 px-4 font-black text-white disabled:opacity-50"><Rocket size={16} className="mr-2 inline" /> Publicar versión</button>
                  </div>
                )}
              </section>
            )}

            {!preview && (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="quality-assistant-title">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 id="quality-assistant-title" className="flex items-center gap-2 text-sm font-black text-[#1B3A4B]"><ShieldCheck size={18} /> Asistente de calidad</h2>
                    <p className="mt-1 text-xs text-slate-500">Revisa estructura, trazabilidad territorial, consentimiento y carga operativa antes de publicar.</p>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-black ${qualityScore >= 80 ? 'bg-emerald-50 text-emerald-800' : qualityScore >= 60 ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-800'}`}>{qualityScore}/100</span>
                </div>
                {qualityIssues.length ? (
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {qualityIssues.map(issue => (
                      <li key={issue.code} className={`flex gap-2 rounded-xl p-3 text-xs leading-5 ${issue.severity === 'error' ? 'bg-red-50 text-red-800' : issue.severity === 'warning' ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-700'}`}>
                        <AlertTriangle size={15} className="mt-0.5 shrink-0" />{issue.message}
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">El formulario cumple las comprobaciones automáticas básicas.</p>}
              </section>
            )}

            {!preview && (
              <section className="grid gap-4 lg:grid-cols-2" aria-label="Preparación offline y privacidad">
                <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-black text-[#1B3A4B]">Estimación offline</h2>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Tamaño aproximado de una respuesta con toda la evidencia.</p>
                    </div>
                    <span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase ${offlineEstimate.risk === 'high' ? 'bg-red-50 text-red-800' : offlineEstimate.risk === 'medium' ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-800'}`}>{offlineEstimate.riskLabel}</span>
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-slate-50 p-3"><dt className="text-slate-500">Formulario</dt><dd className="mt-1 font-black text-slate-900">{formatFormBytes(offlineEstimate.definitionBytes)}</dd></div>
                    <div className="rounded-xl bg-slate-50 p-3"><dt className="text-slate-500">Respuesta</dt><dd className="mt-1 font-black text-slate-900">{formatFormBytes(offlineEstimate.estimatedSubmissionBytes)}</dd></div>
                    <div className="rounded-xl bg-slate-50 p-3"><dt className="text-slate-500">Evidencias</dt><dd className="mt-1 font-black text-slate-900">{offlineEstimate.mediaFields}</dd></div>
                  </dl>
                  <p className="mt-3 text-[11px] leading-5 text-slate-500">La cifra es preventiva: el tamaño real depende de cámara, compresión y archivos seleccionados.</p>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <h2 className="text-sm font-black text-[#1B3A4B]">Lista de privacidad</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Control previo para minimización, consentimiento y protección local.</p>
                  <ul className="mt-3 space-y-2">
                    {privacyChecklist.map(item => (
                      <li key={item.code} className="flex items-start gap-2 text-xs leading-5 text-slate-600">
                        <CheckCircle2 size={15} className={`mt-0.5 shrink-0 ${item.passed ? 'text-emerald-600' : 'text-amber-600'}`} />
                        <span><strong className="text-slate-800">{item.label}:</strong> {item.detail}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </section>
            )}

            {/* Pagination Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {form.pages!.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setActivePageIdx(idx)}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
                    activePageIdx === idx 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                      : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                  }`}
                >
                  {p.title}
                </button>
              ))}
              {!preview && !editorReadOnly && (
                <button
                  onClick={addPage}
                  aria-label="Añadir página"
                  className="w-10 h-10 flex-shrink-0 rounded-2xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                >
                  <Plus size={18} />
                </button>
              )}
            </div>

            {!preview && !editorReadOnly && (
              <label className="block bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Nombre de esta página o momento
                <input
                  value={activePage.title}
                  onChange={event => {
                    const newPages = [...form.pages!]
                    newPages[activePageIdx] = { ...activePage, title: event.target.value }
                    setForm({ ...form, pages: newPages })
                  }}
                  className="mt-2 w-full text-base font-bold text-slate-800 normal-case tracking-normal focus:outline-none"
                />
              </label>
            )}

            {/* Field List */}
            <div className="space-y-4 min-h-[400px]">
              {preview ? (
                <div className="mx-auto max-w-xl rounded-[32px] border border-slate-200 bg-slate-100 py-5 shadow-2xl sm:py-8">
                  <FormRenderer
                    definition={simulationDefinition}
                    mode="simulation"
                    embedded
                    onSubmit={() => {
                      setToast('Simulación completada: reglas y validaciones respondieron correctamente. No se guardaron datos.')
                      window.setTimeout(() => setToast(''), 4_500)
                    }}
                  />
                </div>
              ) : activePage.fields.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 sm:py-24 px-6 bg-white/50 border-2 border-dashed border-slate-200 rounded-[32px] text-center">
                  <Layout size={40} className="text-slate-200 mb-4" />
                  <p className="text-slate-400 text-sm font-medium">Elige un tipo de campo para comenzar</p>
                </div>
              ) : (
                <Reorder.Group axis="y" values={activePage.fields} onReorder={(newFields) => {
                  if (editorReadOnly) return
                  const newPages = [...form.pages!]
                  newPages[activePageIdx].fields = newFields
                  setForm({ ...form, pages: newPages })
                }} className="space-y-4">
                  {activePage.fields.map((f) => (
                    <Reorder.Item 
                      key={f.id} 
                      value={f}
                      dragListener={!editorReadOnly}
                      onClick={() => { if (!editorReadOnly) setSelectedFieldId(f.id) }}
                      className={`group relative bg-white p-4 sm:p-6 rounded-3xl border transition-all cursor-pointer ${
                        selectedFieldId === f.id ? 'border-blue-500 shadow-xl shadow-blue-500/5 ring-4 ring-blue-50' : 'border-slate-100 hover:border-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className="cursor-grab text-slate-200 group-hover:text-slate-400 trasition-colors">
                            <GripVertical size={20} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {FIELD_TYPES.find(t => t.type === f.type)?.icon && (
                                <div className="text-slate-400" ><Layout size={14}/></div>
                              )}
                              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{f.type}</span>
                            </div>
                            <h4 className="font-bold text-slate-800 break-words">{f.label}</h4>
                          </div>
                        </div>
                        {!editorReadOnly && <div className="flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); deleteField(f.id); }} className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>}
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              )}
            </div>
          </div>
        </div>

        {/* Right Settings Sidebar */}
        <AnimatePresence>
          {selectedFieldId && !editorReadOnly && (
            <>
              <motion.button
                type="button"
                aria-label="Cerrar propiedades"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedFieldId(null)}
                className="lg:hidden fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px]"
              />
              <motion.aside
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                className="fixed inset-x-0 bottom-0 max-h-[82vh] w-full rounded-t-[28px] bg-white border-t border-slate-200 shadow-2xl z-50 flex flex-col overflow-hidden lg:relative lg:inset-auto lg:max-h-none lg:w-80 lg:rounded-none lg:border-t-0 lg:border-l lg:z-20"
              >
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Settings2 size={18} className="text-slate-400" />
                  <h3 className="font-bold text-slate-900">Propiedades</h3>
                </div>
                <button onClick={() => setSelectedFieldId(null)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-8">
                {/* Find current field */}
                {(() => {
                  const f = activePage.fields.find(x => x.id === selectedFieldId)
                  if (!f) return null
                  const allFields = form.pages!.flatMap(page => page.fields)
                  const currentPosition = allFields.findIndex(field => field.id === f.id)
                  const conditionDrivers = allFields.slice(0, Math.max(0, currentPosition)).filter(field => field.type !== 'note' && field.type !== 'calculation')
                  const selectedDriver = conditionDrivers.find(field => field.id === f.visibilityLogic?.fieldId)
                  return (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Etiqueta de Pregunta</label>
                        <input
                          value={f.label}
                          onChange={e => updateField(f.id, { label: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                        />
                        <code className="mt-2 block break-all rounded-lg bg-slate-100 px-3 py-2 text-[10px] text-slate-500">ID: {f.id}</code>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Ayuda visible en campo</label>
                        <textarea
                          value={f.description || ''}
                          onChange={event => updateField(f.id, { description: event.target.value })}
                          placeholder="Explica qué debe registrar el profesional y cómo comprobarlo."
                          rows={3}
                          className="w-full rounded-2xl border-none bg-slate-50 px-4 py-3 text-xs leading-5 shadow-inner focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      {['text', 'longtext', 'number', 'email', 'phone'].includes(f.type) && (
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Texto de ejemplo</label>
                          <input value={f.placeholder || ''} onChange={event => updateField(f.id, { placeholder: event.target.value })} placeholder="Ejemplo de respuesta" className="w-full rounded-2xl border-none bg-slate-50 px-4 py-3 text-sm shadow-inner focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                      )}

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-700">Campo Obligatorio</span>
                        <button
                          type="button"
                          onClick={() => updateField(f.id, { required: !f.required })}
                          className={`w-12 h-6 rounded-full relative transition-all ${f.required ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${f.required ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      {!['note', 'calculation'].includes(f.type) && (
                        <div className="space-y-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div><p className="text-xs font-bold text-amber-950">Dato personal o sensible</p><p className="mt-1 text-[10px] leading-4 text-amber-800">Actívalo para documentar finalidad y revisar consentimiento.</p></div>
                            <button type="button" onClick={() => updateField(f.id, { sensitive: !f.sensitive, sensitiveJustification: f.sensitive ? undefined : f.sensitiveJustification })} className={`relative h-6 w-12 shrink-0 rounded-full transition-all ${f.sensitive ? 'bg-amber-600' : 'bg-slate-300'}`} aria-label="Clasificar dato sensible"><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${f.sensitive ? 'left-7' : 'left-1'}`} /></button>
                          </div>
                          {f.sensitive && <textarea value={f.sensitiveJustification || ''} onChange={event => updateField(f.id, { sensitiveJustification: event.target.value })} rows={3} placeholder="Finalidad, base o necesidad de recolectar este dato" className="w-full rounded-xl border border-amber-200 bg-white p-3 text-xs leading-5 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />}
                        </div>
                      )}

                      {['select', 'multi_select', 'radio', 'checkbox'].includes(f.type) && (
                        <div className="space-y-3">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Opciones</label>
                          <div className="space-y-2">
                            {f.options?.map((opt, oIdx) => (
                              <div key={oIdx} className="flex gap-2">
                                <input
                                  value={opt.label}
                                  onChange={e => {
                                    const newOpts = [...f.options!]
                                    newOpts[oIdx] = { label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') }
                                    updateField(f.id, { options: newOpts })
                                  }}
                                  placeholder={`Opción ${oIdx + 1}`}
                                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20"
                                />
                                <button 
                                  onClick={() => {
                                    const newOpts = f.options!.filter((_, i) => i !== oIdx)
                                    updateField(f.id, { options: newOpts })
                                  }}
                                  className="p-2 text-rose-400 hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const newOpts = [...(f.options || []), { label: '', value: '' }]
                                updateField(f.id, { options: newOpts })
                              }}
                              className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all flex items-center justify-center gap-2"
                            >
                              <Plus size={14} /> Añadir Opción
                            </button>
                          </div>
                        </div>
                      )}

                      {['text', 'longtext', 'number', 'email', 'phone'].includes(f.type) && (
                        <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Validación</p>
                            <p className="mt-1 text-[10px] leading-4 text-slate-400">Los límites se comprueban sin conexión antes de avanzar.</p>
                          </div>
                          {f.type === 'number' ? (
                            <div className="grid grid-cols-2 gap-2">
                              <label className="text-[10px] font-bold text-slate-500">Mínimo<input type="number" value={f.validationRules?.min ?? ''} onChange={event => updateField(f.id, { validationRules: { ...f.validationRules, min: event.target.value === '' ? undefined : Number(event.target.value) } })} className="mt-1 w-full rounded-xl bg-slate-50 px-3 py-2 text-xs" /></label>
                              <label className="text-[10px] font-bold text-slate-500">Máximo<input type="number" value={f.validationRules?.max ?? ''} onChange={event => updateField(f.id, { validationRules: { ...f.validationRules, max: event.target.value === '' ? undefined : Number(event.target.value) } })} className="mt-1 w-full rounded-xl bg-slate-50 px-3 py-2 text-xs" /></label>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <label className="text-[10px] font-bold text-slate-500">Mín. caracteres<input type="number" min="0" value={f.validationRules?.minLength ?? ''} onChange={event => updateField(f.id, { validationRules: { ...f.validationRules, minLength: event.target.value === '' ? undefined : Number(event.target.value) } })} className="mt-1 w-full rounded-xl bg-slate-50 px-3 py-2 text-xs" /></label>
                              <label className="text-[10px] font-bold text-slate-500">Máx. caracteres<input type="number" min="0" value={f.validationRules?.maxLength ?? ''} onChange={event => updateField(f.id, { validationRules: { ...f.validationRules, maxLength: event.target.value === '' ? undefined : Number(event.target.value) } })} className="mt-1 w-full rounded-xl bg-slate-50 px-3 py-2 text-xs" /></label>
                            </div>
                          )}
                          <label className="block text-[10px] font-bold text-slate-500">Patrón opcional (RegExp)<input value={f.validationRules?.pattern || f.validation || ''} onChange={event => updateField(f.id, { validation: undefined, validationRules: { ...f.validationRules, pattern: event.target.value } })} placeholder="Ej: ^[0-9]{6,10}$" className="mt-1 w-full rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs" /></label>
                          <label className="block text-[10px] font-bold text-slate-500">Mensaje personalizado<input value={f.validationRules?.message || ''} onChange={event => updateField(f.id, { validationRules: { ...f.validationRules, message: event.target.value } })} placeholder="Indica cómo corregir la respuesta" className="mt-1 w-full rounded-xl bg-slate-50 px-3 py-2 text-xs" /></label>
                        </div>
                      )}

                      {f.type === 'file' && (
                        <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Archivo offline</p>
                          <label className="block text-[10px] font-bold text-slate-500">Tamaño máximo (MB)<input type="number" min="1" max="25" value={f.maxFileSizeMb ?? 5} onChange={event => updateField(f.id, { maxFileSizeMb: Math.min(25, Math.max(1, Number(event.target.value) || 1)) })} className="mt-1 w-full rounded-xl bg-slate-50 px-3 py-2 text-xs" /></label>
                          <p className="rounded-xl bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-600"><strong>Formato:</strong> PDF. Se conserva cifrado en tránsito y protegido por las políticas de Storage de la entidad.</p>
                        </div>
                      )}

                      <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div><p className="text-xs font-bold text-blue-950">Regla condicional</p><p className="mt-1 text-[10px] leading-4 text-blue-700">Muestra esta pregunta según una respuesta anterior.</p></div>
                          <button
                            type="button"
                            disabled={!conditionDrivers.length}
                            onClick={() => {
                              if (f.visibilityLogic) updateField(f.id, { visibilityLogic: undefined })
                              else if (conditionDrivers[0]) updateField(f.id, { visibilityLogic: { fieldId: conditionDrivers[0].id, operator: '==', value: conditionDrivers[0].options?.[0]?.value || '' } })
                            }}
                            className={`relative h-6 w-12 shrink-0 rounded-full transition-all disabled:opacity-40 ${f.visibilityLogic ? 'bg-blue-600' : 'bg-slate-300'}`}
                            aria-label="Activar regla condicional"
                          ><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${f.visibilityLogic ? 'left-7' : 'left-1'}`} /></button>
                        </div>
                        {!conditionDrivers.length && <p className="text-[10px] leading-4 text-blue-700">Agrega primero una pregunta de respuesta; las reglas solo pueden depender de campos anteriores para garantizar el funcionamiento offline.</p>}
                        {f.visibilityLogic && (
                          <div className="space-y-2">
                            <select value={f.visibilityLogic.fieldId} onChange={event => {
                              const driver = conditionDrivers.find(field => field.id === event.target.value)
                              updateField(f.id, { visibilityLogic: { ...f.visibilityLogic!, fieldId: event.target.value, value: driver?.options?.[0]?.value || '' } })
                            }} className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                              {conditionDrivers.map(field => <option key={field.id} value={field.id}>{field.label}</option>)}
                            </select>
                            <select value={f.visibilityLogic.operator} onChange={event => updateField(f.id, { visibilityLogic: { ...f.visibilityLogic!, operator: event.target.value as FormVisibilityOperator } })} className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs text-slate-700">
                              <option value="==">Es igual a</option><option value="!=">Es diferente de</option><option value="contains">Contiene</option><option value="not_contains">No contiene</option><option value=">">Es mayor que</option><option value=">=">Es mayor o igual</option><option value="<">Es menor que</option><option value="<=">Es menor o igual</option><option value="is_empty">Está vacío</option><option value="is_not_empty">No está vacío</option>
                            </select>
                            {!['is_empty', 'is_not_empty'].includes(f.visibilityLogic.operator) && (selectedDriver?.options?.length ? (
                              <select value={String(f.visibilityLogic.value ?? '')} onChange={event => updateField(f.id, { visibilityLogic: { ...f.visibilityLogic!, value: event.target.value } })} className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs text-slate-700"><option value="">Selecciona un valor</option>{selectedDriver.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                            ) : (
                              <input value={String(f.visibilityLogic.value ?? '')} onChange={event => updateField(f.id, { visibilityLogic: { ...f.visibilityLogic!, value: event.target.value } })} placeholder="Valor que activa la pregunta" className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs text-slate-700" />
                            ))}
                          </div>
                        )}
                      </div>

                      {f.type === 'calculation' && (
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Fórmula (Handlebars)</label>
                          <textarea
                            value={f.calculation}
                            onChange={e => updateField(f.id, { calculation: e.target.value })}
                            placeholder="Ej: {{valor_casa}} * 0.2"
                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-mono focus:ring-2 focus:ring-blue-500/20"
                            rows={3}
                          />
                          <p className="mt-2 text-[10px] leading-4 text-slate-500">Usa identificadores anteriores entre llaves y operaciones + − × ÷. Ejemplo: <code>{'{{f_ingreso}} * 0.2'}</code>.</p>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>

      {showTemplates && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-6" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="form-template-title" className="max-h-[92vh] w-full max-w-5xl overflow-y-auto bg-slate-50 shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-slate-200 bg-white px-5 py-5 sm:px-7">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#3D7B9E]">Control G LATAM</p>
                <h2 id="form-template-title" className="mt-1 text-xl font-black text-slate-950">Biblioteca de caracterizaciones</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Instrumentos iniciales editables. Adapta lenguaje, marco jurídico y variables a la entidad y al país antes de publicar.</p>
              </div>
              <button type="button" onClick={() => setShowTemplates(false)} aria-label="Cerrar biblioteca de plantillas" className="flex h-12 w-12 shrink-0 items-center justify-center text-slate-500"><X size={21} /></button>
            </header>
            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-3">
              {FORM_TEMPLATES.map(template => {
                const questionCount = template.pages.reduce((total, page) => total + page.fields.length, 0)
                return (
                  <article key={template.id} className="flex flex-col border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-11 w-11 items-center justify-center bg-[#E9F1F3] text-[#1B3A4B]"><MapPinned size={20} /></div>
                      <span className="bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">{template.category}</span>
                    </div>
                    <h3 className="mt-5 text-lg font-black leading-tight text-slate-950">{template.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{template.description}</p>
                    <dl className="mt-4 grid grid-cols-2 gap-2 border-y border-slate-100 py-3 text-xs">
                      <div><dt className="font-bold text-slate-400">Páginas</dt><dd className="mt-1 font-black text-slate-800">{template.pages.length}</dd></div>
                      <div><dt className="font-bold text-slate-400">Preguntas</dt><dd className="mt-1 font-black text-slate-800">{questionCount}</dd></div>
                    </dl>
                    <p className="mt-3 text-xs leading-5 text-slate-500"><strong className="text-slate-700">Recomendada para:</strong> {template.recommendedFor}</p>
                    <button type="button" onClick={() => applyTemplate(template)} className="mt-5 min-h-12 w-full bg-[#1B3A4B] px-4 text-sm font-black text-white">Usar esta plantilla</button>
                  </article>
                )
              })}
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-900 border border-slate-700 text-white rounded-2xl shadow-2xl z-[100] font-bold text-sm animate-bounce flex items-center gap-3">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          {toast}
        </div>
      )}
    </div>
  )
}
