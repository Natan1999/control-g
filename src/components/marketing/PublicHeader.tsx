import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Menu, X } from 'lucide-react'
import { WhatsAppCta } from '@/components/marketing/WhatsAppCta'
import { useAuthStore } from '@/stores/authStore'

const NAVIGATION = [
  { label: 'Plataforma', path: '/' },
  { label: 'Caracterización', path: '/software-caracterizacion-social' },
  { label: 'Encuestas offline', path: '/encuestas-offline' },
  { label: 'Blog', path: '/blog' },
]

interface PublicHeaderProps {
  message: string
  placement: string
  fixed?: boolean
}

export function PublicHeader({ message, placement, fixed = false }: PublicHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const user = useAuthStore(state => state.user)
  const loginPath = user ? (user.role === 'admin' ? '/admin' : user.role === 'coordinator' ? '/coord' : user.role === 'support' ? '/apoyo' : '/field') : '/login'

  const active = (path: string) => path === '/' ? pathname === '/' : pathname.startsWith(path)

  return (
    <header className={`${fixed ? 'fixed' : 'sticky'} inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-[0_1px_20px_rgba(15,23,42,.04)] backdrop-blur-xl`}>
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="Control G, ir al inicio">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#102d3e] text-sm font-black tracking-tight text-white shadow-sm">CG</span>
          <span className="leading-none">
            <span className="block text-lg font-black tracking-tight text-[#102d3e]">Control G</span>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">by DRAN Digital</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
          {NAVIGATION.map(item => (
            <Link
              key={item.path}
              to={item.path}
              aria-current={active(item.path) ? 'page' : undefined}
              className={`rounded-xl px-3.5 py-2 text-sm font-bold transition ${active(item.path) ? 'bg-[#eef7f8] text-[#1f6178]' : 'text-slate-600 hover:bg-slate-50 hover:text-[#102d3e]'}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <Link to={loginPath} className="rounded-xl px-4 py-2.5 text-sm font-black text-[#102d3e] ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50">
            {user ? 'Ir al panel' : 'Iniciar sesión'}
          </Link>
          <WhatsAppCta message={message} placement={placement} className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#20bd5a]">
            Solicitar demo <ArrowRight size={16} aria-hidden="true" />
          </WhatsAppCta>
        </div>

        <button type="button" onClick={() => setMenuOpen(value => !value)} className="flex h-11 w-11 items-center justify-center rounded-xl text-[#102d3e] ring-1 ring-inset ring-slate-200 lg:hidden" aria-expanded={menuOpen} aria-controls="public-mobile-menu" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div id="public-mobile-menu" className="border-t border-slate-100 bg-white px-5 pb-5 pt-3 shadow-xl lg:hidden">
          <nav className="mx-auto grid max-w-7xl gap-1" aria-label="Navegación móvil">
            {NAVIGATION.map(item => (
              <Link key={item.path} to={item.path} onClick={() => setMenuOpen(false)} aria-current={active(item.path) ? 'page' : undefined} className={`rounded-xl px-4 py-3 text-sm font-bold ${active(item.path) ? 'bg-[#eef7f8] text-[#1f6178]' : 'text-slate-700'}`}>
                {item.label}
              </Link>
            ))}
            <div className="mt-3 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <Link to={loginPath} onClick={() => setMenuOpen(false)} className="flex min-h-12 items-center justify-center rounded-xl font-black text-[#102d3e] ring-1 ring-inset ring-slate-300">{user ? 'Ir al panel' : 'Iniciar sesión'}</Link>
              <WhatsAppCta message={message} placement={`${placement}-movil`} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] font-black text-white">Solicitar demo <ArrowRight size={16} /></WhatsAppCta>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
