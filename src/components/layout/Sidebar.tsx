import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Building2, Users, MapPin, FileText,
  Settings, ChevronLeft, ChevronRight, LogOut, Bell,
  ClipboardList, BarChart2, MessageSquare, UserCheck,
  AlertCircle, Menu, X,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { SyncIndicator } from '@/components/shared'
import { cn, getInitials } from '@/lib/utils'
import type { UserRole } from '@/types'

interface NavItem {
  path: string
  label: string
  icon: React.ReactNode
}

const navItems: Record<UserRole, NavItem[]> = {
  admin: [
    { path: '/admin',          label: 'Dashboard',     icon: <LayoutDashboard size={18} /> },
    { path: '/admin/entities', label: 'Entidades',     icon: <Building2 size={18} /> },
    { path: '/admin/settings', label: 'Configuración', icon: <Settings size={18} /> },
  ],
  coordinator: [
    { path: '/coord',                label: 'Dashboard',      icon: <LayoutDashboard size={18} /> },
    { path: '/coord/team',           label: 'Equipo',         icon: <Users size={18} /> },
    { path: '/coord/municipalities', label: 'Municipios',     icon: <MapPin size={18} /> },
    { path: '/coord/families',       label: 'Familias',       icon: <UserCheck size={18} /> },
    { path: '/coord/reports',        label: 'Informes',       icon: <BarChart2 size={18} /> },
    { path: '/coord/observations',   label: 'Observaciones',  icon: <MessageSquare size={18} /> },
    { path: '/coord/settings',       label: 'Configuración',  icon: <Settings size={18} /> },
  ],
  support: [
    { path: '/apoyo',                label: 'Dashboard',       icon: <LayoutDashboard size={18} /> },
    { path: '/apoyo/professionals',  label: 'Profesionales',   icon: <Users size={18} /> },
    { path: '/apoyo/review',         label: 'Revisión',        icon: <ClipboardList size={18} /> },
    { path: '/apoyo/observations',   label: 'Observaciones',   icon: <AlertCircle size={18} /> },
  ],
  professional: [],
}

const rolLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  coordinator: 'Coordinador',
  support: 'Apoyo Administrativo',
  professional: 'Profesional de Campo',
}

interface SidebarProps {
  role: UserRole
}

export function Sidebar({ role }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()
  const items = navItems[role] ?? []

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className={cn('h-full flex flex-col transition-all duration-300')}
         style={{ background: '#1B3A4B' }}>
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-white/10', collapsed && 'justify-center px-2')}>
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">CG</span>
        </div>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-lg leading-none">Control G</div>
            <div className="text-white/60 text-xs mt-0.5">DRAN Digital</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin' || item.path === '/coord' || item.path === '/apoyo'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                isActive
                  ? 'bg-white/20 text-white font-semibold'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
                collapsed && 'justify-center px-2',
              )
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + Actions */}
      <div className="border-t border-white/10 p-3 space-y-2">
        {!collapsed && (
          <div className="px-1">
            <SyncIndicator />
          </div>
        )}
        <div className={cn('flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
            {getInitials(user?.fullName || 'U')}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{user?.fullName}</div>
              <div className="text-white/50 text-xs truncate">{rolLabels[user?.role as UserRole] ?? user?.role}</div>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 text-sm transition-colors duration-200', collapsed && 'justify-center')}
        >
          <LogOut size={16} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn('hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0 transition-all duration-300', collapsed ? 'w-16' : 'w-60')}>
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 text-white rounded-full flex items-center justify-center shadow-md z-10"
          style={{ background: '#1B3A4B' }}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </div>

      {/* Mobile Hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 w-10 h-10 text-white rounded-xl flex items-center justify-center shadow-lg"
        style={{ background: '#1B3A4B' }}
      >
        <Menu size={20} />
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 z-50"
            >
              <div className="h-full relative">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="absolute top-4 right-4 z-10 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white"
                >
                  <X size={16} />
                </button>
                <SidebarContent />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

interface TopBarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  return (
    <header className="bg-white border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-30">
      <div className="ml-10 lg:ml-0">
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <button className="relative w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors">
          <Bell size={16} className="text-muted-foreground" />
        </button>
      </div>
    </header>
  )
}
