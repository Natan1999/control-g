import React, { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn, getInitials } from '@/lib/utils'
// FormResponse and TeamMember legacy types removed — use new domain types from @/types

// ─── KPI Card ───────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string
  value: string | number
  icon?: ReactNode
  colorClass?: string
  change?: number
  suffix?: string
}

export function KPICard({ label, value, icon, colorClass = 'bg-blue-50 text-blue-600', change, suffix }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      {icon && (
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', colorClass)}>
          {icon}
        </div>
      )}
      <div className="text-2xl font-black text-foreground">
        {typeof value === 'number' ? value.toLocaleString('es-CO') : value}
        {suffix && <span className="text-lg ml-0.5">{suffix}</span>}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</div>
      {change !== undefined && (
        <div className={cn('flex items-center gap-1 text-xs font-medium mt-1.5', change >= 0 ? 'text-green-600' : 'text-red-500')}>
          {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(change)}% vs ayer
        </div>
      )}
    </motion.div>
  )
}

// ─── Status Badge ────────────────────────────────────────────────────────────

const statusMap: Record<string, { label: string; class: string }> = {
  active:   { label: 'Activo',      class: 'bg-green-100 text-green-700' },
  draft:    { label: 'Borrador',    class: 'bg-gray-100 text-gray-600' },
  completed:{ label: 'Completado',  class: 'bg-blue-100 text-blue-700' },
  archived: { label: 'Archivado',   class: 'bg-gray-200 text-gray-500' },
  in_review:{ label: 'En Revisión', class: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Aprobado',    class: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rechazado',   class: 'bg-red-100 text-red-600' },
  synced:   { label: 'Sincronizado',class: 'bg-blue-100 text-blue-700' },
  pending:  { label: 'Pendiente',   class: 'bg-orange-100 text-orange-700' },
  published:{ label: 'Publicado',   class: 'bg-green-100 text-green-700' },
}

export function StatusBadge({ status }: { status: string }) {
  const cfg = statusMap[status] ?? { label: status, class: 'bg-gray-100 text-gray-600' }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap', cfg.class)}>
      {cfg.label}
    </span>
  )
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

const avatarColors = [
  'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-cyan-500',
  'bg-red-500', 'bg-teal-500', 'bg-indigo-500', 'bg-emerald-500',
]

function getAvatarColor(name: string) {
  const hash = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return avatarColors[hash % avatarColors.length]
}

interface AvatarProps { name: string; size?: 'sm' | 'md' | 'lg' }

export function Avatar({ name, size = 'md' }: AvatarProps) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm'
  return (
    <div className={cn('rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0', sizeClass, getAvatarColor(name))}>
      {getInitials(name)}
    </div>
  )
}

// ─── Progress Ring ────────────────────────────────────────────────────────────

interface ProgressRingProps { value: number; max: number; size?: number }

export function ProgressRing({ value, max, size = 64 }: ProgressRingProps) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const radius = (size - 10) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (pct / 100) * circumference

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={5} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={pct >= 80 ? '#27AE60' : pct >= 50 ? '#F39C12' : '#2E86C1'}
          strokeWidth={5} strokeDasharray={circumference}
          strokeDashoffset={dashOffset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-black leading-none">{pct}%</span>
      </div>
    </div>
  )
}

// ─── Page Wrapper ─────────────────────────────────────────────────────────────

export function PageWrapper({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex-1 overflow-y-auto', className)}>
      {children}
    </div>
  )
}

// ─── Sync Indicator ──────────────────────────────────────────────────────────

import { useSyncStore } from '@/stores/syncStore'
import { processSyncQueue } from '@/lib/sync-engine'
import { WifiOff, RefreshCw, Check, Cloud } from 'lucide-react'

export function SyncIndicator() {
  const { status, pendingCount, isSyncing } = useSyncStore()

  const handleSync = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isSyncing) return
    await processSyncQueue()
  }

  if (status === 'synced' && pendingCount === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] font-black text-emerald-400 uppercase tracking-widest">
        <Check size={12} className="text-emerald-500" />
        <span>Sincronizado</span>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex flex-col gap-2 p-3 rounded-2xl border transition-all duration-300",
      status === 'syncing' ? "bg-amber-500/10 border-amber-500/20" : "bg-rose-500/10 border-rose-500/20"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === 'syncing' ? (
            <RefreshCw size={14} className="text-amber-500 animate-spin" />
          ) : (
            <WifiOff size={14} className="text-rose-500" />
          )}
          <span className={cn(
            "text-[10px] font-black uppercase tracking-widest",
            status === 'syncing' ? "text-amber-500" : "text-rose-500"
          )}>
            {status === 'syncing' ? 'Sincronizando...' : `${pendingCount} Pendientes`}
          </span>
        </div>
      </div>
      
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className={cn(
          "flex items-center justify-center gap-2 w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all active:scale-95",
          status === 'syncing' 
            ? "bg-amber-500 text-white cursor-wait" 
            : "bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-900/20"
        )}
      >
        <Cloud size={14} />
        {status === 'syncing' ? 'Enviando...' : 'Sincronizar ahora'}
      </button>
    </div>
  )
}

