import { useState } from 'react'
import { Camera, FileUp, RefreshCcw, Check, AlertTriangle, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { BottomNav, MobileTopBar } from '@/components/layout/BottomNav'
import { cn, getConfidenceClass, getConfidenceLabel } from '@/lib/utils'

type ScanStep = 'choose' | 'scanning' | 'review'

const mockOCRResult = {
  fields: [
    { key: 'Nombre del jefe de hogar', value: 'Juan Carlos Pérez Martínez', confidence: 0.94 },
    { key: 'Número de cédula', value: '1047382956', confidence: 0.88 },
    { key: 'Número de personas', value: '5', confidence: 0.96 },
    { key: 'Estrato socioeconómico', value: 'Estrato 2', confidence: 0.72 },
    { key: '¿Tiene acceso a internet?', value: 'Sí', confidence: 0.65 },
    { key: 'Servicios públicos', value: 'Agua, Energía, Aseo', confidence: 0.91 },
  ]
}

export default function ScanPage() {
  const [step, setStep] = useState<ScanStep>('choose')
  const [isProcessing, setIsProcessing] = useState(false)
  const [editableValues, setEditableValues] = useState<Record<string, string>>(
    Object.fromEntries(mockOCRResult.fields.map(f => [f.key, f.value]))
  )

  const handleCapture = async (type: 'camera' | 'pdf') => {
    setStep('scanning')
    setIsProcessing(true)
    await new Promise(r => setTimeout(r, 2500))
    setIsProcessing(false)
    setStep('review')
  }

  if (step === 'review') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <MobileTopBar title="Revisión OCR" />
        <div className="flex-1 overflow-y-auto pb-24">
          {/* Scanned image preview */}
          <div
            className="mx-4 mt-4 rounded-2xl h-40 flex items-center justify-center text-white font-medium text-sm"
            style={{ background: 'linear-gradient(135deg, #1A5276, #5DADE2)' }}
          >
            📄 Imagen del formulario escaneado
          </div>

          <div className="px-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm">Datos extraídos por OCR</h2>
              <span className="text-xs text-muted-foreground">Revisa y corrige si es necesario</span>
            </div>

            <div className="space-y-3">
              {mockOCRResult.fields.map(field => (
                <motion.div
                  key={field.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'bg-white rounded-xl border p-4',
                    field.confidence < 0.7 ? 'border-red-200 bg-red-50/30' : 'border-border',
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">{field.key}</span>
                    <span className={getConfidenceClass(field.confidence)}>
                      {getConfidenceLabel(field.confidence)}
                    </span>
                  </div>
                  <input
                    value={editableValues[field.key] || ''}
                    onChange={e => setEditableValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className={cn(
                      'w-full text-sm font-medium bg-transparent border-none outline-none',
                      'border-b pb-1',
                      field.confidence < 0.7 ? 'border-red-300 text-red-700' : 'border-gray-200 text-foreground',
                    )}
                  />
                  {field.confidence < 0.7 && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-red-600">
                      <AlertTriangle size={11} /> Confianza baja — verifica el valor
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setStep('choose')}
                className="flex-1 flex items-center justify-center gap-2 py-3 border border-border rounded-2xl text-sm font-medium"
              >
                <RefreshCcw size={16} /> Re-escanear
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-primary text-white rounded-2xl text-sm font-bold">
                <Check size={16} /> Confirmar <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (step === 'scanning') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-24 h-24 bg-brand-primary/10 rounded-3xl flex items-center justify-center mb-6"
        >
          <Camera size={40} className="text-brand-primary" />
        </motion.div>
        <h2 className="font-bold text-lg text-foreground">Procesando con OCR...</h2>
        <p className="text-sm text-muted-foreground mt-1">Analizando el formulario con IA</p>
        <div className="mt-6 w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand-primary rounded-full"
            animate={{ width: ['0%', '100%'] }}
            transition={{ duration: 2.5, ease: 'easeInOut' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileTopBar title="Escanear Formulario" />

      <div className="flex-1 overflow-y-auto pb-24 px-4 pt-6">
        <p className="text-sm text-muted-foreground text-center mb-6">
          Digitaliza formularios en papel usando la cámara o sube un PDF escaneado
        </p>

        {/* Options */}
        <div className="space-y-4">
          {/* Camera option */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => handleCapture('camera')}
            className="w-full bg-white rounded-2xl border border-border p-6 flex flex-col items-center gap-4 shadow-sm hover:shadow-md hover:border-brand-primary/30 transition-all"
          >
            <div className="w-20 h-20 bg-brand-primary/10 rounded-2xl flex items-center justify-center">
              <Camera size={40} className="text-brand-primary" />
            </div>
            <div>
              <div className="font-bold text-base">Abrir Cámara</div>
              <div className="text-xs text-muted-foreground mt-1 text-center">
                Toma una foto del formulario en papel. La IA corregirá la perspectiva automáticamente.
              </div>
            </div>
            <span className="bg-brand-primary/10 text-brand-primary text-xs font-semibold px-3 py-1.5 rounded-full">
              Recomendado · Alta precisión
            </span>
          </motion.button>

          {/* PDF option */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => handleCapture('pdf')}
            className="w-full bg-white rounded-2xl border border-border p-6 flex flex-col items-center gap-4 shadow-sm hover:shadow-md hover:border-brand-primary/30 transition-all"
          >
            <div className="w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center">
              <FileUp size={40} className="text-orange-500" />
            </div>
            <div>
              <div className="font-bold text-base">Subir PDF Escaneado</div>
              <div className="text-xs text-muted-foreground mt-1 text-center">
                Selecciona un PDF o imagen de tu dispositivo para digitalizar.
              </div>
            </div>
            <span className="bg-orange-50 text-orange-600 text-xs font-semibold px-3 py-1.5 rounded-full">
              PDF · Imágenes (JPG, PNG)
            </span>
          </motion.button>
        </div>

        {/* Tips */}
        <div className="mt-6 bg-blue-50 rounded-2xl p-4 border border-blue-100">
          <h3 className="text-sm font-bold text-blue-800 mb-2">💡 Consejos para mejor resultado</h3>
          <ul className="space-y-1 text-xs text-blue-700">
            <li>• Usa buena iluminación, sin sombras sobre el documento</li>
            <li>• Centra el formulario en el encuadre</li>
            <li>• El formulario debe estar plano (sin dobleces)</li>
            <li>• La escritura debe ser legible y en tinta negra o azul</li>
          </ul>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
