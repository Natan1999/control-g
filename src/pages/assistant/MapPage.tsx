import { useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Users, Circle, Search, Filter, TrendingUp } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper } from '@/components/shared'

const zones = [
  { id: 'z1', name: 'Arjona', progress: 72, technicians: 4, forms: 312, color: '#2E86C1' },
  { id: 'z2', name: 'Turbaco', progress: 48, technicians: 3, forms: 198, color: '#27AE60' },
  { id: 'z3', name: 'Mahates', progress: 31, technicians: 2, forms: 124, color: '#F39C12' },
]

const techs = [
  { name: 'Ana García', zone: 'El Pozón', status: 'online', forms: 38 },
  { name: 'Jorge Silva', zone: 'Nelson Mandela', status: 'online', forms: 41 },
  { name: 'Mónica Reyes', zone: 'La Boquilla', status: 'offline', forms: 29 },
]

export default function AssistMapPage() {
  const [selectedZone, setSelectedZone] = useState<string | null>(null)

  return (
    <PageWrapper>
      <TopBar title="Mapa de Campo" subtitle="Seguimiento de técnicos asignados a tu cargo" />
      <div className="p-6 grid lg:grid-cols-3 gap-6 h-[calc(100vh-73px-48px)]">

        {/* Map visualization */}
        <div className="lg:col-span-2 h-full">
          <div className="relative bg-slate-900 rounded-2xl overflow-hidden h-full min-h-[360px]" style={{
            background: 'radial-gradient(circle at 50% 50%, #1e3a5f 0%, #0f1c2e 100%)',
            backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: '30px 30px',
          }}>
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-2 rounded-xl border border-white/10">
              📍 Zona asignada: Bolívar Norte
            </div>
            {zones.map((zone, i) => {
              const positions = [{ x: 35, y: 55 }, { x: 60, y: 30 }, { x: 50, y: 65 }]
              const pos = positions[i]
              return (
                <motion.button key={zone.id} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1, type: 'spring' }}
                  onClick={() => setSelectedZone(zone.id === selectedZone ? null : zone.id)}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
                  <div className="relative rounded-full flex items-center justify-center border-2 border-white/20 shadow-lg cursor-pointer transition-all hover:scale-110"
                    style={{ width: 60, height: 60, backgroundColor: zone.color + 'cc' }}>
                    <div className="text-white font-black text-xs">{zone.progress}%</div>
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-white/80 text-[10px] font-medium bg-black/40 px-2 py-0.5 rounded-md">
                    {zone.name}
                  </div>
                </motion.button>
              )
            })}
            {techs.filter(t => t.status === 'online').map((tech, i) => {
              const dots = [{ x: 42, y: 48 }, { x: 55, y: 60 }]
              if (i >= dots.length) return null
              return (
                <motion.div key={tech.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.1 }}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${dots[i].x}%`, top: `${dots[i].y}%` }}>
                  <div className="w-3 h-3 rounded-full bg-green-400 border-2 border-white shadow-md" />
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Status panel */}
        <div className="space-y-4 overflow-y-auto">
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2"><Users size={14} />Mis técnicos</h3>
            </div>
            <div className="divide-y divide-border">
              {techs.map(tech => (
                <div key={tech.name} className="px-4 py-3.5 flex items-center gap-3">
                  <Circle size={8} className={tech.status === 'online' ? 'text-green-500 fill-green-500' : 'text-gray-400 fill-gray-400'} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{tech.name}</div>
                    <div className="text-xs text-muted-foreground">{tech.zone} · {tech.status === 'online' ? 'Activo' : 'Sin señal'}</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold">
                    <TrendingUp size={11} className="text-muted-foreground" />{tech.forms}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2"><MapPin size={14} />Zonas</h3>
            </div>
            <div className="divide-y divide-border">
              {zones.map(z => (
                <div key={z.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: z.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{z.name}</div>
                    <div className="text-xs text-muted-foreground">{z.forms} formularios · {z.technicians} técnicos</div>
                  </div>
                  <span className="text-sm font-black" style={{ color: z.color }}>{z.progress}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
