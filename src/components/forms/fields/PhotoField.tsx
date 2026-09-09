import { useEffect, useState } from 'react'
import { Camera, Image as ImageIcon, Trash2 } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { Camera as NativeCamera, CameraResultType, CameraSource } from '@capacitor/camera'

interface PhotoFieldProps {
  value: File | Blob | null
  onChange: (value: File | null) => void
  disabled?: boolean
}

export default function PhotoField({ value, onChange, disabled }: PhotoFieldProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function takePhoto() {
    setBusy(true)
    setError('')
    try {
      const photo = await NativeCamera.getPhoto({ resultType: CameraResultType.Uri, source: CameraSource.Camera, quality: 80, width: 1920, height: 1920, correctOrientation: true, saveToGallery: false })
      if (!photo.webPath) throw new Error('No se recibió la fotografía')
      const response = await fetch(photo.webPath)
      const blob = await response.blob()
      onChange(new File([blob], `evidencia-${Date.now()}.${photo.format}`, { type: blob.type || `image/${photo.format}` }))
    } catch (cause) {
      if (!/cancel/i.test(String(cause))) setError('No se pudo abrir la cámara. Revisa sus permisos o adjunta una fotografía.')
    } finally { setBusy(false) }
  }

  useEffect(() => {
    if (!(value instanceof Blob)) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(value)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  if (preview) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
        <img src={preview} alt="Evidencia capturada" className="h-56 w-full object-cover" />
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(null)}
          className="absolute right-3 top-3 flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white shadow-lg"
        >
          <Trash2 size={14} /> Repetir
        </button>
      </div>
    )
  }

  return (<div className="space-y-3">
    {Capacitor.isNativePlatform() && <button type="button" disabled={disabled || busy} onClick={() => void takePhoto()} className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#153646] px-4 font-bold text-white"><Camera size={22} />{busy ? 'Abriendo cámara…' : 'Tomar foto con la cámara'}</button>}
    {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
    <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-200 bg-white text-slate-500 transition-colors hover:border-blue-400 hover:bg-blue-50/30">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-700">
        <Camera size={25} />
      </div>
      <div className="text-center">
        <span className="block text-xs font-black uppercase tracking-widest">Tomar fotografía</span>
        <span className="mt-1 flex items-center justify-center gap-1 text-[10px] text-slate-400">
          <ImageIcon size={12} /> Se guarda sin conexión hasta sincronizar
        </span>
      </div>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled}
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0] || null)}
      />
    </label></div>
  )
}
