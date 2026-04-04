import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ID } from 'appwrite'
import { DndContext, DragEndEvent, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Type, AlignLeft, Hash, List, CheckSquare, ToggleLeft, Calendar, Clock,
  MapPin, Camera, Video, PenTool, Paperclip, QrCode, Grid, Plus, Trash2,
  GripVertical, Settings2, Eye, Save, Globe, FileText, History, X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper } from '@/components/shared'
import { cn } from '@/lib/utils'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { useAuthStore } from '@/stores/authStore'
import type { FieldType, FormField, FormPage } from '@/types'

const FIELD_TYPES = [
  { type: 'text_short' as FieldType, label: 'Texto corto', icon: <Type size={16} />, category: 'Básicos' },
  { type: 'text_long' as FieldType, label: 'Texto largo', icon: <AlignLeft size={16} />, category: 'Básicos' },
  { type: 'numeric' as FieldType, label: 'Numérico', icon: <Hash size={16} />, category: 'Básicos' },
  { type: 'single_select' as FieldType, label: 'Selección única', icon: <List size={16} />, category: 'Básicos' },
  { type: 'multi_select' as FieldType, label: 'Selección múltiple', icon: <CheckSquare size={16} />, category: 'Básicos' },
  { type: 'yes_no' as FieldType, label: 'Sí / No', icon: <ToggleLeft size={16} />, category: 'Básicos' },
  { type: 'date' as FieldType, label: 'Fecha', icon: <Calendar size={16} />, category: 'Fecha y Hora' },
  { type: 'time' as FieldType, label: 'Hora', icon: <Clock size={16} />, category: 'Fecha y Hora' },
  { type: 'likert' as FieldType, label: 'Escala Likert', icon: <Grid size={16} />, category: 'Escalas' },
  { type: 'geolocation' as FieldType, label: 'Geolocalización', icon: <MapPin size={16} />, category: 'Ubicación' },
  { type: 'photo' as FieldType, label: 'Fotografía', icon: <Camera size={16} />, category: 'Multimedia' },
  { type: 'video' as FieldType, label: 'Video corto', icon: <Video size={16} />, category: 'Multimedia' },
  { type: 'signature' as FieldType, label: 'Firma digital', icon: <PenTool size={16} />, category: 'Multimedia' },
  { type: 'file' as FieldType, label: 'Archivo adjunto', icon: <Paperclip size={16} />, category: 'Multimedia' },
  { type: 'barcode_qr' as FieldType, label: 'Código QR/Barras', icon: <QrCode size={16} />, category: 'Ubicación' },
  { type: 'repeating_group' as FieldType, label: 'Grupo repetitivo', icon: <Plus size={16} />, category: 'Avanzados' },
  { type: 'section_title' as FieldType, label: 'Separador/Título', icon: <FileText size={16} />, category: 'Estructura' },
]

const CATEGORIES = ['Básicos', 'Fecha y Hora', 'Escalas', 'Multimedia', 'Ubicación', 'Avanzados', 'Estructura']

// Draggable field type item
function DraggableFieldType({ type, label, icon }: { type: FieldType; label: string; icon: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `type-${type}`, data: { fieldType: type } })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-grab hover:bg-brand-primary/10 hover:text-brand-primary transition-all',
        'border border-transparent hover:border-brand-primary/20',
        'text-sm font-medium text-muted-foreground',
        isDragging && 'opacity-50',
      )}
    >
      <span className="text-brand-primary flex-shrink-0">{icon}</span>
      {label}
    </div>
  )
}

