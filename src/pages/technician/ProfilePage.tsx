import { LogOut, RefreshCw, HardDrive, TrendingUp, Award, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { BottomNav, MobileTopBar } from '@/components/layout/BottomNav'
import { useAuthStore } from '@/stores/authStore'
import { useSyncStore } from '@/stores/syncStore'
import { useNavigate } from 'react-router-dom'
import { getInitials, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

const historyForms = [
  { name: 'Ficha Socioeconómica', zone: 'El Pozón', date: new Date(Date.now() - 900000).toISOString(), status: 'synced' },
  { name: 'Ficha Socioeconómica', zone: 'El Pozón', date: new Date(Date.now() - 3600000).toISOString(), status: 'syncing' },
  { name: 'Ficha Socioeconómica', zone: 'El Pozón', date: new Date(Date.now() - 7200000).toISOString(), status: 'offline' },
  { name: 'Ficha Socioeconómica', zone: 'El Pozón', date: new Date(Date.now() - 86400000).toISOString(), status: 'synced' },
  { name: 'Ficha Socioeconómica', zone: 'El Pozón', date: new Date(Date.now() - 90000000).toISOString(), status: 'synced' },
]

export default function ProfilePage() {
  const { user, logout } = useAuthStore()
  const { status, pendingCount, setSyncComplete, setStatus } = useSyncStore()
  const navigate = useNavigate()

  const handleSync = () => {
    setStatus('syncing')
    setTimeout(() => setSyncComplete(), 2000)
  }

  const handleLogout = () => {
    logout()
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
            📍 Zona El Pozón — Cartagena
          </div>
        </div>

        {/* Stats */}
        <div className="mx-4 -mt-5">
          <div className="bg-white rounded-2xl shadow-md border border-border overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-border">
              {[
                { label: 'Total', value: '247', icon: <TrendingUp size={16} />, sub: 'formularios' },
                { label: 'Promedio', value: '12.4', icon: <Clock size={16} />, sub: 'por día' },
                { label: 'Racha', value: '8', icon: <Award size={16} />, sub: 'días seguidos' },
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
                <span className="font-medium">124 MB de 2 GB</span>
              </div>

              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full w-[6%] bg-brand-primary rounded-full" />
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
            <button className="text-xs text-brand-primary font-medium">Ver todos</button>
          </h3>
          <div className="space-y-2">
            {historyForms.map((form, i) => (
              <div key={i} className="bg-white rounded-xl border border-border px-4 py-3 flex items-center gap-3">
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', {
                  'bg-green-500': form.status === 'synced',
                  'bg-yellow-500': form.status === 'syncing',
                  'bg-red-400': form.status === 'offline',
                })} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{form.name}</div>
                  <div className="text-xs text-muted-foreground">{form.zone} · {formatRelativeTime(form.date)}</div>
                </div>
                <span className={cn('text-xs font-medium', {
                  'text-green-600': form.status === 'synced',
                  'text-yellow-600': form.status === 'syncing',
                  'text-red-500': form.status === 'offline',
                })}>
                  {form.status === 'synced' ? 'Sincronizado' : form.status === 'syncing' ? 'Enviando' : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
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
