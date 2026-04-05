import { NavLink } from 'react-router-dom'
import { Home, Users, Camera, User, Cloud, CloudOff, Loader2, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSyncStore } from '@/stores/syncStore'

export function SyncStatusBar() {
  const { status, pendingCount } = useSyncStore()

  const isOnline = status === 'synced'
  const isSyncing = status === 'syncing'
  const isOffline = status === 'offline' || status === 'error'

  return (
    <div className={cn(
      'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold',
      isOnline  && 'bg-green-100 text-green-700',
      isSyncing && 'bg-orange-100 text-orange-700',
      isOffline && 'bg-red-100 text-red-700',
    )}>
      {isOnline  && <><Cloud size={12} /> Sincronizado</>}
      {isSyncing && <><Loader2 size={12} className="animate-spin" /> Sincronizando...</>}
      {isOffline && <><CloudOff size={12} /> Sin conexión{pendingCount > 0 ? ` (${pendingCount})` : ''}</>}
    </div>
  )
}

export function MobileTopBar({ title }: { title?: string }) {
  return (
    <div className="sticky top-0 z-40 bg-white border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1B3A4B' }}>
            <span className="text-white font-black text-xs">CG</span>
          </div>
          {title && <span className="font-bold text-foreground">{title}</span>}
        </div>
        <SyncStatusBar />
      </div>
    </div>
  )
}

const navItems = [
  { to: '/field',         icon: <Home size={22} />,      label: 'Inicio',    end: true },
  { to: '/field/families',icon: <Users size={22} />,     label: 'Familias',  end: false },
  { to: '/field/capture', icon: <Camera size={22} />,    label: 'Capturar',  end: false },
  { to: '/field/reports', icon: <BarChart2 size={22} />, label: 'Informes',  end: false },
  { to: '/field/profile', icon: <User size={22} />,      label: 'Mi Perfil', end: false },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-border">
      <div className="flex">
        {navItems.map((item, i) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 text-[10px] font-semibold transition-colors',
                isActive ? 'text-[#1B3A4B]' : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Central capture button is bigger */}
                {i === 2 ? (
                  <span className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center mb-0.5 transition-all',
                    isActive ? 'bg-[#1B3A4B] text-white scale-110' : 'bg-[#1B3A4B]/10 text-[#1B3A4B]',
                  )}>
                    <Camera size={24} />
                  </span>
                ) : (
                  <span className={cn('transition-transform', isActive && 'scale-110')}>{item.icon}</span>
                )}
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
