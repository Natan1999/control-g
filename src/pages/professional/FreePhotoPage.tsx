import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Camera, MapPin, FileText, ChevronLeft, 
  X, Image as ImageIcon, Loader2, Save,
  CheckCircle2, AlertCircle
} from 'lucide-react'
// Removed uuid import, using crypto.randomUUID()
import { localDB } from '@/lib/dexie-db'
import { useAuthStore } from '@/stores/authStore'
import { useSyncStore } from '@/stores/syncStore'
import { Button } from '@/components/ui/button'

export default function FreePhotoPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const incrementPending = useSyncStore(state => state.incrementPending)
  
  const [photos, setPhotos] = useState<{ id: string; url: string; file: File }[]>([])
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-fetch location
  useEffect(() => {
    fetchLocation()
  }, [])

  const fetchLocation = () => {
    if (!navigator.geolocation) return
    
    setIsLoadingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setIsLoadingLocation(false)
      },
      (err) => {
        console.error('Location error:', err)
        setIsLoadingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newPhotos = Array.from(files).map(file => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file),
      file
    }))

    setPhotos(prev => [...prev, ...newPhotos])
    setError(null)
  }

  const removePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id))
  }

  const handleSave = async () => {
    if (photos.length === 0) {
      setError('Debes capturar al menos una fotografía')
      return
    }

    if (!user) return

    setIsSaving(true)
    try {
      const localId = crypto.randomUUID()
      const now = Date.now()

      // 1. Create Form Response entry for the evidence
      await localDB.formResponses.add({
        localId,
        formId: 'free_photo',
        familyId: null, // General evidence
        entityId: user.entityId || 'general',
        professionalId: user.id,
        answers: {
          description,
          location,
          photoCount: photos.length,
          captureType: 'evidence'
        },
        status: 'completed',
        createdAt: now,
        updatedAt: now
      })

      // 2. Add photos to media queue
      for (const photo of photos) {
        await localDB.mediaQueue.add({
          id: crypto.randomUUID(),
          activityLocalId: localId, // Linked to the form response
          file: photo.file,
          name: `evidence_${now}_${photo.id}.jpg`,
          mimeType: photo.file.type || 'image/jpeg',
          bucketId: 'evidence',
          status: 'pending'
        })
      }

      incrementPending()
      
      // Success animation then navigate
      setIsSaving(false)
      navigate('/professional/capture?success=true')
    } catch (err) {
      console.error('Save error:', err)
      setError('Error al guardar la evidencia localmente')
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      {/* Header Area */}
      <div className="bg-[#0038A8] text-white pt-12 pb-8 px-6 rounded-b-[40px] shadow-2xl shadow-blue-900/20 sticky top-0 z-50">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">Captura de Evidencia</h1>
            <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Profesional Control G</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 -mt-4">
        {/* Photo Capture Section */}
        <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-blue-900/5 border border-slate-100">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Camera size={20} />
                </div>
                <h2 className="font-black text-slate-900 uppercase tracking-tight text-sm">Registros Fotográficos</h2>
              </div>
              <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase">
                {photos.length} Fotos
              </span>
           </div>

           {/* Photo Grid */}
           <div className="grid grid-cols-2 gap-4">
              <label className="aspect-square rounded-[24px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 hover:border-blue-300 transition-all active:scale-95 group">
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  multiple 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                  <Camera size={24} />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capturar</span>
              </label>

              <AnimatePresence>
                {photos.map((photo, index) => (
                  <motion.div 
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative aspect-square rounded-[24px] overflow-hidden shadow-md group"
                  >
                    <img 
                      src={photo.url} 
                      alt="Capture" 
                      className="w-full h-full object-cover" 
                    />
                    <button 
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-xl shadow-lg active:scale-75 transition-all"
                    >
                      <X size={14} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/40 backdrop-blur-sm text-white text-[8px] font-black uppercase tracking-widest">
                      Evidencia {index + 1}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
           </div>
        </div>

        {/* Location & Metadata Section */}
        <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-blue-900/5 border border-slate-100">
           <div className="space-y-6">
              {/* Location Badge */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <MapPin size={18} className={location ? 'text-green-500' : 'text-slate-400'} />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ubicación GPS</p>
                    <p className="text-xs font-bold text-slate-900">
                      {isLoadingLocation ? 'Obteniendo coordenadas...' : 
                       location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : 
                       'Sin GPS disponible'}
                    </p>
                  </div>
                </div>
                {location && (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle2 size={12} className="text-white" />
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <FileText size={14} className="text-blue-600" />
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción / Observaciones</label>
                </div>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe la evidencia capturada..."
                  className="w-full h-32 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-slate-300"
                />
              </div>
           </div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 shadow-lg shadow-red-900/5"
          >
            <AlertCircle size={18} />
            <p className="text-xs font-black uppercase tracking-tight">{error}</p>
          </motion.div>
        )}
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-50">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleSave}
            disabled={isSaving || photos.length === 0}
            className="w-full h-14 bg-[#D4AF37] text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-[#D4AF37]/30 active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-[#B8962D] disabled:opacity-50 disabled:grayscale"
          >
            {isSaving ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                Guardar Evidencia <Save size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
