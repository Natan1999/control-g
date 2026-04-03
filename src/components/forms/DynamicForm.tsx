import { useState, useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { ChevronRight, ChevronLeft, Save, MapPin, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FormSchema, FormField, FormPage } from '@/types/forms'

// Individual field components
import { SignaturePad } from './SignaturePad'
import { PhotoCapture } from './PhotoCapture'
import { RepeatingGroup } from './RepeatingGroup'

interface DynamicFormProps {
  schema: FormSchema
  onSubmit: (data: any, media: any[]) => Promise<void>
  initialData?: any
  onCancel?: () => void
}

export function DynamicForm({ schema, onSubmit, initialData = {}, onCancel }: DynamicFormProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [capturedMedia, setCapturedMedia] = useState<{ id: string; blob: Blob; type: string; name: string }[]>([])
  
  const currentPage = schema.pages[currentPageIndex]
  const isFirstPage = currentPageIndex === 0
  const isLastPage = currentPageIndex === schema.pages.length - 1

  const methods = useForm({
    defaultValues: initialData,
  })

  const { handleSubmit, register, control, watch, setValue, formState: { errors } } = methods

  // Geolocation auto-capture
  useEffect(() => {
    if (schema.settings.auto_capture_gps) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setValue('gps', {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          })
        },
        (err) => console.warn('GPS capture failed', err),
        { enableHighAccuracy: true }
      )
    }
  }, [schema.settings.auto_capture_gps, setValue])

  const handleNext = async () => {
    // Current page validation could go here
    if (!isLastPage) {
      setCurrentPageIndex(prev => prev + 1)
      window.scrollTo(0, 0)
    } else {
      await handleSubmit((data) => internalSubmit(data))()
    }
  }

  const internalSubmit = async (data: any) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data, capturedMedia)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderField = (field: FormField, pathPrefix: string = '') => {
    const fieldPath = pathPrefix ? `${pathPrefix}` : field.id
    
    // Check conditional logic
    if (field.conditional) {
      const targetValue = watch(field.conditional.field_id)
      if (field.conditional.operator === 'is_not_empty' && !targetValue) return null
      if (field.conditional.operator === 'is_empty' && targetValue) return null
      if (field.conditional.operator === 'equals' && targetValue !== field.conditional.value) return null
    }

    switch (field.type) {
      case 'section_title':
        return (
          <div className="py-4 border-b border-gray-100 mb-4 mt-6 first:mt-0">
            <h4 className="text-sm font-black text-brand-dark uppercase tracking-tight">{field.label}</h4>
            {field.help_text && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{field.help_text}</p>}
          </div>
        )

      case 'text_short':
      case 'text_long':
      case 'number':
      case 'date':
        return (
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-foreground/80 flex items-center justify-between">
                {field.label}
                {field.required && <span className="text-red-500 text-[10px] uppercase font-black tracking-widest ml-1 opacity-50">Obligatorio</span>}
            </label>
            <input
              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
              {...register(fieldPath, { required: field.required })}
              placeholder={field.placeholder || field.label}
              className={cn(
                "w-full px-4 py-3 rounded-xl border border-input bg-white text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all",
                errors[fieldPath] && "border-red-500 bg-red-50"
              )}
            />
            {field.help_text && <p className="text-[10px] text-muted-foreground font-medium">{field.help_text}</p>}
          </div>
        )

      case 'single_select':
      case 'yes_no': {
        const options = field.type === 'yes_no' 
          ? [{ value: 'yes', label: 'Sí' }, { value: 'no', label: 'No' }] 
          : field.options || []

        return (
           <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-foreground/80">{field.label}</label>
            <select
                {...register(fieldPath, { required: field.required })}
                className="w-full px-4 py-3 rounded-xl border border-input bg-white text-sm focus:ring-brand-primary outline-none"
            >
                <option value="">Seleccione...</option>
                {options.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
          </div>
        )
      }

      case 'photo':
        return (
          <PhotoCapture 
            label={field.label} 
            maxPhotos={field.max_files} 
            onPhoto={(blob) => {
              const id = `photo_${Date.now()}`
              setCapturedMedia(prev => [...prev, { id, blob, type: blob.type, name: `${field.id}.jpg` }])
              setValue(fieldPath, `LOCAL_MEDIA:${id}`)
            }} 
          />
        )

      case 'signature':
        return (
          <SignaturePad 
            label={field.label} 
            onSave={(blob) => {
               const id = `sig_${Date.now()}`
               setCapturedMedia(prev => [...prev, { id, blob, type: 'image/png', name: 'firma.png' }])
               setValue(fieldPath, `LOCAL_MEDIA:${id}`)
            }} 
          />
        )

      case 'repeating_group':
        return (
          <RepeatingGroup 
            field={field} 
            control={control} 
            register={register} 
            renderField={renderField} 
          />
        )

      default:
        return <div className="text-xs text-red-500">Campo no soportado: {field.type}</div>
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <button onClick={onCancel} className="text-gray-500 p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
            <div className="text-[10px] font-black text-brand-primary uppercase tracking-widest leading-none mb-1">
                Página {currentPageIndex + 1} de {schema.pages.length}
            </div>
            <div className="font-bold text-sm tracking-tight truncate max-w-[180px]">{currentPage.title}</div>
        </div>
        <div className="w-8"></div> {/* Spacer */}
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-gray-100">
        <div 
          className="h-full bg-brand-primary transition-all duration-300"
          style={{ width: `${((currentPageIndex + 1) / schema.pages.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 px-4 py-6 space-y-8">
        {currentPage.description && (
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl">
            <p className="text-xs text-blue-800 leading-relaxed font-medium">{currentPage.description}</p>
          </div>
        )}

        <FormProvider {...methods}>
          <form className="space-y-6">
            {currentPage.fields.map(field => (
              <div key={field.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {renderField(field)}
              </div>
            ))}
          </form>
        </FormProvider>
      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-border flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {!isFirstPage && (
          <Button 
            variant="outline" 
            onClick={() => setCurrentPageIndex(prev => prev - 1)}
            className="flex-1 h-14 rounded-2xl font-bold"
          >
            Anterior
          </Button>
        )}
        <Button 
          onClick={handleNext}
          disabled={isSubmitting}
          className={cn(
            "flex-[2] h-14 rounded-2xl font-black text-sm uppercase tracking-wider",
            isLastPage ? "bg-green-600 hover:bg-green-700" : "bg-brand-primary hover:bg-brand-secondary text-white shadow-lg shadow-brand-primary/20"
          )}
        >
          {isSubmitting ? (
             <Loader2 className="animate-spin mr-2" />
          ) : isLastPage ? (
            <><Save className="mr-2" size={20} /> Guardar Formato</>
          ) : (
            <>Siguiente <ChevronRight className="ml-2" size={20} /></>
          )}
        </Button>
      </div>
    </div>
  )
}
