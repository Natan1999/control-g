import { useEffect, useMemo, useRef, useState } from 'react'
import { Geolocation, type Position } from '@capacitor/geolocation'
import { CheckCircle2, LocateFixed, Pause, Play, RotateCcw, Undo2 } from 'lucide-react'
import {
  buildCapturedGeometry,
  geometryCaptureIsComplete,
  geometryMinimumVertices,
  haversineMeters,
  lineLengthMeters,
  polygonAreaSquareMeters,
} from '@/lib/geometry-capture'
import type { CapturedGeometryValue, CapturedGeometryVertex, GeoJsonPosition } from '@/types/gis'

interface GeometryCaptureFieldProps {
  captureType: 'geotrace' | 'geoshape'
  value: CapturedGeometryValue | null
  onChange: (value: CapturedGeometryValue | null) => void
  disabled?: boolean
}

const MAX_VERTICES = 2_000

function formatDistance(meters: number) {
  return meters >= 1_000 ? `${(meters / 1_000).toFixed(2)} km` : `${Math.round(meters)} m`
}

function formatArea(squareMeters: number) {
  return squareMeters >= 10_000 ? `${(squareMeters / 10_000).toFixed(2)} ha` : `${Math.round(squareMeters)} m²`
}

function previewPoints(coordinates: GeoJsonPosition[]) {
  if (!coordinates.length) return ''
  const longitudes = coordinates.map(point => point[0])
  const latitudes = coordinates.map(point => point[1])
  const minLongitude = Math.min(...longitudes)
  const maxLongitude = Math.max(...longitudes)
  const minLatitude = Math.min(...latitudes)
  const maxLatitude = Math.max(...latitudes)
  const longitudeSpan = Math.max(maxLongitude - minLongitude, 0.00001)
  const latitudeSpan = Math.max(maxLatitude - minLatitude, 0.00001)
  return coordinates.map(([longitude, latitude]) => {
    const x = 18 + ((longitude - minLongitude) / longitudeSpan) * 264
    const y = 142 - ((latitude - minLatitude) / latitudeSpan) * 124
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

export default function GeometryCaptureField({ captureType, value, onChange, disabled }: GeometryCaptureFieldProps) {
  const [tracking, setTracking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const watchId = useRef<string | null>(null)
  const verticesRef = useRef<CapturedGeometryVertex[]>(value?.vertices || [])
  const minimum = geometryMinimumVertices(captureType)
  const vertices = value?.vertices || []
  const coordinates = useMemo(() => value?.coordinates || [], [value?.coordinates])
  const complete = geometryCaptureIsComplete(value, captureType)
  const lineLength = useMemo(() => lineLengthMeters(coordinates), [coordinates])
  const area = useMemo(() => captureType === 'geoshape' ? polygonAreaSquareMeters(coordinates) : 0, [captureType, coordinates])
  const points = useMemo(() => previewPoints(coordinates), [coordinates])

  useEffect(() => { verticesRef.current = value?.vertices || [] }, [value?.vertices])
  useEffect(() => () => {
    if (watchId.current) void Geolocation.clearWatch({ id: watchId.current })
  }, [])

  function appendPosition(position: Position) {
    const latitude = Number(position.coords.latitude)
    const longitude = Number(position.coords.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (latitude === 0 && longitude === 0)) {
      setError('El GPS entregó una coordenada inválida. Intenta nuevamente en un lugar con mejor señal.')
      return
    }
    const current = verticesRef.current
    if (current.length >= MAX_VERTICES) {
      setError(`Se alcanzó el límite seguro de ${MAX_VERTICES.toLocaleString('es-CO')} vértices.`)
      void stopTracking()
      return
    }
    const last = current[current.length - 1]
    if (last && haversineMeters([last.longitude, last.latitude], [longitude, latitude]) < 3
      && position.timestamp - last.timestamp < 5_000) return
    const next = [...current, {
      latitude,
      longitude,
      accuracyM: Number.isFinite(position.coords.accuracy) ? Number(position.coords.accuracy) : null,
      altitudeM: Number.isFinite(position.coords.altitude) ? Number(position.coords.altitude) : null,
      timestamp: Number(position.timestamp || Date.now()),
    }]
    verticesRef.current = next
    onChange(buildCapturedGeometry(captureType, next, value))
    setError('')
  }

  async function captureVertex() {
    setBusy(true)
    setError('')
    try {
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 })
      appendPosition(position)
    } catch (captureError) {
      console.error('Geometry GPS capture failed:', captureError)
      setError('No fue posible capturar el vértice. Verifica el permiso y la señal GPS.')
    } finally { setBusy(false) }
  }

  async function startTracking() {
    if (captureType !== 'geotrace' || disabled) return
    setError('')
    try {
      const id = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 2_000 },
        (position, watchError) => {
          if (watchError) setError('El seguimiento GPS se interrumpió; los vértices capturados siguen guardados.')
          else if (position) appendPosition(position)
        },
      )
      watchId.current = id
      setTracking(true)
    } catch (trackingError) {
      console.error('Geometry GPS tracking failed:', trackingError)
      setError('No fue posible iniciar el recorrido GPS.')
    }
  }

  async function stopTracking() {
    const id = watchId.current
    watchId.current = null
    setTracking(false)
    if (id) await Geolocation.clearWatch({ id }).catch(() => undefined)
  }

  function undo() {
    const next = verticesRef.current.slice(0, -1)
    verticesRef.current = next
    onChange(next.length ? buildCapturedGeometry(captureType, next, value) : null)
  }

  function reset() {
    void stopTracking()
    verticesRef.current = []
    onChange(null)
    setError('')
  }

  const maximumAccuracy = vertices.length ? Math.max(...vertices.map(vertex => Number(vertex.accuracyM || 0))) : 0

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#EAF1F2]">
        <svg viewBox="0 0 300 160" className="h-40 w-full" role="img" aria-label={`Vista previa con ${vertices.length} vértices GPS`}>
          <defs><pattern id={`geometry-grid-${captureType}`} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#BFD0D3" strokeWidth="0.8" /></pattern></defs>
          <rect width="300" height="160" fill={`url(#geometry-grid-${captureType})`} />
          {coordinates.length > 1 && (captureType === 'geoshape'
            ? <polygon points={points} fill="#3D7B9E" fillOpacity="0.2" stroke="#1B3A4B" strokeWidth="3" />
            : <polyline points={points} fill="none" stroke="#1B3A4B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />)}
          {points.split(' ').filter(Boolean).map((point, index) => {
            const [cx, cy] = point.split(',')
            return <circle key={`${cx}:${cy}:${index}`} cx={cx} cy={cy} r="5" fill={index === 0 ? '#2F855A' : '#3D7B9E'} stroke="white" strokeWidth="2" />
          })}
          {!vertices.length && <text x="150" y="78" textAnchor="middle" fill="#64748B" fontSize="12" fontWeight="700">Captura el primer vértice con GPS</text>}
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-slate-50 p-2"><span className="block text-slate-400">Vértices</span><strong className="mt-1 block text-slate-800">{vertices.length}</strong></div>
        <div className="rounded-xl bg-slate-50 p-2"><span className="block text-slate-400">{captureType === 'geoshape' ? 'Perímetro' : 'Longitud'}</span><strong className="mt-1 block text-slate-800">{formatDistance(lineLength + (captureType === 'geoshape' && coordinates.length > 2 ? haversineMeters(coordinates[coordinates.length - 1], coordinates[0]) : 0))}</strong></div>
        <div className="rounded-xl bg-slate-50 p-2"><span className="block text-slate-400">{captureType === 'geoshape' ? 'Área' : 'Precisión máx.'}</span><strong className="mt-1 block text-slate-800">{captureType === 'geoshape' ? formatArea(area) : maximumAccuracy ? `±${maximumAccuracy.toFixed(0)} m` : '—'}</strong></div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button type="button" disabled={disabled || busy || tracking} onClick={() => void captureVertex()} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1B3A4B] px-3 text-xs font-black text-white disabled:opacity-50"><LocateFixed size={17} /> {busy ? 'Capturando…' : 'Vértice'}</button>
        {captureType === 'geotrace' && (tracking
          ? <button type="button" disabled={disabled} onClick={() => void stopTracking()} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-100 px-3 text-xs font-black text-amber-900"><Pause size={17} /> Detener</button>
          : <button type="button" disabled={disabled} onClick={() => void startTracking()} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-100 px-3 text-xs font-black text-emerald-900"><Play size={17} /> Recorrido</button>)}
        <button type="button" disabled={disabled || !vertices.length || tracking} onClick={undo} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-700 disabled:opacity-40"><Undo2 size={16} /> Deshacer</button>
        <button type="button" disabled={disabled || !vertices.length} onClick={reset} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-700 disabled:opacity-40"><RotateCcw size={16} /> Limpiar</button>
      </div>

      <div className={`flex items-start gap-2 rounded-xl border p-3 text-xs leading-5 ${complete ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
        {complete
          ? `${captureType === 'geoshape' ? 'Polígono' : 'Recorrido'} válido y guardado en el borrador offline.`
          : `Faltan ${Math.max(0, minimum - vertices.length)} vértices para completar esta geometría.`}
      </div>
      {maximumAccuracy > 50 && <p className="text-xs font-semibold text-amber-800">La precisión máxima supera 50 m. Conservamos el dato original y recomendamos recapturar los vértices con menor incertidumbre.</p>}
      {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
    </div>
  )
}
