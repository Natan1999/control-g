import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  Plus, Save, Eye, Hash, Type, AlignLeft, Calendar, Clock, 
  ChevronDown, CheckSquare, List, Radio as RadioIcon, 
  Camera, PenTool, MapPin, Layers, Calculator, Info, 
  FileText, Phone, Mail, Trash2, Settings2, GripVertical,
  ChevronRight, ChevronLeft, Layout, Globe, X, BookOpen, MapPinned, ShieldCheck, AlertTriangle, Share2
} from 'lucide-react'
import { motion, Reorder, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { TopBar } from '@/components/layout/Sidebar'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/backend'
import { ID, Query } from '@/lib/backend'
import { useAuthStore } from '@/stores/authStore'
import { FormField, FormDefinition, FormPage, FormFieldType, ActivityType, Entity } from '@/types'
import { cloneTemplatePages, FORM_TEMPLATES, type ControlGFormTemplate } from '@/config/form-templates'
import { analyzeFormQuality, formQualityScore } from '@/lib/form-quality'

const COLORS = {
  primary: '#0038A8',   // Royal Blue
  secondary: '#D4AF37', // Gold
  accent: '#1B3A4B',    // Slate
  surface: '#F8FAFC',
  border: '#E2E8F0',
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

function FormFieldPreview({ field }: { field: FormField }) {
  const options = field.options?.slice(0, 4) ?? []

  if (field.type === 'note') {
    return <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-900">{field.label}</div>
  }

  if (field.type === 'photo' || field.type === 'signature' || field.type === 'file') {
    const Icon = field.type === 'photo' ? Camera : field.type === 'signature' ? PenTool : FileText
    const hint = field.type === 'photo' ? 'Tomar o adjuntar fotografía' : field.type === 'signature' ? 'Firmar en la pantalla' : 'Adjuntar archivo'
    return (
      <div>
        <div className="text-sm font-semibold text-slate-800 mb-2">{field.label}{field.required && <span className="text-rose-500"> *</span>}</div>
        <div className="min-h-28 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Icon size={24} />
          <span className="text-xs font-medium">{hint}</span>
        </div>
      </div>
    )
  }

  if (['select', 'multi_select', 'radio', 'checkbox'].includes(field.type)) {
    return (
      <div>
        <div className="text-sm font-semibold text-slate-800 mb-2">{field.label}{field.required && <span className="text-rose-500"> *</span>}</div>
        <div className="space-y-2">
          {(options.length ? options : [{ label: 'Opción de respuesta', value: 'option' }]).map(option => (
            <div key={option.value} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-500">
              <span className={`w-4 h-4 border-2 border-slate-300 ${field.type === 'radio' ? 'rounded-full' : 'rounded'}`} />
              {option.label}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (field.type === 'repeat_group') {
    return (
      <div>
        <div className="text-sm font-semibold text-slate-800 mb-2">{field.label}{field.required && <span className="text-rose-500"> *</span>}</div>
        <div className="rounded-2xl border border-slate-200 p-4 text-center text-xs font-semibold text-slate-400">Grupo repetible de integrantes</div>
      </div>
    )
  }

  if (field.type === 'geotrace' || field.type === 'geoshape') {
    return (
      <div>
        <div className="text-sm font-semibold text-slate-800 mb-2">{field.label}{field.required && <span className="text-rose-500"> *</span>}</div>
        <div className="min-h-28 rounded-2xl border-2 border-dashed border-slate-200 bg-[#EAF1F2] flex flex-col items-center justify-center gap-2 text-[#1B3A4B]">
          {field.type === 'geotrace' ? <Share2 size={25} /> : <MapPinned size={25} />}
          <span className="text-xs font-black">{field.type === 'geotrace' ? 'Capturar recorrido offline' : 'Delimitar polígono offline'}</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="text-sm font-semibold text-slate-800 mb-2">{field.label}{field.required && <span className="text-rose-500"> *</span>}</div>
      <div className="h-12 rounded-xl border border-slate-200 bg-white px-3 flex items-center text-sm text-slate-400">
        {field.type === 'date' ? 'dd/mm/aaaa' : field.type === 'time' ? '--:--' : field.type === 'gps' ? 'Capturar ubicación' : 'Respuesta'}
      </div>
    </div>
  )
}

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
          
          let pages = []
          try {
            pages = data.definition ? JSON.parse(data.definition) : []
          } catch (pErr) {
            console.warn('Malformed form definition, resetting to empty:', pErr)
          }

          setForm({
            ...data,
            pages
          })
          setSelectedEntityId(data.entity_id)
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

  const handleSave = useCallback(async () => {
    const blockingIssue = qualityIssues.find(issue => issue.severity === 'error')
    if (blockingIssue) {
      setToast(blockingIssue.message)
      return
    }
    if (!selectedEntityId) {
      setToast('Debes seleccionar una entidad')
      return
    }
    setSaving(true)
    try {
      const payload = {
        entity_id: selectedEntityId,
        name: form.title,
        title: form.title,
        description: form.description,
        type: form.type,
        definition: JSON.stringify(form.pages),
        status: 'published',
        version: form.version || 1,
        v: form.version || 1,
      }
      
      if (id) {
        await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.FORMS, id, payload)
        setToast('Cambios guardados con éxito')
      } else {
        await databases.createDocument(DATABASE_ID, COLLECTION_IDS.FORMS, ID.unique(), payload)
        setToast('Formulario creado con éxito')
      }
      
      setTimeout(() => {
        setToast('')
        navigate(user?.role === 'admin' ? '/admin/forms' : '/coord/forms')
      }, 2000)
    } catch (err) {
      console.error(err)
      setToast('Error al guardar')
    } finally {
      setSaving(false)
    }
  }, [selectedEntityId, form, id, navigate, qualityIssues, user?.role])

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
              aria-label="Abrir biblioteca de plantillas"
              className="w-10 h-10 sm:w-auto sm:h-auto flex items-center justify-center gap-2 sm:px-4 sm:py-2 text-[#1B3A4B] font-bold hover:bg-[#E9F1F3] rounded-xl transition-all"
            >
              <BookOpen size={18} />
              <span className="hidden xl:inline">Plantillas</span>
            </button>
            <button 
              onClick={() => { setPreview(!preview); setSelectedFieldId(null) }}
              aria-label={preview ? 'Volver a editar' : 'Vista previa'}
              className="w-10 h-10 sm:w-auto sm:h-auto flex items-center justify-center gap-2 sm:px-4 sm:py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              {preview ? <Layout size={18} /> : <Eye size={18} />}
              <span className="hidden sm:inline">{preview ? 'Editar' : 'Vista Previa'}</span>
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              aria-label={saving ? 'Guardando formulario' : 'Publicar formulario'}
              className="w-10 h-10 sm:w-auto sm:h-auto flex items-center justify-center gap-2 sm:px-6 sm:py-2.5 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
              style={{ background: COLORS.primary }}
            >
              <Save size={18} />
              <span className="hidden sm:inline">{saving ? 'Guardando...' : 'Publicar'}</span>
            </button>
          </div>
        }
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbox */}
        {!preview && <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 flex-col shadow-sm z-10">
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
        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-12 bg-slate-50/30">
          <div className="max-w-3xl mx-auto space-y-8">
            {!preview && (
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
                placeholder="Título del Formulario"
                className="text-xl sm:text-2xl font-black text-slate-900 w-full focus:outline-none mb-2"
               />
               <textarea
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
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
              {!preview && (
                <button
                  onClick={addPage}
                  aria-label="Añadir página"
                  className="w-10 h-10 flex-shrink-0 rounded-2xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                >
                  <Plus size={18} />
                </button>
              )}
            </div>

            {!preview && (
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
                <div className="max-w-md mx-auto rounded-[32px] bg-white border border-slate-200 shadow-2xl overflow-hidden">
                  <div className="px-6 py-5 text-white" style={{ background: COLORS.primary }}>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-bold">Vista móvil</div>
                    <h3 className="text-xl font-black mt-1">{form.title}</h3>
                    <p className="text-sm text-white/75 mt-1">{activePage.title}</p>
                  </div>
                  <div className="p-5 space-y-6">
                    {activePage.fields.length === 0 ? (
                      <p className="py-12 text-center text-sm text-slate-400">Esta página todavía no tiene preguntas.</p>
                    ) : activePage.fields.map(field => <FormFieldPreview key={field.id} field={field} />)}
                  </div>
                  <div className="p-5 border-t border-slate-100">
                    <div className="h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white" style={{ background: COLORS.primary }}>Guardar y continuar</div>
                  </div>
                </div>
              ) : activePage.fields.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 sm:py-24 px-6 bg-white/50 border-2 border-dashed border-slate-200 rounded-[32px] text-center">
                  <Layout size={40} className="text-slate-200 mb-4" />
                  <p className="text-slate-400 text-sm font-medium">Elige un tipo de campo para comenzar</p>
                </div>
              ) : (
                <Reorder.Group axis="y" values={activePage.fields} onReorder={(newFields) => {
                  const newPages = [...form.pages!]
                  newPages[activePageIdx].fields = newFields
                  setForm({ ...form, pages: newPages })
                }} className="space-y-4">
                  {activePage.fields.map((f) => (
                    <Reorder.Item 
                      key={f.id} 
                      value={f}
                      onClick={() => setSelectedFieldId(f.id)}
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
                        <div className="flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); deleteField(f.id); }} className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              )}
            </div>
          </div>
        </main>

        {/* Right Settings Sidebar */}
        <AnimatePresence>
          {selectedFieldId && (
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
                  return (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Etiqueta de Pregunta</label>
                        <input
                          value={f.label}
                          onChange={e => updateField(f.id, { label: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-700">Campo Obligatorio</span>
                        <button
                          onClick={() => updateField(f.id, { required: !f.required })}
                          className={`w-12 h-6 rounded-full relative transition-all ${f.required ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${f.required ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>

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
