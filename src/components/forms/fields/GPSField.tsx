import React, { useState } from 'react'
import { MapPin, Navigation, Map as MapIcon, RefreshCw, CheckCircle2 } from 'lucide-react'

interface GPSValue {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy: number;
  timestamp: number;
}

interface GPSFieldProps {
  value: GPSValue | null;
  onChange: (value: GPSValue | null) => void;
  disabled?: boolean;
}

export default function GPSField({ value, onChange, disabled }: GPSFieldProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const captureLocation = () => {
    setLoading(true)
    setError(null)

    if (!navigator.geolocation) {
      setError('Geolocalización no soportada en este navegador')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newValue: GPSValue = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitude: pos.coords.altitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp
        }
        onChange(newValue)
        setLoading(false)
      },
      (err) => {
        console.error('GPS Error:', err)
        setError('Error al obtener ubicación. Asegúrate de dar permisos.')
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  return (
    <div className="space-y-4">
      {value ? (
        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-[24px] shadow-sm animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <MapPin size={20} />
              </div>
              <div>
                <h5 className="text-xs font-black text-emerald-700 uppercase tracking-widest">Ubicación Capturada</h5>
                <p className="text-[10px] text-emerald-600 mt-0.5">Precisión: ±{value.accuracy.toFixed(1)}m</p>
              </div>
            </div>
            <button
               onClick={captureLocation}
               disabled={loading || disabled}
               className="p-2.5 bg-white text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors shadow-sm"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white/60 p-3 rounded-2xl">
               <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Latitud</span>
               <code className="text-xs font-black text-slate-800">{value.latitude.toFixed(6)}</code>
             </div>
             <div className="bg-white/60 p-3 rounded-2xl">
               <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Longitud</span>
               <code className="text-xs font-black text-slate-800">{value.longitude.toFixed(6)}</code>
             </div>
          </div>

          <div className="mt-4 pt-4 border-t border-emerald-100/50 flex justify-center">
             <a 
               href={`https://www.google.com/maps?q=${value.latitude},${value.longitude}`} 
               target="_blank" 
               rel="noopener noreferrer"
               className="flex items-center gap-2 text-[10px] font-black text-emerald-700 uppercase tracking-widest hover:underline"
             >
               <MapIcon size={14} /> Ver en el mapa
             </a>
          </div>
        </div>
      ) : (
        <button
          onClick={captureLocation}
          disabled={loading || disabled}
          className="w-full flex flex-col items-center justify-center gap-4 py-10 bg-white border-2 border-dashed border-slate-200 rounded-[32px] hover:border-blue-500 hover:bg-blue-50/30 transition-all group"
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
             loading ? 'bg-blue-100 text-blue-600' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500 group-hover:scale-110'
          }`}>
            <Navigation size={24} className={loading ? 'animate-pulse' : ''} />
          </div>
          <div className="text-center">
            <span className="block text-sm font-black text-slate-800 uppercase tracking-widest mb-1">Capturar GPS</span>
            <p className="text-[10px] text-slate-400 font-medium">Se requiere alta precisión para reporte oficial</p>
          </div>
          {error && <p className="text-[10px] text-rose-500 font-bold px-4">{error}</p>}
        </button>
      )}
    </div>
  )
}
