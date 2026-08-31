import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, FlaskConical, Layout, Loader2, Save } from 'lucide-react'
import type { FormDefinition, FormPage } from '@/types'
import { geometryCaptureIsComplete } from '@/lib/geometry-capture'
import {
  resolveFormRuntimeState,
  sanitizeVisibleAnswers,
  validateFieldValue,
} from '@/lib/form-runtime'
import DynamicField from './fields/DynamicField'

interface FormRendererProps {
  definition: FormDefinition
  initialData?: Record<string, unknown>
  onSubmit: (answers: Record<string, unknown>) => void | Promise<void>
  onSaveDraft?: (answers: Record<string, unknown>) => void | Promise<void>
  mode?: 'capture' | 'simulation'
  embedded?: boolean
}

export default function FormRenderer({
  definition,
  initialData = {},
  onSubmit,
  onSaveDraft,
  mode = 'capture',
  embedded = false,
}: FormRendererProps) {
  const [currentPageIdx, setCurrentPageIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const pages = definition.pages
  const currentPage = pages[currentPageIdx]
  const runtimeState = useMemo(() => resolveFormRuntimeState(pages, answers), [answers, pages])
  const effectiveAnswers = runtimeState.answers
  const visibleFields = currentPage?.fields.filter(field => runtimeState.visibleFieldIds.has(field.id)) || []
  const progress = pages.length ? ((currentPageIdx + 1) / pages.length) * 100 : 0

  useEffect(() => {
    if (mode === 'simulation' || !onSaveDraft) return
    const timer = window.setTimeout(() => {
      void onSaveDraft(sanitizeVisibleAnswers(pages, effectiveAnswers))
    }, 2_000)
    return () => window.clearTimeout(timer)
  }, [effectiveAnswers, mode, onSaveDraft, pages])

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setAnswers(previous => ({ ...previous, [fieldId]: value }))
    setErrors(previous => {
      if (!previous[fieldId]) return previous
      const next = { ...previous }
      delete next[fieldId]
      return next
    })
  }

  const errorsForPage = (page: FormPage) => {
    const next: Record<string, string> = {}
    page.fields.filter(field => runtimeState.visibleFieldIds.has(field.id)).forEach(field => {
      const value = effectiveAnswers[field.id]
      const geometryIncomplete = (field.type === 'geotrace' || field.type === 'geoshape')
        && !geometryCaptureIsComplete(value, field.type)
      if (field.required && geometryIncomplete) {
        next[field.id] = 'Completa la captura geográfica antes de continuar'
        return
      }
      if (field.type === 'file' && value instanceof File && field.maxFileSizeMb && value.size > field.maxFileSizeMb * 1_000_000) {
        next[field.id] = `El archivo supera el límite de ${field.maxFileSizeMb} MB`
        return
      }
      if (field.type === 'file' && value instanceof File && value.type !== 'application/pdf') {
        next[field.id] = 'Adjunta un documento PDF válido'
        return
      }
      const validationError = validateFieldValue(field, value)
      if (validationError) next[field.id] = validationError
    })
    return next
  }

  const validatePage = (page: FormPage) => {
    const next = errorsForPage(page)
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleNext = () => {
    if (!currentPage || !validatePage(currentPage)) return
    if (currentPageIdx < pages.length - 1) {
      setCurrentPageIdx(previous => previous + 1)
      if (!embedded) window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    void handleSubmit()
  }

  const handleBack = () => {
    if (currentPageIdx === 0) return
    setCurrentPageIdx(previous => previous - 1)
    setErrors({})
    if (!embedded) window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    const validation = pages.map(errorsForPage)
    const firstInvalidPage = validation.findIndex(pageErrors => Object.keys(pageErrors).length > 0)
    if (firstInvalidPage >= 0) {
      setCurrentPageIdx(firstInvalidPage)
      setErrors(validation[firstInvalidPage])
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(sanitizeVisibleAnswers(pages, effectiveAnswers))
    } catch (error) {
      console.error('Submission failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!currentPage) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-900">Agrega una página antes de simular el formulario.</div>
  }

  return (
    <div className={`mx-auto max-w-3xl space-y-6 px-4 shadow-sm ${embedded ? 'pb-4' : 'pb-32'}`}>
      {mode === 'simulation' && (
        <div className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-xs leading-5 text-violet-950">
          <FlaskConical size={18} className="mt-0.5 shrink-0" />
          <div><strong>Simulación segura.</strong> Prueba páginas, reglas, cálculos y validaciones. Las respuestas no se guardarán ni se sincronizarán.</div>
        </div>
      )}

      <div className="rounded-[28px] border border-t-8 border-slate-100 border-t-[#0038A8] bg-white p-5 shadow-xl shadow-blue-900/5 sm:rounded-[40px] sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-4">
            <h1 className="truncate text-xl font-black leading-tight text-slate-900 sm:text-2xl">{definition.title}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Layout size={12} className="text-blue-500" />
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{currentPage.title}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-xl border border-blue-100/50 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600">{currentPageIdx + 1} / {pages.length}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-800" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={currentPage.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
          {visibleFields.length ? visibleFields.map(field => (
            <DynamicField
              key={field.id}
              field={field}
              value={effectiveAnswers[field.id]}
              onChange={value => handleFieldChange(field.id, value)}
              error={errors[field.id]}
              disabled={field.type === 'calculation'}
            />
          )) : (
            <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">No hay preguntas visibles en esta página con las respuestas actuales.</p>
          )}
        </motion.div>
      </AnimatePresence>

      <div className={`${embedded ? 'sticky bottom-0 rounded-2xl shadow-lg' : 'fixed bottom-0 left-0 right-0 z-50'} safe-bottom border-t border-slate-100 bg-white/95 p-4 backdrop-blur-xl sm:p-6`}>
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <button type="button" onClick={handleBack} disabled={currentPageIdx === 0 || isSubmitting} className={`flex items-center gap-2 rounded-3xl px-5 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${currentPageIdx === 0 ? 'pointer-events-none opacity-0' : 'text-slate-500 hover:bg-slate-100 active:scale-95'}`}>
            <ChevronLeft size={18} /> Atrás
          </button>
          <button type="button" onClick={handleNext} disabled={isSubmitting} className="flex min-h-12 max-w-[260px] flex-1 items-center justify-center gap-3 rounded-[24px] bg-[#0038A8] px-6 py-4 text-[11px] font-black uppercase tracking-widest text-white shadow-xl shadow-blue-900/20 transition-all hover:bg-[#002868] active:scale-95 disabled:opacity-50">
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : currentPageIdx === pages.length - 1 ? <>{mode === 'simulation' ? 'Probar envío' : 'Guardar'} <Save size={18} /></> : <>Siguiente <ChevronRight size={18} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}
