import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, CheckCircle, Cloud, TrendingUp, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { BottomNav, MobileTopBar } from '@/components/layout/BottomNav'
import { useAuthStore } from '@/stores/authStore'
import { useSyncStore } from '@/stores/syncStore'
import { localDB, type LocalResponse } from '@/lib/dexie-db'
import { cn } from '@/lib/utils'

const statusConfig = {
  synced:  { label: 'Sincronizado', color: 'text-green-600', bg: 'bg-green-50' },
  syncing: { label: 'Enviando...',  color: 'text-yellow-600', bg: 'bg-yellow-50' },
  pending: { label: 'Pendiente',   color: 'text-red-500',    bg: 'bg-red-50' },
  failed:  { label: 'Error',       color: 'text-red-500',    bg: 'bg-red-50' },
}

type SyncStatus = keyof typeof statusConfig

function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Hace un momento'
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `Hace ${days}d`
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export default function FieldHome() {
  const { user } = useAuthStore()
  const { pendingCount } = useSyncStore()
  const navigate = useNavigate()

  const [recentForms, setRecentForms] = useState<LocalResponse[]>([])
  const [assignedCount, setAssignedCount] = useState<number>(0)
  const [completedToday, setCompletedToday] = useState<number>(0)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        // Últimas 3 respuestas ordenadas por created_at desc
        const recent = await localDB.responses
          .orderBy('created_at')
          .reverse()
          .limit(3)
          .toArray()

        // Total de formularios asignados (cacheados en Dexie)
        const total = await localDB.forms.count()

        // Completados hoy: respuestas con completed_at == hoy
        const allResponses = await localDB.responses.toArray()
        const todayCount = allResponses.filter(r => isToday(r.completed_at)).length

        if (!cancelled) {
          setRecentForms(recent)
          setAssignedCount(total)
          setCompletedToday(todayCount)
        }
      } catch {
        // Si Dexie falla, dejamos los valores en 0 / vacío
      } finally {
        if (!cancelled) setLoadingData(false)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [])

  const progress = assignedCount > 0
    ? Math.round((completedToday / assignedCount) * 100)
    : 0

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
            <p className="text-blue-200 text-sm">Buenos días</p>
            <h1 className="text-white text-2xl font-black mt-0.5">{user?.fullName?.split(' ')[0]}</h1>
            <p className="text-blue-200 text-sm mt-1">Zona Norte — Bolívar</p>
          </motion.div>

          {/* Active project card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 bg-white/15 backdrop-blur-sm rounded-2xl p-4"
          >
            <div className="text-white/70 text-xs font-medium mb-1">Proyecto activo</div>
            <div className="text-white font-bold">Caracterización Socioeconómica Bolívar</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-white/80 text-xs">{progress}%</span>
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
                {
                  label: 'Asignados',
                  value: loadingData ? '—' : String(assignedCount),
                  icon: <ClipboardList size={16} />,
                  color: 'text-blue-500',
                },
                {
                  label: 'Completados hoy',
                  value: loadingData ? '—' : String(completedToday),
                  icon: <CheckCircle size={16} />,
                  color: 'text-green-500',
                },
                {
                  label: 'Pendientes sync',
                  value: pendingCount,
                  icon: <Cloud size={16} />,
                  color: pendingCount > 0 ? 'text-red-500' : 'text-gray-400',
                },
                {
                  label: 'Mi avance',
                  value: loadingData ? '—' : `${progress}%`,
                  icon: <TrendingUp size={16} />,
                  color: 'text-orange-500',
                },
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
          <button
            onClick={() => navigate('/field/forms')}
            className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 shadow-md active:scale-98 transition-transform"
          >
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
            <button
              onClick={() => navigate('/field/forms')}
              className="text-xs text-brand-primary font-medium"
            >
              Ver todos
            </button>
          </h2>

          {loadingData ? (
            <div className="space-y-2.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="bg-white rounded-xl border border-border p-4 h-[72px] animate-pulse" />
              ))}
            </div>
          ) : recentForms.length === 0 ? (
            <div className="bg-white rounded-xl border border-border p-6 flex flex-col items-center gap-2 text-center">
              <ClipboardList size={32} className="text-gray-300" />
              <p className="text-sm font-medium text-muted-foreground">Sin formularios aún</p>
              <p className="text-xs text-muted-foreground">Inicia tu primer formulario para verlo aquí</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentForms.map((form, i) => {
                const syncKey = form.sync_status === 'synced'
                  ? 'synced'
                  : form.sync_status === 'failed'
                    ? 'failed'
                    : form.sync_status === 'pending'
                      ? 'pending'
                      : 'syncing'
                const cfg = statusConfig[syncKey as SyncStatus] ?? statusConfig.pending
                return (
                  <motion.div
                    key={form.local_id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.08 }}
                    className="bg-white rounded-xl border border-border p-4 flex items-center gap-3 hover:shadow-sm transition-shadow"
                  >
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg)}>
                      <ClipboardList size={18} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">Formulario</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatRelative(form.created_at)}
                      </div>
                    </div>
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0', cfg.bg, cfg.color)}>
                      {cfg.label}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* Notifications */}
        {pendingCount > 0 && (
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
        )}
      </div>

      <BottomNav />
    </div>
  )
}
