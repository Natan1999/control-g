import { ClipboardList, CheckCircle, Cloud, TrendingUp, Plus, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { BottomNav, MobileTopBar } from '@/components/layout/BottomNav'
import { useAuthStore } from '@/stores/authStore'
import { useSyncStore } from '@/stores/syncStore'
import { cn } from '@/lib/utils'

const recentForms = [
  { id: 'loc-001', name: 'Ficha Socioeconómica', zone: 'El Pozón', status: 'synced', time: 'Hace 15 min' },
  { id: 'loc-002', name: 'Ficha Socioeconómica', zone: 'El Pozón', status: 'syncing', time: 'Hace 1h' },
  { id: 'loc-003', name: 'Ficha Socioeconómica', zone: 'El Pozón', status: 'offline', time: 'Hace 2h' },
]

const statusConfig = {
  synced: { label: 'Sincronizado', color: 'text-green-600', bg: 'bg-green-50' },
  syncing: { label: 'Enviando...', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  offline: { label: 'Pendiente', color: 'text-red-500', bg: 'bg-red-50' },
}

export default function FieldHome() {
  const { user } = useAuthStore()
  const { pendingCount } = useSyncStore()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileTopBar />

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Hero greeting */}
        <div
          className="px-5 pt-5 pb-8"
          style={{ background: 'linear-gradient(135deg, #1A5276 0%, #2E86C1 100%)' }}
        >
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-blue-200 text-sm">Buenos días 👋</p>
            <h1 className="text-white text-2xl font-black mt-0.5">{user?.fullName?.split(' ')[0]}</h1>
            <p className="text-blue-200 text-sm mt-1">Zona El Pozón — Cartagena</p>
          </motion.div>

          {/* Active project card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 bg-white/15 backdrop-blur-sm rounded-2xl p-4"
          >
            <div className="text-white/70 text-xs font-medium mb-1">Proyecto activo</div>
            <div className="text-white font-bold">Caracterización Socioeconómica Cartagena</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full w-[37%] bg-white rounded-full" />
              </div>
              <span className="text-white/80 text-xs">37%</span>
            </div>
          </motion.div>
        </div>

        {/* Metrics grid */}
        <div className="px-4 -mt-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl shadow-md border border-border overflow-hidden"
          >
            <div className="grid grid-cols-2 divide-x divide-y divide-border">
              {[
                { label: 'Asignados', value: '45', icon: <ClipboardList size={16} />, color: 'text-blue-500' },
                { label: 'Completados hoy', value: '12', icon: <CheckCircle size={16} />, color: 'text-green-500' },
                { label: 'Pendientes sync', value: pendingCount, icon: <Cloud size={16} />, color: pendingCount > 0 ? 'text-red-500' : 'text-gray-400' },
                { label: 'Mi avance', value: '27%', icon: <TrendingUp size={16} />, color: 'text-orange-500' },
              ].map((m, i) => (
                <div key={i} className="p-4">
                  <div className={cn('flex items-center gap-1.5 text-xs font-medium mb-0.5', m.color)}>
                    {m.icon} {m.label}
                  </div>
                  <div className="text-2xl font-black text-foreground">{m.value}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-4 mt-5"
        >
          <button className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 shadow-md active:scale-98 transition-transform">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
              <Plus size={20} />
            </div>
            Iniciar nuevo formulario
          </button>
        </motion.div>

        {/* Recent forms */}
        <div className="mx-4 mt-6">
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center justify-between">
            Últimos formularios
            <button className="text-xs text-brand-primary font-medium">Ver todos</button>
          </h2>
          <div className="space-y-2.5">
            {recentForms.map((form, i) => {
              const cfg = statusConfig[form.status as keyof typeof statusConfig]
              return (
                <motion.div
                  key={form.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.08 }}
                  className="bg-white rounded-xl border border-border p-4 flex items-center gap-3 hover:shadow-sm transition-shadow"
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg)}>
                    <ClipboardList size={18} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{form.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{form.zone} · {form.time}</div>
                  </div>
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0', cfg.bg, cfg.color)}>
                    {cfg.label}
                  </span>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Notifications */}
        <div className="mx-4 mt-6 mb-4">
          <h2 className="text-sm font-bold text-foreground mb-3">Notificaciones</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Cloud size={16} className="text-yellow-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-yellow-800">Formularios pendientes de sync</div>
              <div className="text-xs text-yellow-700 mt-0.5">Conecta a WiFi para sincronizar {pendingCount} formularios</div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
