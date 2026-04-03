import { useState } from 'react'
import { Camera, X, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PhotoCaptureProps {
  onPhoto: (blob: Blob) => void
  label?: string
  maxPhotos?: number
}

export function PhotoCapture({ onPhoto, label, maxPhotos = 1 }: PhotoCaptureProps) {
  const [previews, setPreviews] = useState<string[]>([])

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        setPreviews(prev => [...prev, event.target?.result as string])
      }
    }
    reader.readAsDataURL(file)

    // Save as blob for storage
    onPhoto(file)
  }

  const removePhoto = (index: number) => {
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {label && <label className="text-sm font-semibold">{label}</label>}
      
      <div className="grid grid-cols-2 gap-3">
        {previews.map((src, i) => (
          <div key={i} className="relative aspect-video rounded-2xl overflow-hidden border-2 border-brand-primary">
            <img src={src} className="w-full h-full object-cover" alt="Capture preview" />
            <button 
              onClick={() => removePhoto(i)}
              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        
        {previews.length < maxPhotos && (
          <label className={cn(
            "aspect-video rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors",
            "active:scale-95 duration-75"
          )}>
            <Camera className="text-muted-foreground mb-2" size={24} />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tomar Foto</span>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              onChange={handleCapture}
            />
          </label>
        )}
      </div>
    </div>
  )
}
