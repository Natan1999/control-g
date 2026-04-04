import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, RefreshCw, HardDrive, TrendingUp, Award, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { BottomNav, MobileTopBar } from '@/components/layout/BottomNav'
import { useAuthStore } from '@/stores/authStore'
import { useSyncStore } from '@/stores/syncStore'
import { localDB, type LocalResponse } from '@/lib/dexie-db'
import { getInitials, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ── Helpers ────────────────────────────────────────────────────────────────

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function calculateStreak(responses: LocalResponse[]): number {
  if (responses.length === 0) return 0

  // Collect unique day timestamps (start-of-day)
  const days = new Set(responses.map(r => startOfDay(new Date(r.created_at))))
  const sortedDays = Array.from(days).sort((a, b) => b - a) // desc

  const DAY_MS = 86400000
  let streak = 0
  let expected = startOfDay(new Date())

  for (const day of sortedDays) {
    if (day === expected) {
      streak++
      expected -= DAY_MS
    } else if (day < expected) {
      // Gap found — streak broken
      break
    }
  }

  return streak
}

function calcAvgPerDay(total: number, responses: LocalResponse[]): string {
  if (responses.length === 0 || total === 0) return '0'
  const sorted = [...responses].sort((a, b) => a.created_at - b.created_at)
  const firstMs = sorted[0].created_at
  const daysDiff = Math.max(1, Math.ceil((Date.now() - firstMs) / 86400000))
  return (total / daysDiff).toFixed(1)
}

const syncStatusLabels: Record<string, string> = {
  synced:  'Sincronizado',
  pending: 'Pendiente',
  failed:  'Error',
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, signOut } = useAuthStore()
  const { status, pendingCount, setSyncComplete, setStatus } = useSyncStore()
  const navigate = useNavigate()

  const [historyForms, setHistoryForms] = useState<LocalResponse[]>([])
  const [totalResponses, setTotalResponses] = useState(0)
  const [avgPerDay, setAvgPerDay] = useState('0')
  const [streak, setStreak] = useState(0)
  const [storageLabel, setStorageLabel] = useState('0 KB')
  const [storagePercent, setStoragePercent] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        const all = await localDB.responses.orderBy('created_at').reverse().toArray()

        if (cancelled) return

        const total = all.length
        const recent5 = all.slice(0, 5)
        const avg = calcAvgPerDay(total, all)
        const currentStreak = calculateStreak(all)

        // Espacio estimado: total * 50 KB
        const estimatedKB = total * 50
        const storageStr = estimatedKB >= 1024
          ? `${(estimatedKB / 1024).toFixed(1)} MB`
          : `${estimatedKB} KB`
        const percent = Math.min(100, Math.round((estimatedKB * 1024) / (2 * 1024 * 1024 * 1024) * 100))

        setHistoryForms(recent5)
        setTotalResponses(total)
        setAvgPerDay(avg)
        setStreak(currentStreak)
        setStorageLabel(storageStr)
        setStoragePercent(percent)
      } catch {
        // Dexie unavailable — keep defaults
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [])

  const handleSync = () => {
    setStatus('syncing')
    setTimeout(() => setSyncComplete(), 2000)
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileTopBar title="Mi Perfil" />

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Profile Header */}
        <div
          className="px-5 pt-5 pb-8 flex flex-col items-center"
          style={{ background: 'linear-gradient(135deg, #1A5276 0%, #2E86C1 100%)' }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-2xl font-black mb-3"
          >
            {getInitials(user?.fullName || 'TE')}
          </motion.div>
          <h1 className="text-white text-xl font-black">{user?.fullName}</h1>
          <p className="text-blue-200 text-sm mt-0.5">Técnico de Campo</p>
          <div className="mt-2 bg-white/15 backdrop-blur rounded-full px-3 py-1 text-xs text-white font-medium">
            Zona Norte — Bolívar
          </div>
        </div>

        {/* Stats */}
        <div className="mx-4 -mt-5">
          <div className="bg-white rounded-2xl shadow-md border border-border overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-border">
              {[
                {
                  label: 'Total',
                  value: loading ? '—' : String(totalResponses),
                  icon: <TrendingUp size={16} />,
                  sub: 'formularios',
                },
                {
                  label: 'Promedio',
                  value: loading ? '—' : avgPerDay,
                  icon: <Clock size={16} />,
                  sub: 'por día',
                },
                {
                  label: 'Racha',
                  value: loading ? '—' : String(streak),
                  icon: <Award size={16} />,
                  sub: 'días seguidos',
                },
              ].map((s, i) => (
                <div key={i} className="p-4 text-center">
                  <div className="flex justify-center text-brand-primary mb-1">{s.icon}</div>
                  <div className="text-xl font-black">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">{s.label}</div>
                  <div className="text-[10px] text-muted-foreground">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sync section */}
        <div className="mx-4 mt-5">
          <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <HardDrive size={16} className="text-brand-primary" />
              Sincronización
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estado</span>
                <span className={cn('font-semibold', {
                  'text-green-600': status === 'synced',
                  'text-yellow-600': status === 'syncing',
                  'text-red-500': status === 'offline',
                })}>
                  {status === 'synced' ? '✓ Todo sincronizado' : status === 'syncing' ? '↻ Sincronizando...' : `⚠ ${pendingCount} pendientes`}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Espacio usado</span>
                <span className="font-medium">{loading ? '—' : `${storageLabel} de 2 GB`}</span>
              </div>

              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-primary rounded-full transition-all duration-500"
                  style={{ width: `${storagePercent}%` }}
                />
              </div>

              {pendingCount > 0 && (
                <div className="bg-yellow-50 rounded-xl p-3 text-xs text-yellow-700">
                  <strong>{pendingCount} formularios</strong> en cola de sincronización
                </div>
              )}

              <button
                onClick={handleSync}
                disabled={status === 'syncing'}
                className="w-full flex items-center justify-center gap-2 py-3 bg-brand-primary text-white rounded-xl font-semibold text-sm disabled:opacity-60"
              >
                <RefreshCw size={16} className={status === 'syncing' ? 'animate-spin' : ''} />
                {status === 'syncing' ? 'Sincronizando...' : 'Sincronizar ahora'}
              </button>
            </div>
          </div>
        </div>

        {/* History */}
        <div className="mx-4 mt-5">
          <h3 className="font-bold text-sm mb-3 flex items-center justify-between">
            Mis formularios
            <button
              onClick={() => navigate('/field/forms')}
              className="text-xs text-brand-primary font-medium"
            >
              Ver todos
            </button>
          </h3>

          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="bg-white rounded-xl border border-border h-[60px] animate-pulse" />
              ))}
            </div>
          ) : historyForms.length === 0 ? (
            <div className="bg-white rounded-xl border border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">No hay formularios registrados aún.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {historyForms.map((form, i) => {
                const syncKey = form.sync_status
                const dotColor = syncKey === 'synced'
                  ? 'bg-green-500'
                  : syncKey === 'failed'
                    ? 'bg-red-400'
                    : 'bg-yellow-500'
                const textColor = syncKey === 'synced'
                  ? 'text-green-600'
                  : syncKey === 'failed'
                    ? 'text-red-500'
                    : 'text-yellow-600'
                return (
                  <div key={form.local_id} className="bg-white rounded-xl border border-border px-4 py-3 flex items-center gap-3">
                    <div className={cn('w-2 h-2 rounded-full flex-shrink-0', dotColor)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">Formulario</div>
                      <div className="text-xs text-muted-foreground">
                        {formatRelativeTime(new Date(form.created_at).toISOString())}
                      </div>
                    </div>
                    <span className={cn('text-xs font-medium', textColor)}>
                      {syncStatusLabels[syncKey] ?? 'Pendiente'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Logout */}
        <div className="mx-4 mt-6 mb-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-50 border border-red-200 text-red-600 rounded-2xl font-semibold text-sm hover:bg-red-100 transition-colors"
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