// Sortable field card in canvas
function SortableField({ field, isSelected, onSelect, onDelete }: {
  field: FormField; isSelected: boolean; onSelect: () => void; onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onSelect}
      className={cn(
        'form-field-card cursor-pointer group',
        isSelected && 'ring-2 ring-brand-primary border-transparent',
        isDragging && 'opacity-50 shadow-2xl',
      )}
    >
      {field.type === 'section_title' ? (
        <div className="py-2">
          <div className="h-px bg-border w-full" />
          <div className="text-center -mt-2.5">
            <span className="bg-card px-3 text-sm font-bold text-muted-foreground">{field.label}</span>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div {...listeners} {...attributes} className="mt-0.5 cursor-grab text-muted-foreground/40 hover:text-muted-foreground flex-shrink-0">
            <GripVertical size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{field.label}</span>
              {field.required && <span className="text-red-500 text-xs font-bold">*</span>}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 capitalize">{field.type.replace(/_/g, ' ')}</div>
            {field.helpText && <div className="text-xs text-muted-foreground/70 mt-1 italic">{field.helpText}</div>}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-1 hover:bg-muted rounded"><Settings2 size={14} className="text-muted-foreground" /></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="p-1 hover:bg-red-50 rounded">
              <Trash2 size={14} className="text-red-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Field properties panel
function FieldProperties({ field, onChange }: { field: FormField | null; onChange: (f: FormField) => void }) {
  if (!field) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
        <Settings2 size={32} className="mb-3 opacity-30" />
        <p className="text-sm font-medium">Selecciona un campo para configurarlo</p>
        <p className="text-xs mt-1">Haz clic en cualquier field del canvas</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <h3 className="font-bold text-sm">Propiedades del campo</h3>

      {/* Label */}
      <div>
        <label className="block text-xs font-semibold mb-1.5">Etiqueta / Nombre</label>
        <input
          value={field.label}
          onChange={e => onChange({ ...field, label: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        />
      </div>

      {/* Placeholder */}
      {['text_short', 'text_long', 'numeric'].includes(field.type) && (
        <div>
          <label className="block text-xs font-semibold mb-1.5">Placeholder</label>
          <input
            value={field.placeholder || ''}
            onChange={e => onChange({ ...field, placeholder: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            placeholder="Texto de ayuda..."
          />
        </div>
      )}

      {/* Help text */}
      <div>
        <label className="block text-xs font-semibold mb-1.5">Descripción / Ayuda</label>
        <textarea
          value={field.helpText || ''}
          onChange={e => onChange({ ...field, helpText: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 resize-none"
          rows={2}
          placeholder="Instrucciones para el campo..."
        />
      </div>

      {/* Required toggle */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold">Campo obligatorio</label>
        <button
          onClick={() => onChange({ ...field, required: !field.required })}
          className={cn(
            'w-10 h-5 rounded-full transition-colors duration-200 relative',
            field.required ? 'bg-brand-primary' : 'bg-gray-300',
          )}
        >
          <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200', field.required ? 'left-5' : 'left-0.5')} />
        </button>
      </div>

      {/* Options for select fields */}
      {['single_select', 'multi_select'].includes(field.type) && (
        <div>
          <label className="block text-xs font-semibold mb-1.5">Opciones</label>
          <div className="space-y-2">
            {(field.options || []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={opt.label}
                  onChange={e => {
                    const newOpts = [...(field.options || [])]
                    newOpts[i] = { ...opt, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') }
                    onChange({ ...field, options: newOpts })
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
                <button
                  onClick={() => onChange({ ...field, options: (field.options || []).filter((_, j) => j !== i) })}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={() => onChange({ ...field, options: [...(field.options || []), { value: `opt_${Date.now()}`, label: 'Nueva opción' }] })}
              className="flex items-center gap-1.5 text-xs text-brand-primary font-medium hover:underline"
            >
              <Plus size={12} /> Agregar opción
            </button>
          </div>
        </div>
      )}

      {/* Validation */}
      {['text_short', 'text_long'].includes(field.type) && (
        <div>
          <label className="block text-xs font-semibold mb-1.5">Longitud</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-xs text-muted-foreground">Mín</span>
              <input type="number" className="w-full px-3 py-1.5 rounded-lg border border-input text-sm focus:outline-none" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Máx</span>
              <input type="number" className="w-full px-3 py-1.5 rounded-lg border border-input text-sm focus:outline-none" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Preview field renderer
function PreviewField({ field }: { field: FormField }) {
  if (field.type === 'section_title') {
    return (
      <div className="py-3">
        <div className="h-px bg-gray-200 w-full" />
        <div className="text-center -mt-2.5">
          <span className="bg-white px-3 text-sm font-bold text-gray-500">{field.label}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-gray-800">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.helpText && <p className="text-xs text-gray-500 italic">{field.helpText}</p>}
      {(field.type === 'text_short' || field.type === 'numeric') && (
        <input
          disabled
          placeholder={field.placeholder || ''}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50"
        />
      )}
      {field.type === 'text_long' && (
        <textarea
          disabled
          placeholder={field.placeholder || ''}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50 resize-none"
        />
      )}
      {(field.type === 'single_select' || field.type === 'multi_select') && (
        <div className="space-y-1.5">
          {(field.options || []).map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type={field.type === 'single_select' ? 'radio' : 'checkbox'}
                disabled
                className="accent-brand-primary"
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}
      {field.type === 'yes_no' && (
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="radio" disabled className="accent-brand-primary" /> Sí
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="radio" disabled className="accent-brand-primary" /> No
          </label>
        </div>
      )}
      {field.type === 'date' && (
        <input type="date" disabled className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50" />
      )}
      {field.type === 'time' && (
        <input type="time" disabled className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50" />
      )}
      {(field.type === 'photo' || field.type === 'video' || field.type === 'file') && (
        <div className="w-full px-3 py-4 rounded-lg border border-dashed border-gray-300 text-sm text-gray-400 text-center bg-gray-50">
          {field.type === 'photo' ? 'Tomar fotografía' : field.type === 'video' ? 'Grabar video' : 'Adjuntar archivo'}
        </div>
      )}
      {field.type === 'signature' && (
        <div className="w-full h-20 rounded-lg border border-dashed border-gray-300 text-sm text-gray-400 flex items-center justify-center bg-gray-50">
          Área de firma
        </div>
      )}
      {field.type === 'geolocation' && (
        <div className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-400 bg-gray-50 flex items-center gap-2">
          <MapPin size={14} /> Obtener ubicación GPS
        </div>
      )}
      {field.type === 'barcode_qr' && (
        <div className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-400 bg-gray-50 flex items-center gap-2">
          <QrCode size={14} /> Escanear código QR/Barras
        </div>
      )}
      {field.type === 'likert' && (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} disabled className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-500 bg-gray-50">
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

let fieldCounter = 100

export default function FormBuilderPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [pages, setPages] = useState<FormPage[]>([
    { id: 'page_1', title: 'Página 1', fields: [] }
  ])
  const [activePage, setActivePage] = useState(0)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [formName, setFormName] = useState('Nuevo formulario sin título')

  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [savedFormId, setSavedFormId] = useState<string | null>(null)

  const currentPage = pages[activePage]
  const selectedField = currentPage?.fields.find(f => f.id === selectedFieldId) || null

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: 'canvas' })

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const saveDraft = async () => {
    setIsSaving(true)
    try {
      const schemaJson = JSON.stringify({ pages })
      const totalFields = pages.reduce((acc, p) => acc + p.fields.length, 0)

      if (savedFormId) {
        await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.FORMS, savedFormId, {
          name: formName,
          schema: schemaJson,
          total_fields: totalFields,
          status: 'draft'
        })
      } else {
        const doc = await databases.createDocument(DATABASE_ID, COLLECTION_IDS.FORMS, ID.unique(), {
          name: formName,
          schema: schemaJson,
          total_fields: totalFields,
          status: 'draft',
          version: 1,
          organization_id: user?.organizationId || '',
          created_by: user?.id || ''
        })
        setSavedFormId(doc.$id)
      }
      showToast('Formulario guardado como borrador')
    } catch {
      // Si falla Appwrite, guardar en localStorage como fallback
      localStorage.setItem('cg_draft_form', JSON.stringify({ name: formName, pages, savedAt: new Date().toISOString() }))
      showToast('Borrador guardado localmente', 'success')
    } finally {
      setIsSaving(false)
    }
  }

  const publishForm = async () => {
    if (pages.every(p => p.fields.length === 0)) {
      showToast('Agrega al menos un campo antes de publicar', 'error')
      return
    }
    setIsPublishing(true)
    try {
      const schemaJson = JSON.stringify({ pages })
      const totalFields = pages.reduce((acc, p) => acc + p.fields.length, 0)

      if (savedFormId) {
        await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.FORMS, savedFormId, {
          name: formName,
          schema: schemaJson,
          total_fields: totalFields,
          status: 'published'
        })
      } else {
        const doc = await databases.createDocument(DATABASE_ID, COLLECTION_IDS.FORMS, ID.unique(), {
          name: formName,
          schema: schemaJson,
          total_fields: totalFields,
          status: 'published',
          version: 1,
          organization_id: user?.organizationId || '',
          created_by: user?.id || ''
        })
        setSavedFormId(doc.$id)
      }
      showToast('¡Formulario publicado exitosamente! Los técnicos ya pueden verlo.')
      setTimeout(() => navigate('/coord/templates'), 2000)
    } catch {
      showToast('Error al publicar. Verificar conexión con el servidor.', 'error')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // Adding new field from type panel
    if (activeId.startsWith('type-')) {
      const fieldType = active.data?.current?.fieldType as FieldType
      const newField: FormField = {
        id: `field_${++fieldCounter}`,
        type: fieldType,
        label: FIELD_TYPES.find(t => t.type === fieldType)?.label || fieldType,
        required: false,
        options: ['single_select', 'multi_select'].includes(fieldType)
          ? [{ value: 'opcion_1', label: 'Opción 1' }, { value: 'opcion_2', label: 'Opción 2' }]
          : undefined,
      }
      setPages(prev => prev.map((p, i) =>
        i === activePage ? { ...p, fields: [...p.fields, newField] } : p
      ))
      setSelectedFieldId(newField.id)
      return
    }

    // Reordering existing fields
    if (activeId !== overId) {
      setPages(prev => prev.map((p, i) => {
        if (i !== activePage) return p
        const oldIndex = p.fields.findIndex(f => f.id === activeId)
        const newIndex = p.fields.findIndex(f => f.id === overId)
        if (oldIndex === -1 || newIndex === -1) return p
        return { ...p, fields: arrayMove(p.fields, oldIndex, newIndex) }
      }))
    }
  }

  const updateSelectedField = (updated: FormField) => {
    setPages(prev => prev.map((p, i) =>
      i === activePage
        ? { ...p, fields: p.fields.map(f => f.id === updated.id ? updated : f) }
        : p
    ))
  }

  const deleteField = (fieldId: string) => {
    setPages(prev => prev.map((p, i) =>
      i === activePage ? { ...p, fields: p.fields.filter(f => f.id !== fieldId) } : p
    ))
    if (selectedFieldId === fieldId) setSelectedFieldId(null)
  }

  return (
    <PageWrapper className="flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <input
            value={formName}
            onChange={e => setFormName(e.target.value)}
            className="text-lg font-bold text-foreground bg-transparent border-none outline-none focus:bg-muted/30 px-2 py-1 rounded-lg transition-colors"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              <Eye size={14} /> Vista previa
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
              <History size={14} /> Versiones
            </button>
            <button
              onClick={saveDraft}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-sm font-medium hover:bg-muted/80 transition-colors disabled:opacity-60"
            >
              <Save size={14} /> {isSaving ? 'Guardando...' : 'Guardar borrador'}
            </button>
            <button
              onClick={publishForm}
              disabled={isPublishing}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-secondary transition-colors disabled:opacity-60"
            >
              <Globe size={14} /> {isPublishing ? 'Publicando...' : 'Publicar formulario'}
            </button>
          </div>
        </div>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
          {/* Left: Field types */}
          <div className="w-60 flex-shrink-0 bg-white border-r border-border overflow-y-auto">
            <div className="p-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">Tipos de campo</h3>
              {CATEGORIES.map(cat => {
                const catFields = FIELD_TYPES.filter(f => f.category === cat)
                return (
                  <div key={cat} className="mb-4">
                    <div className="text-xs font-semibold text-muted-foreground/60 px-1 mb-1">{cat}</div>
                    {catFields.map(ft => (
                      <DraggableFieldType key={ft.type} type={ft.type} label={ft.label} icon={ft.icon} />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Center: Canvas */}
          <div className="flex-1 bg-gray-50 overflow-y-auto">
            {/* Page tabs */}
            <div className="flex items-center gap-2 px-6 pt-4 pb-0 border-b border-transparent">
              {pages.map((page, i) => (
                <button
                  key={page.id}
                  onClick={() => setActivePage(i)}
                  className={cn(
                    'px-4 py-2 rounded-t-lg text-sm font-medium transition-colors border-b-2',
                    i === activePage
                      ? 'bg-white text-brand-primary border-brand-primary shadow-sm'
                      : 'text-muted-foreground border-transparent hover:text-foreground',
                  )}
                >
                  {page.title}
                </button>
              ))}
              <button
                onClick={() => {
                  const n = pages.length + 1
                  setPages(prev => [...prev, { id: `page_${n}`, title: `Página ${n}`, fields: [] }])
                  setActivePage(pages.length)
                }}
                className="px-3 py-2 text-muted-foreground hover:text-brand-primary text-sm"
              >
                + Nueva página
              </button>
            </div>

            {/* Drop zone */}
            <div ref={setDropRef} className={cn('min-h-[400px] p-6 transition-colors', isOver && 'bg-brand-primary/5')}>
              {currentPage?.fields.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-2xl text-muted-foreground">
                  <Plus size={32} className="mb-3 opacity-30" />
                  <p className="font-medium">Arrastra campos aquí para comenzar</p>
                  <p className="text-xs mt-1">O haz clic en un tipo de campo del panel izquierdo</p>
                </div>
              ) : (
                <SortableContext items={currentPage.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  <div className="max-w-2xl mx-auto space-y-3">
                    {currentPage.fields.map(field => (
                      <SortableField
                        key={field.id}
                        field={field}
                        isSelected={selectedFieldId === field.id}
                        onSelect={() => setSelectedFieldId(field.id)}
                        onDelete={() => deleteField(field.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}
            </div>
          </div>

          {/* Right: Properties */}
          <div className="w-72 flex-shrink-0 bg-white border-l border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">Propiedades</h3>
            </div>
            <FieldProperties field={selectedField} onChange={updateSelectedField} />
          </div>
        </div>
      </DndContext>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm max-h-[85vh] overflow-hidden flex flex-col"
            >
              {/* Phone-like header */}
              <div className="bg-brand-primary px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="text-white/70 text-xs font-medium">Vista previa móvil</div>
                  <div className="text-white font-bold text-sm mt-0.5 truncate max-w-[200px]">{formName}</div>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Page tabs */}
              {pages.length > 1 && (
                <div className="flex border-b border-gray-100 overflow-x-auto">
                  {pages.map((page, i) => (
                    <button
                      key={page.id}
                      onClick={() => setActivePage(i)}
                      className={cn(
                        'px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors',
                        i === activePage ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-gray-500'
                      )}
                    >
                      {page.title}
                    </button>
                  ))}
                </div>
              )}

              {/* Fields */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {currentPage?.fields.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <p className="text-sm">Esta página no tiene campos</p>
                  </div>
                ) : (
                  currentPage.fields.map(field => (
                    <PreviewField key={field.id} field={field} />
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100">
                <button disabled className="w-full py-3 rounded-xl bg-brand-primary text-white text-sm font-semibold opacity-80">
                  {activePage < pages.length - 1 ? 'Siguiente página' : 'Enviar formulario'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-medium ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  )
}
