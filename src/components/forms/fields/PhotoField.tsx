import { useEffect, useState } from 'react'
import { Camera, Image as ImageIcon, Trash2 } from 'lucide-react'

interface PhotoFieldProps {
  value: File | Blob | null
  onChange: (value: File | null) => void
  disabled?: boolean
}

export default function PhotoField({ value, onChange, disabled }: PhotoFieldProps) {
  const [preview, setPreview] = useState<string | null>(null)

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

  return (
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
    </label>
  )
}
