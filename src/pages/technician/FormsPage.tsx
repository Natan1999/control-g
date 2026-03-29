import { useState } from 'react'
import { ChevronRight, ArrowLeft, CloudOff, Save, ChevronDown, MapPin, Camera, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { BottomNav, MobileTopBar } from '@/components/layout/BottomNav'
import { mockForms } from '@/lib/mockData'
import { cn } from '@/lib/utils'
import type { Form, FormField } from '@/types'

function FieldRenderer({ field }: { field: FormField }) {
  const [value, setValue] = useState<string | boolean | string[]>('')

  switch (field.type) {
    case 'text_short':
      return (
        <input
          type="text"
          placeholder={field.placeholder || `Ingresa ${field.label.toLowerCase()}...`}
          className="mobile-field-input"
          value={value as string}
          onChange={e => setValue(e.target.value)}
        />
      )
    case 'text_long':
      return (
        <textarea
          placeholder={field.placeholder || `Describe ${field.label.toLowerCase()}...`}
          className="mobile-field-input resize-none"
          rows={3}
          value={value as string}
          onChange={e => setValue(e.target.value)}
        />
      )
    case 'numeric':
      return (
        <input
          type="number"
          placeholder={field.placeholder || '0'}
          className="mobile-field-input"
          value={value as string}
          onChange={e => setValue(e.target.value)}
        />
      )
    case 'yes_no':
      return (
        <div className="flex gap-3">
          {['Sí', 'No'].map(opt => (
            <button
              key={opt}
              onClick={() => setValue(opt)}
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
                onClick={() => setValue(opt.value)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                  value === opt.value
                    ? 'border-brand-primary bg-brand-primary/5'
                    : 'border-border hover:border-brand-primary/30',
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                  value === opt.value ? 'border-brand-primary' : 'border-gray-300',
                )}>
                  {value === opt.value && <div className="w-2.5 h-2.5 rounded-full bg-brand-primary" />}
                </div>
                <span className="text-sm">{opt.label}</span>
              </button>
            ))}
          </div>
        )
      }
      return (
        <select className="mobile-field-input" value={value as string} onChange={e => setValue(e.target.value)}>
          <option value="">Seleccionar...</option>
          {(field.options || []).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )
    case 'multi_select':
      return (
        <div className="space-y-2">
          {(field.options || []).map(opt => {
            const vals = value as string[]
            const checked = Array.isArray(vals) && vals.includes(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => {
                  const arr = Array.isArray(value) ? value : []
                  setValue(checked ? arr.filter(v => v !== opt.value) : [...arr, opt.value])
                }}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                  checked ? 'border-brand-primary bg-brand-primary/5' : 'border-border hover:border-brand-primary/30',
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center',
                  checked ? 'border-brand-primary bg-brand-primary' : 'border-gray-300',
                )}>
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
        <button className="w-full flex items-center justify-center gap-2 py-3 bg-brand-primary/10 border-2 border-brand-primary/30 text-brand-primary rounded-xl font-medium text-sm">
          <MapPin size={18} /> Capturar ubicación GPS
        </button>
      )
    case 'photo':
      return (
        <button className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-brand-primary/30 text-brand-primary rounded-xl font-medium text-sm">
          <Camera size={20} /> Tomar fotografía
        </button>
      )
    case 'signature':
      return (
        <div className="border-2 border-dashed border-border rounded-xl p-6 text-center text-muted-foreground text-sm">
          <FileText size={24} className="mx-auto mb-2 opacity-40" />
          Área de firma digital
          {field.consentText && <p className="text-xs mt-2 text-muted-foreground/70">{field.consentText}</p>}
        </div>
      )
    case 'date':
      return <input type="date" className="mobile-field-input" />
    case 'time':
      return <input type="time" className="mobile-field-input" />
    default:
      return <input type="text" className="mobile-field-input" placeholder={`${field.label}...`} />
  }
}

function FormView({ form, onBack }: { form: Form; onBack: () => void }) {
  const [currentPage, setCurrentPage] = useState(0)
  const pages = form.schema.pages
  const page = pages[currentPage]
  const totalPages = pages.length
  const progress = ((currentPage + 1) / totalPages) * 100

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
            <div className="text-xs text-muted-foreground">Paso {currentPage + 1} de {totalPages} — {page.title}</div>
          </div>
          <button className="flex items-center gap-1 text-xs text-brand-primary font-medium px-2 py-1.5 rounded-lg hover:bg-brand-primary/10">
            <Save size={14} /> Guardar
          </button>
        </div>
        {/* Progress */}
        <div className="h-1 bg-gray-100">
          <motion.div
            className="h-full bg-brand-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        {/* Auto-save indicator */}
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
                {field.helpText && <p className="text-xs text-muted-foreground mb-2">{field.helpText}</p>}
                <FieldRenderer field={field} />
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
          <button className="flex-1 py-3.5 rounded-2xl bg-green-500 text-white font-semibold text-sm flex items-center justify-center gap-2">
            <CloudOff size={16} /> Finalizar y Enviar
          </button>
        )}
      </div>
    </div>
  )
}

export default function FormsPage() {
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)

  if (selectedForm) {
    return <FormView form={selectedForm} onBack={() => setSelectedForm(null)} />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileTopBar title="Formularios" />

      <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Asignados a tu zona</h2>

        <div className="space-y-3">
          {mockForms.map((form, i) => (
            <motion.div
              key={form.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white rounded-2xl border border-border p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm">{form.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{form.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="bg-muted px-2 py-0.5 rounded-full">{form.totalFields} campos</span>
                    <span className="bg-muted px-2 py-0.5 rounded-full">{form.schema.pages.length} páginas</span>
                    <span className="bg-muted px-2 py-0.5 rounded-full capitalize">{form.status}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedForm(form)}
                  className="flex-shrink-0 bg-brand-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-secondary transition-colors"
                >
                  Iniciar
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
