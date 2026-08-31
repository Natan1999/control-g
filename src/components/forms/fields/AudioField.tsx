import { useEffect, useRef, useState } from 'react'
import { Loader2, Mic, Square, Trash2, Volume2 } from 'lucide-react'

interface AudioFieldProps {
  value: Blob | string | null
  onChange: (value: Blob | null) => void
  disabled?: boolean
  maxDurationSeconds?: number
}

function preferredMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  return ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg']
    .find(type => MediaRecorder.isTypeSupported(type)) || ''
}

function durationLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`
}

export default function AudioField({
  value,
  onChange,
  disabled,
  maxDurationSeconds = 300,
}: AudioFieldProps) {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<number | null>(null)
  const [recording, setRecording] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [localUrl, setLocalUrl] = useState('')

  useEffect(() => {
    if (!(value instanceof Blob)) {
      setLocalUrl('')
      return
    }
    const nextUrl = URL.createObjectURL(value)
    setLocalUrl(nextUrl)
    return () => URL.revokeObjectURL(nextUrl)
  }, [value])

  useEffect(() => () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current)
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    streamRef.current?.getTracks().forEach(track => track.stop())
  }, [])

  const stopRecording = () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current)
    intervalRef.current = null
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  const startRecording = async () => {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Este dispositivo no ofrece grabación de audio compatible.')
      return
    }
    setRequesting(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      setElapsed(0)
      const mimeType = preferredMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      recorderRef.current = recorder
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onerror = () => setError('La grabación se interrumpió. Intenta nuevamente.')
      recorder.onstop = () => {
        const recordedType = (recorder.mimeType || mimeType || 'audio/webm').split(';')[0]
        const recorded = new Blob(chunksRef.current, { type: recordedType })
        if (recorded.size > 0) onChange(recorded)
        streamRef.current?.getTracks().forEach(track => track.stop())
        streamRef.current = null
        recorderRef.current = null
        setRecording(false)
      }
      recorder.start(1_000)
      setRecording(true)
      intervalRef.current = window.setInterval(() => {
        setElapsed(previous => {
          const next = previous + 1
          if (next >= maxDurationSeconds) window.setTimeout(stopRecording, 0)
          return Math.min(next, maxDurationSeconds)
        })
      }, 1_000)
    } catch (captureError) {
      console.error('Audio permission or capture failed:', captureError)
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
      setError('No fue posible acceder al micrófono. Revisa el permiso de la aplicación.')
    } finally {
      setRequesting(false)
    }
  }

  return (
    <div className="space-y-3">
      {recording ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-black text-rose-800"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-600" /> Grabando audio</p>
              <p className="mt-1 text-[11px] text-rose-700">{durationLabel(elapsed)} / {durationLabel(maxDurationSeconds)}</p>
            </div>
            <button type="button" onClick={stopRecording} className="flex min-h-11 items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-xs font-black text-white">
              <Square size={15} fill="currentColor" /> Detener
            </button>
          </div>
        </div>
      ) : value ? (
        <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="flex items-center gap-2 text-xs font-black text-blue-900"><Volume2 size={17} /> Audio guardado offline</p>
          {(localUrl || typeof value === 'string') && <audio controls preload="metadata" src={localUrl || String(value)} className="w-full" />}
          <div className="flex items-center justify-between gap-3 text-[11px] text-blue-800">
            <span>{value instanceof Blob ? `${(value.size / 1_000_000).toFixed(2)} MB · pendiente de sincronización` : 'Evidencia sincronizada'}</span>
            {!disabled && <button type="button" onClick={() => onChange(null)} className="flex items-center gap-1 font-black text-rose-700"><Trash2 size={14} /> Quitar</button>}
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || requesting}
          onClick={() => void startRecording()}
          className="flex min-h-24 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 text-center text-xs font-bold text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
        >
          {requesting ? <Loader2 size={25} className="mb-2 animate-spin text-blue-700" /> : <Mic size={25} className="mb-2 text-blue-700" />}
          {requesting ? 'Solicitando acceso al micrófono…' : 'Grabar evidencia de audio'}
          <span className="mt-1 text-[10px] font-medium text-slate-400">Máximo {Math.ceil(maxDurationSeconds / 60)} min · funciona sin internet</span>
        </button>
      )}
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700">{error}</p>}
    </div>
  )
}
