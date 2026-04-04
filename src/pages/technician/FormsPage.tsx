import { useEffect, useState, useCallback } from 'react'
import { ChevronRight, ArrowLeft, CloudOff, Save, MapPin, Camera, FileText, X, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { BottomNav, MobileTopBar } from '@/components/layout/BottomNav'
import { mockForms } from '@/lib/mockData'
import { cn } from '@/lib/utils'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query, ID } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'
import { localDB } from '@/lib/dexie-db'
import { useNavigate } from 'react-router-dom'
import type { Form, FormField } from '@/types'

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({
  message,
  type,
  onClose,
}: {
  message: string
  type: 'success' | 'error' | 'info'
  onClose: () => void
}) {
  const bg =
    type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-gray-800'
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className={cn(
        'fixed bottom-24 left-4 right-4 z-50 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-lg text-white',
        bg,
      )}
    >
      <span className="text-sm font-semibold">{message}</span>
      <button onClick={onClose} className="flex-shrink-0">
        <X size={16} />
      </button>
    </motion.div>
  )
}

// ─── FieldRenderer ────────────────────────────────────────────────────────────

type FieldValue = string | boolean | string[]

interface FieldRendererProps {
  field: FormField
  value: FieldValue
  onChange: (val: FieldValue) => void
}

function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
  switch (field.type) {
    case 'text_short':
      return (
        <input
          type="text"
          placeholder={field.placeholder || `Ingresa ${field.label.toLowerCase()}...`}
          className="mobile-field-input"
          value={value as string}
          onChange={e => onChange(e.target.value)}
        />
      )
    case 'text_long':
      return (
        <textarea
          placeholder={field.placeholder || `Describe ${field.label.toLowerCase()}...`}
          className="mobile-field-input resize-none"
          rows={3}
          value={value as string}
          onChange={e => onChange(e.target.value)}
        />
      )
    case 'numeric':
      return (
        <input
          type="number"
          placeholder={field.placeholder || '0'}
          className="mobile-field-input"
          value={value as string}
          onChange={e => onChange(e.target.value)}
        />
      )
    case 'yes_no':
      return (
        <div className="flex gap-3">
          {['Sí', 'No'].map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                'flex-1 py-3 rounded-xl font-semibold text-sm transition-all border-2',
                value === opt
                  ? 'bg-brand-primary border-brand-primary text-white'
                  : 'border-border text-muted-foreground hover:border-brand-primary/50',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )
    case 'single_select':
      if (field.displayAs === 'radio' || !field.displayAs) {
        return (
          <div className="space-y-2">
            {(field.options || []).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                  value === opt.value
                    ? 'border-brand-primary bg-brand-primary/5'
                    : 'border-border hover:border-brand-primary/30',
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                    value === opt.value ? 'border-brand-primary' : 'border-gray-300',
                  )}
                >
                  {value === opt.value && (
                    <div className="w-2.5 h-2.5 rounded-full bg-brand-primary" />
                  )}
                </div>
                <span className="text-sm">{opt.label}</span>
              </button>
            ))}
          </div>
        )
      }
      return (
        <select
          className="mobile-field-input"
          value={value as string}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Seleccionar...</option>
          {(field.options || []).map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )
    case 'multi_select':
      return (
        <div className="space-y-2">
          {(field.options || []).map(opt => {
            const vals = Array.isArray(value) ? (value as string[]) : []
            const checked = vals.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(
                    checked ? vals.filter(v => v !== opt.value) : [...vals, opt.value],
                  )
                }}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                  checked
                    ? 'border-brand-primary bg-brand-primary/5'
                    : 'border-border hover:border-brand-primary/30',
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center',
                    checked ? 'border-brand-primary bg-brand-primary' : 'border-gray-300',
                  )}
                >
                  {checked && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <span className="text-sm">{opt.label}</span>
              </button>
            )
          })}
        </div>
      )
    case 'geolocation':
      return (
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 py-3 bg-brand-primary/10 border-2 border-brand-primary/30 text-brand-primary rounded-xl font-medium text-sm"
        >
          <MapPin size={18} /> Capturar ubicación GPS
        </button>
      )
    case 'photo':
      return (
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-brand-primary/30 text-brand-primary rounded-xl font-medium text-sm"
        >
          <Camera size={20} /> Tomar fotografía
        </button>
      )
    case 'signature':
      return (
        <div className="border-2 border-dashed border-border rounded-xl p-6 text-center text-muted-foreground text-sm">
          <FileText size={24} className="mx-auto mb-2 opacity-40" />
          Área de firma digital
          {field.consentText && (
            <p className="text-xs mt-2 text-muted-foreground/70">{field.consentText}</p>
          )}
        </div>
      )
    case 'date':
      return (
        <input
          type="date"
          className="mobile-field-input"
          value={value as string}
          onChange={e => onChange(e.target.value)}
        />
      )
    case 'time':
      return (
        <input
          type="time"
          className="mobile-field-input"
          value={value as string}
          onChange={e => onChange(e.target.value)}
        />
      )
    default:
      return (
        <input
          type="text"
          className="mobile-field-input"
          placeholder={`${field.label}...`}
          value={value as string}
          onChange={e => onChange(e.target.value)}
        />
      )
  }
}

