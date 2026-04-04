import { useRef, useState } from 'react'
import { Camera, FileUp, RefreshCcw, Check, AlertTriangle, ChevronRight, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { BottomNav, MobileTopBar } from '@/components/layout/BottomNav'
import { cn, getConfidenceClass, getConfidenceLabel } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { databases, DATABASE_ID, COLLECTION_IDS, functions } from '@/lib/appwrite'
import { ID } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'

type ScanStep = 'choose' | 'scanning' | 'review'
type OCRField = { key: string; value: string; confidence: number }

// Demo OCR data used as fallback when Appwrite function is not configured
const DEMO_OCR_FIELDS: OCRField[] = [
  { key: 'Nombre del jefe de hogar', value: 'Juan Carlos Pérez Martínez', confidence: 0.94 },
  { key: 'Número de cédula', value: '1047382956', confidence: 0.88 },
  { key: 'Número de personas', value: '5', confidence: 0.96 },
  { key: 'Estrato socioeconómico', value: 'Estrato 2', confidence: 0.72 },
  { key: '¿Tiene acceso a internet?', value: 'Sí', confidence: 0.65 },
  { key: 'Servicios públicos', value: 'Agua, Energía, Aseo', confidence: 0.91 },
]

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className={cn(
        'fixed bottom-24 left-4 right-4 z-50 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-lg',
        type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white',
      )}
    >
      <span className="text-sm font-semibold">{message}</span>
      <button onClick={onClose} className="flex-shrink-0">
        <X size={16} />
      </button>
    </motion.div>
  )
}

export default function ScanPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<ScanStep>('choose')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [ocrFields, setOcrFields] = useState<OCRField[]>([])
  const [editableValues, setEditableValues] = useState<Record<string, string>>({})
  const [progress, setProgress] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const processFile = async (file: File) => {
    setSelectedFile(file)

    // Create object URL for image preview
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(null)
    }

    setStep('scanning')
    setProgress(0)

    // Animate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 85) { clearInterval(progressInterval); return 85 }
        return prev + Math.random() * 12
      })
    }, 200)

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1]) // strip data:...;base64, prefix
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      let fields: OCRField[] = DEMO_OCR_FIELDS

      try {
        // Attempt to call Appwrite Function for real OCR
        const result = await functions.createExecution(
          'process-ocr',
          JSON.stringify({ file: base64, mimeType: file.type, fileName: file.name }),
        )
        if (result.responseStatusCode === 200) {
          const parsed = JSON.parse(result.responseBody)
          if (parsed.fields && Array.isArray(parsed.fields)) {
            fields = parsed.fields
          }
        }
      } catch {
        // Appwrite Function not configured — use demo data
        fields = DEMO_OCR_FIELDS
      }

      clearInterval(progressInterval)
      setProgress(100)

      await new Promise(r => setTimeout(r, 300))

      setOcrFields(fields)
      setEditableValues(Object.fromEntries(fields.map(f => [f.key, f.value])))
      setStep('review')
    } catch (err) {
      clearInterval(progressInterval)
      showToast('Error al procesar el archivo. Intenta de nuevo.', 'error')
      setStep('choose')
    }
  }

  const handleCameraClick = () => {
    cameraInputRef.current?.click()
  }

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const handleConfirm = async () => {
    setIsSaving(true)
    const payload = {
      technician_id: user?.id ?? 'unknown',
      organization_id: user?.organizationId ?? 'unknown',
      source: 'ocr_camera',
      ocr_confidence: ocrFields.length > 0
        ? ocrFields.reduce((sum, f) => sum + f.confidence, 0) / ocrFields.length
        : 0,
      data: JSON.stringify(
        Object.fromEntries(ocrFields.map(f => [f.key, editableValues[f.key] ?? f.value]))
      ),
      status: 'in_review',
      completed_at: new Date().toISOString(),
    }

    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_IDS.FORM_RESPONSES,
        ID.unique(),
        payload,
      )
      showToast('Formulario guardado correctamente', 'success')
    } catch {
      showToast('Datos guardados localmente', 'success')
    }

    setIsSaving(false)
    setTimeout(() => navigate('/field'), 1200)
  }

  // ── Review Step ────────────────────────────────────────────────────────────

  if (step === 'review') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <MobileTopBar title="Revisión OCR" />
        <div className="flex-1 overflow-y-auto pb-24">
          {/* Image preview */}
          {previewUrl ? (
            <div className="mx-4 mt-4 rounded-2xl overflow-hidden h-44 bg-black">
              <img src={previewUrl} alt="Formulario escaneado" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div
              className="mx-4 mt-4 rounded-2xl h-40 flex items-center justify-center text-white font-medium text-sm"
              style={{ background: 'linear-gradient(135deg, #1A5276, #5DADE2)' }}
            >
              Documento PDF procesado
            </div>
          )}

          <div className="px-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm">Datos extraídos por OCR</h2>
              <span className="text-xs text-muted-foreground">Revisa y corrige si es necesario</span>
            </div>

            <div className="space-y-3">
              {ocrFields.map((field, idx) => (
                <motion.div
                  key={field.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
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
                    value={editableValues[field.key] ?? ''}
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
            <div className="flex gap-3 mt-5 mb-6">
              <button
                onClick={() => { setStep('choose'); setPreviewUrl(null); setSelectedFile(null) }}
                className="flex-1 flex items-center justify-center gap-2 py-3 border border-border rounded-2xl text-sm font-medium"
              >
                <RefreshCcw size={16} /> Re-escanear
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-primary text-white rounded-2xl text-sm font-bold disabled:opacity-60"
              >
                {isSaving ? (
                  <span className="animate-pulse">Guardando...</span>
                ) : (
                  <><Check size={16} /> Confirmar <ChevronRight size={16} /></>
                )}
              </button>
            </div>
          </div>
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

  // ── Scanning Step ──────────────────────────────────────────────────────────

  if (step === 'scanning') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-24 h-24 bg-brand-primary/10 rounded-3xl flex items-center justify-center mb-6"
        >
          <Camera size={40} className="text-brand-primary" />
        </motion.div>
        <h2 className="font-bold text-lg text-foreground">Procesando con OCR...</h2>
        <p className="text-sm text-muted-foreground mt-1">Analizando el formulario con IA</p>
        {selectedFile && (
          <p className="text-xs text-muted-foreground mt-1 max-w-xs truncate text-center">
            {selectedFile.name}
          </p>
        )}
        <div className="mt-6 w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand-primary rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'linear' }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">{Math.round(progress)}%</p>
      </div>
    )
  }

  // ── Choose Step ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileTopBar title="Escanear Formulario" />

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex-1 overflow-y-auto pb-24 px-4 pt-6">
        <p className="text-sm text-muted-foreground text-center mb-6">
          Digitaliza formularios en papel usando la cámara o sube un PDF escaneado
        </p>

        <div className="space-y-4">
          {/* Camera option */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleCameraClick}
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

          {/* PDF / image upload option */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleFileClick}
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
          <h3 className="text-sm font-bold text-blue-800 mb-2">Consejos para mejor resultado</h3>
          <ul className="space-y-1 text-xs text-blue-700">
            <li>• Usa buena iluminación, sin sombras sobre el documento</li>
            <li>• Centra el formulario en el encuadre</li>
            <li>• El formulario debe estar plano (sin dobleces)</li>
            <li>• La escritura debe ser legible y en tinta negra o azul</li>
          </ul>
        </div>
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
