import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronRight, ChevronLeft, Save, CheckCircle2, 
  Layout, AlertCircle, FileText, Loader2 
} from 'lucide-react'
import { FormDefinition, FormPage, FormResponse } from '@/types'
import DynamicField from './fields/DynamicField'
import { localDB } from '@/lib/dexie-db'

interface FormRendererProps {
  definition: FormDefinition;
  initialData?: Record<string, any>;
  onSubmit: (answers: Record<string, any>) => void;
  onSaveDraft?: (answers: Record<string, any>) => void;
}

export default function FormRenderer({ 
  definition, 
  initialData = {}, 
  onSubmit, 
  onSaveDraft 
}: FormRendererProps) {
  const [currentPageIdx, setCurrentPageIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>(initialData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const pages = definition.pages
  const currentPage = pages[currentPageIdx]
  
  // Visibility Logic Filtering
  const visibleFields = currentPage.fields.filter(field => {
    if (!field.visibilityLogic) return true
    
    const targetValue = answers[field.visibilityLogic.fieldId]
    const operator = field.visibilityLogic.operator
    const value = field.visibilityLogic.value

    switch (operator) {
      case '==': return targetValue === value
      case '!=': return targetValue !== value
      case 'contains': 
        return Array.isArray(targetValue) && targetValue.includes(value)
      default: return true
    }
  })

  const progress = ((currentPageIdx + 1) / pages.length) * 100

  // Auto-save draft logic
  useEffect(() => {
    const timer = setTimeout(() => {
      onSaveDraft?.(answers)
    }, 2000)
    return () => clearTimeout(timer)
  }, [answers, onSaveDraft])

  const handleFieldChange = (fieldId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }))
    if (errors[fieldId]) {
      const newErrors = { ...errors }
      delete newErrors[fieldId]
      setErrors(newErrors)
    }
  }

  const validatePage = (page: FormPage) => {
    const newErrors: Record<string, string> = {}
    
    // Only validate fields that are currently visible
    const pageVisibleFields = page.fields.filter(f => {
        if (!f.visibilityLogic) return true
        const targetValue = answers[f.visibilityLogic.fieldId]
        const { operator, value } = f.visibilityLogic
        
        switch (operator) {
            case '==': return targetValue === value
            case '!=': return targetValue !== value
            case 'contains': return Array.isArray(targetValue) && targetValue.includes(value)
            default: return true
        }
    })

    pageVisibleFields.forEach(field => {
      // 1. Required Check
      if (field.required && !answers[field.id]) {
        newErrors[field.id] = 'Este campo es obligatorio'
        return
      }

      // 2. Regex Validation
      if (field.validation && answers[field.id]) {
        try {
          const regex = new RegExp(field.validation)
          if (!regex.test(String(answers[field.id]))) {
            newErrors[field.id] = 'Formato inválido'
          }
        } catch (e) {
          console.error('Invalid regex for field:', field.id, e)
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validatePage(currentPage)) {
      if (currentPageIdx < pages.length - 1) {
        setCurrentPageIdx(prev => prev + 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        handleSubmit()
      }
    }
  }

  const handleBack = () => {
    if (currentPageIdx > 0) {
      setCurrentPageIdx(prev => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onSubmit(answers)
    } catch (error) {
      console.error('Submission failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-32 px-4 shadow-sm">
      {/* Header & Progress */}
      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-blue-900/5 border-t-8 border-t-[#0038A8]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 min-w-0 pr-4">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight truncate">
              {definition.title}
            </h1>
            <div className="flex items-center gap-2 mt-1">
               <Layout size={12} className="text-blue-500" />
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.1em]">{currentPage.title}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100/50">
              {currentPageIdx + 1} / {pages.length}
            </span>
          </div>
        </div>
        
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-blue-600 to-blue-800 rounded-full"
          />
        </div>
      </div>

      {/* Form Content */}
      <AnimatePresence mode="wait">
        <motion.div
           key={currentPage.id}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -10 }}
           className="space-y-6"
        >
          {visibleFields.map(field => (
            <DynamicField
              key={field.id}
              field={field}
              value={answers[field.id]}
              onChange={(val) => handleFieldChange(field.id, val)}
              error={errors[field.id]}
            />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Bars */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={handleBack}
            disabled={currentPageIdx === 0 || isSubmitting}
            className={`flex items-center gap-2 px-6 py-4 rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all ${
              currentPageIdx === 0 
                ? 'opacity-0 pointer-events-none' 
                : 'text-slate-500 hover:bg-slate-100 active:scale-95'
            }`}
          >
            <ChevronLeft size={18} /> Atrás
          </button>

          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className="flex-1 max-w-[240px] flex items-center justify-center gap-3 px-8 py-4 bg-[#0038A8] text-white rounded-[24px] font-black uppercase tracking-widest text-[11px] shadow-xl shadow-blue-900/20 active:scale-95 hover:bg-[#002868] transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : currentPageIdx === pages.length - 1 ? (
              <>Guardar <Save size={18} /></>
            ) : (
              <>Siguiente <ChevronRight size={18} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
