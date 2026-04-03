import React, { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn, getInitials, formatRelativeTime } from '@/lib/utils'
import type { FormResponse, TeamMember } from '@/types'

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
import { Wifi, WifiOff, RefreshCw, Check } from 'lucide-react'

export function SyncIndicator() {
  const { status, pendingCount } = useSyncStore()

  const cfgMap: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
    synced:  { icon: <Check size={13} />,       label: 'Sincronizado',         cls: 'bg-green-100 text-green-700 border-green-200' },
    syncing: { icon: <RefreshCw size={13} className="animate-spin" />, label: `Enviando ${pendingCount}...`, cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    offline: { icon: <WifiOff size={13} />,     label: `${pendingCount} pendientes`, cls: 'bg-red-50 text-red-600 border-red-200' },
    error:   { icon: <WifiOff size={13} />,     label: 'Error de sync',        cls: 'bg-red-50 text-red-600 border-red-200' },
  }
  const cfg = cfgMap[status] ?? cfgMap.offline

  return (
    <div className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium', cfg.cls)}>
      {cfg.icon}
      <span>{cfg.label}</span>
    </div>
  )
}

// ─── Response Row ─────────────────────────────────────────────────────────────

export function ResponseRow({ response }: { response: FormResponse }) {
  return (
    <tr className="hover:bg-muted/30 transition-colors cursor-pointer">
      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{response.localId.slice(-8)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Avatar name={response.technicianName || ''} size="sm" />
          <span className="text-sm font-medium">{response.technicianName}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{response.zoneName}</td>
      <td className="px-4 py-3 text-sm max-w-[160px] truncate">{response.formName}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{response.syncedAt && formatRelativeTime(response.syncedAt)}</td>
      <td className="px-4 py-3"><StatusBadge status={response.status} /></td>
    </tr>
  )
}

// ─── Team Member Row ──────────────────────────────────────────────────────────

export function TeamMemberRow({ member }: { member: TeamMember }) {
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Avatar name={member.user.fullName} size="sm" />
            <span className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white', member.isOnline ? 'bg-green-500' : 'bg-gray-300')} />
          </div>
          <div>
            <div className="text-sm font-semibold">{member.user.fullName}</div>
            <div className="text-xs text-muted-foreground">{member.user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">Zona {member.assignedZoneId?.slice(-3)}</td>
      <td className="px-4 py-3 text-sm font-bold">{member.formsToday ?? 0}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{member.isOnline ? 'Hace 30 min' : 'Hace 4h'}</td>
      <td className="px-4 py-3">
        <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', member.isOnline ? 'bg-green-100 text-green-700' : member.isPending ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600')}>
          <span className={cn('w-1.5 h-1.5 rounded-full', member.isOnline ? 'bg-green-500' : member.isPending ? 'bg-yellow-500' : 'bg-gray-400')} />
          {member.isOnline ? 'En campo' : member.isPending ? 'Con pendientes' : 'Offline'}
        </span>
      </td>
    </tr>
  )
}