// ─── FormView ─────────────────────────────────────────────────────────────────

function FormView({
  form,
  onBack,
  showToast,
}: {
  form: Form
  onBack: () => void
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void
}) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [startedAt] = useState(() => new Date().toISOString())

  const pages = form.schema.pages
  const page = pages[currentPage]
  const totalPages = pages.length
  const progress = ((currentPage + 1) / totalPages) * 100

  // Flatten all field IDs across all pages for the values map
  const allFields = pages.flatMap(p => p.fields)

  // Values map: fieldId -> FieldValue
  const [values, setValues] = useState<Record<string, FieldValue>>(() =>
    Object.fromEntries(allFields.map(f => [f.id, ''])),
  )

  const handleFieldChange = useCallback((fieldId: string, val: FieldValue) => {
    setValues(prev => ({ ...prev, [fieldId]: val }))
  }, [])

  // Save draft to IndexedDB
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const localId = `draft_${form.id}_${Date.now()}`
      await localDB.responses.put({
        local_id: localId,
        form_id: form.id,
        project_id: form.projectId ?? '',
        organization_id: form.organizationId,
        technician_id: user?.id ?? 'unknown',
        zone_id: null,
        data: JSON.stringify(values),
        latitude: null,
        longitude: null,
        accuracy: null,
        status: 'draft',
        source: 'digital',
        device_info: navigator.userAgent.slice(0, 100),
        started_at: startedAt,
        completed_at: null,
        sync_status: 'pending',
        retry_count: 0,
        created_at: Date.now(),
      })
      showToast('Borrador guardado localmente', 'success')
    } catch {
      showToast('Error al guardar el borrador', 'error')
    }
    setIsSaving(false)
  }

  // Submit form
  const handleSubmit = async () => {
    setIsSubmitting(true)
    const completedAt = new Date().toISOString()
    const localId = `resp_${form.id}_${Date.now()}`

    const payload = {
      form_id: form.id,
      project_id: form.projectId ?? '',
      organization_id: form.organizationId,
      technician_id: user?.id ?? 'unknown',
      zone_id: null,
      data: JSON.stringify(values),
      latitude: null,
      longitude: null,
      accuracy: null,
      status: 'synced',
      source: 'digital',
      device_info: navigator.userAgent.slice(0, 100),
      started_at: startedAt,
      completed_at: completedAt,
    }

    let savedToCloud = false

    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_IDS.FORM_RESPONSES,
        ID.unique(),
        payload,
      )
      savedToCloud = true
    } catch {
      // Offline or Appwrite not configured — save to IndexedDB
      try {
        await localDB.responses.put({
          local_id: localId,
          form_id: form.id,
          project_id: form.projectId ?? '',
          organization_id: form.organizationId,
          technician_id: user?.id ?? 'unknown',
          zone_id: null,
          data: JSON.stringify(values),
          latitude: null,
          longitude: null,
          accuracy: null,
          status: 'pending',
          source: 'digital',
          device_info: navigator.userAgent.slice(0, 100),
          started_at: startedAt,
          completed_at: completedAt,
          sync_status: 'pending',
          retry_count: 0,
          created_at: Date.now(),
        })
      } catch {
        showToast('Error al guardar la respuesta', 'error')
        setIsSubmitting(false)
        return
      }
    }

    setIsSubmitting(false)

    if (savedToCloud) {
      showToast('Formulario enviado correctamente', 'success')
    } else {
      showToast('Guardado localmente — se sincronizará cuando haya conexión', 'info')
    }

    setTimeout(() => navigate('/field'), 1500)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="p-2 -ml-1 hover:bg-muted rounded-xl">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate">{form.name}</div>
            <div className="text-xs text-muted-foreground">
              Paso {currentPage + 1} de {totalPages} — {page.title}
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1 text-xs text-brand-primary font-medium px-2 py-1.5 rounded-lg hover:bg-brand-primary/10 disabled:opacity-50"
          >
            <Save size={14} /> {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <motion.div
            className="h-full bg-brand-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <div className="text-center py-0.5 text-xs text-green-600 bg-green-50">
          Guardado automáticamente ✓
        </div>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-4 py-5 pb-8 space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            {page.fields.map(field => (
              <div key={field.id} className="mobile-field-wrapper">
                <label className="mobile-field-label">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.helpText && (
                  <p className="text-xs text-muted-foreground mb-2">{field.helpText}</p>
                )}
                <FieldRenderer
                  field={field}
                  value={values[field.id] ?? ''}
                  onChange={val => handleFieldChange(field.id, val)}
                />
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-white border-t border-border px-4 py-3 flex gap-3">
        {currentPage > 0 && (
          <button
            onClick={() => setCurrentPage(p => p - 1)}
            className="flex-1 py-3.5 rounded-2xl border border-border font-semibold text-sm"
          >
            ← Anterior
          </button>
        )}
        {currentPage < totalPages - 1 ? (
          <button
            onClick={() => setCurrentPage(p => p + 1)}
            className="flex-1 py-3.5 rounded-2xl bg-brand-primary text-white font-semibold text-sm"
          >
            Siguiente →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3.5 rounded-2xl bg-green-500 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="animate-pulse">Enviando...</span>
            ) : (
              <><Check size={16} /> Finalizar y Enviar</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── FormsPage ────────────────────────────────────────────────────────────────

export default function FormsPage() {
  const { user } = useAuthStore()
  const [forms, setForms] = useState<Form[]>(mockForms)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info') => {
      setToast({ message, type })
      setTimeout(() => setToast(null), 3500)
    },
    [],
  )

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      try {
        const queries = [Query.equal('status', 'published'), Query.orderDesc('$updatedAt'), Query.limit(30)]
        if (user?.organizationId) {
          queries.push(Query.equal('organization_id', user.organizationId))
        }

        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORMS, queries)
        if (cancelled) return

        if (res.documents.length > 0) {
          const loaded: Form[] = res.documents.map(doc => {
            let schema = { pages: [] as Form['schema']['pages'] }
            try {
              schema = typeof doc.schema === 'string' ? JSON.parse(doc.schema) : doc.schema
            } catch { /* use empty */ }
            return {
              id: doc.$id,
              projectId: (doc.project_id as string) ?? '',
              organizationId: doc.organization_id ?? '',
              createdBy: doc.created_by ?? '',
              name: doc.name as string,
              description: doc.description ?? '',
              version: doc.version ?? 1,
              status: doc.status as Form['status'],
              schema,
              totalFields: doc.total_fields ?? 0,
              createdAt: doc.$createdAt,
              updatedAt: doc.$updatedAt,
            }
          })
          setForms(loaded)
        }
        // If 0 results, keep mockForms as fallback
      } catch {
        // Network error or Appwrite not configured — keep mockForms
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user?.organizationId])

  if (selectedForm) {
    return (
      <>
        <FormView form={selectedForm} onBack={() => setSelectedForm(null)} showToast={showToast} />
        <AnimatePresence>
          {toast && (
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          )}
        </AnimatePresence>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileTopBar title="Formularios" />

      <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
          Asignados a tu zona
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-border p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2 mb-3" />
                <div className="flex gap-2">
                  <div className="h-6 bg-muted rounded-full w-16" />
                  <div className="h-6 bg-muted rounded-full w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {forms.map((form, i) => (
              <motion.div
                key={form.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-white rounded-2xl border border-border p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm">{form.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {form.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="bg-muted px-2 py-0.5 rounded-full">{form.totalFields} campos</span>
                      <span className="bg-muted px-2 py-0.5 rounded-full">
                        {form.schema.pages.length} páginas
                      </span>
                      <span className="bg-muted px-2 py-0.5 rounded-full capitalize">{form.status}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedForm(form)}
                    className="flex-shrink-0 bg-brand-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-secondary transition-colors flex items-center gap-1"
                  >
                    Iniciar <ChevronRight size={14} />
                  </button>
                </div>
              </motion.div>
            ))}

            {forms.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <FileText size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No tienes formularios asignados</p>
                <p className="text-sm mt-1">Contacta a tu coordinador para que te asigne formularios</p>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  )
}
