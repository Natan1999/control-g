import React, { useRef, useState } from 'react'
import SignaturePad from 'react-signature-canvas'
import { Trash2, CheckCircle, RefreshCcw } from 'lucide-react'

interface SignatureFieldProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

export default function SignatureField({ value, onChange, disabled }: SignatureFieldProps) {
  const sigPad = useRef<SignaturePad | null>(null)
  const [isEmpty, setIsEmpty] = useState(!value)

  const clear = () => {
    sigPad.current?.clear()
    onChange(null)
    setIsEmpty(true)
  }

  const save = () => {
    if (sigPad.current?.isEmpty()) return
    const dataUrl = sigPad.current?.getTrimmedCanvas().toDataURL('image/png')
    if (dataUrl) {
      onChange(dataUrl)
      setIsEmpty(false)
    }
  }

  return (
    <div className="space-y-3">
      {value ? (
        <div className="relative group">
          <img 
            src={value} 
            alt="Firma" 
            className="w-full h-40 bg-white border border-slate-200 rounded-2xl object-contain shadow-inner" 
          />
          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-3">
            <button 
              onClick={clear}
              className="bg-white text-rose-500 font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all text-xs"
            >
              <Trash2 size={16} /> Borrar Firma
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-inner">
            <SignaturePad
              ref={sigPad}
              canvasProps={{
                className: 'w-full h-40 cursor-crosshair',
              }}
              onEnd={save}
            />
          </div>
          <div className="flex items-center justify-between px-2">
            <p className="text-[10px] text-slate-400 font-bold italic">Firma dentro del recuadro</p>
            <div className="flex gap-2">
              <button 
                onClick={clear}
                className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                title="Limpiar"
              >
                <RefreshCcw size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
