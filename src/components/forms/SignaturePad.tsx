import { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Eraser, Check, Undo } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SignaturePadProps {
  onSave: (blob: Blob) => void
  onClear?: () => void
  label?: string
}

export function SignaturePad({ onSave, onClear, label }: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  const clear = () => {
    sigCanvas.current?.clear()
    setIsEmpty(true)
    onClear?.()
  }

  const save = () => {
    if (sigCanvas.current?.isEmpty()) return
    
    // Get as blob for storage
    const canvas = sigCanvas.current?.getTrimmedCanvas()
    canvas?.toBlob((blob) => {
      if (blob) onSave(blob)
    }, 'image/png')
  }

  return (
    <div className="space-y-3">
      {label && <label className="text-sm font-semibold">{label}</label>}
      <div className="border-2 border-dashed border-gray-300 rounded-2xl bg-white overflow-hidden">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="black"
          canvasProps={{
            className: 'w-full h-48 touch-none',
          }}
          onBegin={() => setIsEmpty(false)}
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clear}
          className="flex-1 rounded-xl h-10"
        >
          <Eraser size={16} className="mr-2" /> Borrar
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isEmpty}
          onClick={save}
          className="flex-1 rounded-xl h-10 bg-brand-primary hover:bg-brand-secondary"
        >
          <Check size={16} className="mr-2" /> Confirmar Firma
        </Button>
      </div>
    </div>
  )
}
