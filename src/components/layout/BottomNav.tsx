import { NavLink } from 'react-router-dom'
import { Home, ClipboardList, Camera, FileText, User, Bell } from 'lucide-react'
import { SyncIndicator } from '@/components/shared'
import { cn } from '@/lib/utils'

export function MobileTopBar({ title }: { title?: string }) {
  return (
    <div className="sticky top-0 z-40 bg-white border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1A5276, #2E86C1)' }}>
            <span className="text-white font-black text-xs">CG</span>
          </div>
          {title && <span className="font-bold text-foreground">{title}</span>}
        </div>
        <div className="flex items-center gap-2">
          <SyncIndicator />
          <button className="relative p-2 hover:bg-muted rounded-xl">
            <Bell size={18} className="text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>
    </div>
  )
}

const navItems = [
  { to: '/field',          icon: <Home size={22} />,          label: 'Inicio' },
  { to: '/field/families', icon: <User size={22} />,          label: 'Familias' },
  { to: '/field/forms',    icon: <ClipboardList size={22} />, label: 'Formularios' },
  { to: '/field/scan',     icon: <Camera size={22} />,        label: 'Escanear' },
  { to: '/field/profile',  icon: <User size={22} />,          label: 'Perfil' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-border safe-area-bottom">
      <div className="flex">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/field'}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 text-[10px] font-semibold transition-colors',
                isActive ? 'text-brand-primary' : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={cn('transition-transform', isActive && 'scale-110')}>{item.icon}</span>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
