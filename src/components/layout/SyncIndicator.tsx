import { motion, AnimatePresence } from 'framer-motion'
import { Cloud, CloudOff, Loader2, CheckCircle } from 'lucide-react'
import { useSyncStore } from '@/stores/syncStore'
import { cn } from '@/lib/utils'

export function SyncIndicator({ compact = false }: { compact?: boolean }) {
  const { status, pendingCount, isSyncing } = useSyncStore()

  const configs = {
    synced: {
      icon: <CheckCircle size={14} />,
      label: 'Sincronizado',
      className: 'sync-bar synced',
    },
    syncing: {
      icon: <Loader2 size={14} className="animate-spin" />,
      label: 'Sincronizando...',
      className: 'sync-bar syncing',
    },
    offline: {
      icon: <CloudOff size={14} />,
      label: `Sin conexión${pendingCount > 0 ? ` (${pendingCount} pendientes)` : ''}`,
      className: 'sync-bar offline',
    },
    error: {
      icon: <CloudOff size={14} />,
      label: 'Error de sync',
      className: 'sync-bar offline',
    },
  }

  const config = configs[status]

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.2 }}
        className={cn(config.className, compact && 'text-[11px] px-2 py-1')}
      >
        {config.icon}
        {!compact && <span>{config.label}</span>}
      </motion.div>
    </AnimatePresence>
  )
}
