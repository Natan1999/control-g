import { useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Filter, Users, AlertCircle, TrendingUp, Circle } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper } from '@/components/shared'

const zones = [
  { id: 'z1', name: 'El Pozón', progress: 72, technicians: 4, forms: 312, color: '#2E86C1', lat: 10.38, lng: -75.48 },
  { id: 'z2', name: 'La Boquilla', progress: 48, technicians: 3, forms: 198, color: '#27AE60', lat: 10.44, lng: -75.49 },
  { id: 'z3', name: 'Nelson Mandela', progress: 31, technicians: 2, forms: 124, color: '#F39C12', lat: 10.40, lng: -75.50 },
  { id: 'z4', name: 'Boston', progress: 85, technicians: 5, forms: 421, color: '#8E44AD', lat: 10.37, lng: -75.46 },
  { id: 'z5', name: 'Henequén', progress: 19, technicians: 2, forms: 78, color: '#E74C3C', lat: 10.42, lng: -75.52 },
]

const techs = [
  { name: 'Ana García', zone: 'El Pozón', status: 'online', forms: 38, lat: 10.381, lng: -75.482 },
  { name: 'Luis Torres', zone: 'Boston', status: 'online', forms: 52, lat: 10.374, lng: -75.463 },
  { name: 'Mónica Reyes', zone: 'La Boquilla', status: 'offline', forms: 29, lat: 10.442, lng: -75.491 },
  { name: 'Jorge Silva', zone: 'Nelson Mandela', status: 'online', forms: 41, lat: 10.400, lng: -75.502 },
]

// Simple SVG map visualization (no external map library needed)
function MapVisualization({ selectedZone, setSelectedZone }: { selectedZone: string | null; setSelectedZone: (id: string | null) => void }) {
  return (
    <div className="relative bg-slate-900 rounded-2xl overflow-hidden h-full min-h-[420px] flex flex-col">
      {/* Map header */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-black/60 backdrop-blur-md text-white text-xs px-3 py-2 rounded-xl border border-white/10">
          📍 Cartagena de Indias, Bolívar · Colombia
        </div>
      </div>

      {/* Simulated map grid */}
      <div className="flex-1 relative overflow-hidden" style={{
        background: 'radial-gradient(circle at 50% 50%, #1e3a5f 0%, #0f1c2e 100%)',
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '30px 30px',
      }}>
        {/* Zone circles */}
        {zones.map((zone, i) => {
          // Convert to relative positions for the SVG-style layout
          const x = ((zone.lng - (-75.55)) / 0.12) * 100
          const y = ((10.46 - zone.lat) / 0.12) * 100
          const isSelected = selectedZone === zone.id
          return (
            <motion.button
              key={zone.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.1, type: 'spring' }}
              onClick={() => setSelectedZone(zone.id === selectedZone ? null : zone.id)}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              {/* Pulse rings */}
              {isSelected && (
                <motion.div
                  animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: zone.color + '60' }}
                />
              )}
              <div
                className={`relative rounded-full flex items-center justify-center border-2 border-white/20 shadow-lg cursor-pointer transition-all ${isSelected ? 'scale-125' : 'hover:scale-110'}`}
                style={{
                  width: Math.max(48, zone.progress / 2.2),
                  height: Math.max(48, zone.progress / 2.2),
                  backgroundColor: zone.color + 'cc',
                }}
              >
                <div className="text-center">
                  <div className="text-white font-black text-xs">{zone.progress}%</div>
                </div>
              </div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-white/80 text-[10px] font-medium bg-black/40 px-2 py-0.5 rounded-md">
                {zone.name}
              </div>
            </motion.button>
          )
        })}

        {/* Technician dots */}
        {techs.map((tech, i) => {
          const x = ((tech.lng - (-75.55)) / 0.12) * 100
          const y = ((10.46 - tech.lat) / 0.12) * 100
          return (
            <motion.div
              key={tech.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div className={`w-3 h-3 rounded-full border-2 border-white shadow-md ${tech.status === 'online' ? 'bg-green-400' : 'bg-gray-400'}`}>
                {tech.status === 'online' && (
                  <motion.div
                    animate={{ scale: [1, 1.8], opacity: [0.7, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-green-400"
                  />
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex items-center gap-4 bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10">
        <div className="flex items-center gap-1.5 text-[10px] text-white/70">
          <span className="w-3 h-3 rounded-full bg-green-400 border border-white/30" />
          Técnico activo
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-white/70">
          <span className="w-3 h-3 rounded-full bg-gray-400 border border-white/30" />
          Offline
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-white/70">
          <span className="w-6 h-6 rounded-full bg-blue-500/70 border border-white/30" />
          Zona (% avance)
        </div>
      </div>
    </div>
  )
}

export default function MapPage() {
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const zone = selectedZone ? zones.find(z => z.id === selectedZone) : null

  return (
    <PageWrapper>
      <TopBar title="Mapa de Campo" subtitle="Visualización geográfica de zonas y técnicos en tiempo real" />
      <div className="p-6 grid lg:grid-cols-3 gap-6 h-[calc(100vh-73px-48px)]">

        {/* Map */}
        <div className="lg:col-span-2 h-full">
          <MapVisualization selectedZone={selectedZone} setSelectedZone={setSelectedZone} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4 overflow-y-auto">
          {/* Zone detail */}
          {zone ? (
            <motion.div key={zone.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="bg-card rounded-2xl border-2 p-5 shadow-sm" style={{ borderColor: zone.color }}>
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <MapPin size={16} style={{ color: zone.color }} />
                {zone.name}
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Avance</span>
                    <span className="font-bold">{zone.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${zone.progress}%` }}
                      className="h-full rounded-full" style={{ backgroundColor: zone.color }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-xl p-3 text-center">
                    <div className="text-xl font-black text-foreground">{zone.technicians}</div>
                    <div className="text-xs text-muted-foreground">Técnicos</div>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3 text-center">
                    <div className="text-xl font-black text-foreground">{zone.forms}</div>
                    <div className="text-xs text-muted-foreground">Formularios</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-muted/30 rounded-2xl p-5 text-center text-muted-foreground text-sm">
              <MapPin size={24} className="mx-auto mb-2 opacity-40" />
              Haz clic en una zona del mapa para ver detalles
            </div>
          )}

          {/* Zone list */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground text-sm">Zonas del proyecto</h3>
              <Filter size={14} className="text-muted-foreground" />
            </div>
            <div className="divide-y divide-border">
              {zones.map(z => (
                <button key={z.id} onClick={() => setSelectedZone(z.id === selectedZone ? null : z.id)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left ${selectedZone === z.id ? 'bg-muted/50' : ''}`}>
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: z.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{z.name}</div>
                    <div className="text-xs text-muted-foreground">{z.forms} forms · {z.technicians} técnicos</div>
                  </div>
                  <div className="text-sm font-black" style={{ color: z.color }}>{z.progress}%</div>
                </button>
              ))}
            </div>
          </div>

          {/* Active techs */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <Users size={14} />
                Técnicos en campo
              </h3>
            </div>
            <div className="divide-y divide-border">
              {techs.map(tech => (
                <div key={tech.name} className="px-4 py-3 flex items-center gap-3">
                  <Circle size={8} className={tech.status === 'online' ? 'text-green-500 fill-green-500' : 'text-gray-400 fill-gray-400'} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{tech.name}</div>
                    <div className="text-xs text-muted-foreground">{tech.zone}</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                    <TrendingUp size={11} />{tech.forms}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
