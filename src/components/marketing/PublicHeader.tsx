import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react'
import { WhatsAppCta } from '@/components/marketing/WhatsAppCta'
import { useAuthStore } from '@/stores/authStore'
import '@/components/marketing/public-marketing.css'

const SOLUTIONS = [
  { label: 'Caracterización social', path: '/software-caracterizacion-social' },
  { label: 'Encuestas offline', path: '/encuestas-offline' },
  { label: 'Encuestas georreferenciadas', path: '/encuestas-georreferenciadas' },
  { label: 'Mapas, GIS y ArcGIS', path: '/integracion-arcgis' },
  { label: 'Empresas y corporaciones', path: '/encuestas-para-empresas' },
  { label: 'ONG y organizaciones', path: '/encuestas-para-ong' },
]

interface PublicHeaderProps { message: string; placement: string; fixed?: boolean }

export function PublicHeader({ message, placement, fixed = false }: PublicHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [solutionsOpen, setSolutionsOpen] = useState(false)
  const { pathname } = useLocation()
  const user = useAuthStore(state => state.user)
  const loginPath = user ? (user.role === 'admin' ? '/admin' : user.role === 'coordinator' ? '/coord' : user.role === 'support' ? '/apoyo' : '/field') : '/login'
  const active = (path: string) => path === '/' ? pathname === '/' : pathname.startsWith(path)
  const closeMenus = () => { setMenuOpen(false); setSolutionsOpen(false) }

  return (
    <header className={`cg-public-header${fixed ? ' cg-public-header-fixed' : ''}`} onKeyDown={event => { if (event.key === 'Escape') closeMenus() }}>
      <div className="cg-header-inner">
        <Link to="/" className="cg-brand" aria-label="Control G, ir al inicio" onClick={closeMenus}><span className="cg-brand-mark" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none"><path d="M28 10H16a8 8 0 0 0-8 8v4a8 8 0 0 0 8 8h12V20H20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><circle cx="29" cy="10" r="3" fill="#76C7C7" /></svg></span><span className="cg-brand-name">Control G<span>por DRAN Digital</span></span></Link>
        <nav className="cg-desktop-nav" aria-label="Navegación principal">
          <Link to="/" aria-current={active('/') ? 'page' : undefined}>Plataforma</Link>
          <div className="cg-solutions-nav" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSolutionsOpen(false) }}><button type="button" onClick={() => setSolutionsOpen(value => !value)} aria-expanded={solutionsOpen} aria-controls="cg-solutions-menu">Soluciones <ChevronDown size={14} aria-hidden="true" /></button>{solutionsOpen ? <div id="cg-solutions-menu" className="cg-solutions-menu">{SOLUTIONS.map(item => <Link key={item.path} to={item.path} onClick={closeMenus} aria-current={active(item.path) ? 'page' : undefined}>{item.label}</Link>)}</div> : null}</div>
          <Link to="/encuestas-con-inteligencia-artificial" aria-current={active('/encuestas-con-inteligencia-artificial') ? 'page' : undefined}>Encuestas e IA</Link>
          <Link to="/blog" aria-current={active('/blog') ? 'page' : undefined}>Guías y recursos</Link>
        </nav>
        <div className="cg-header-actions"><Link to={loginPath} className="cg-login-link">{user ? 'Ir al panel' : 'Iniciar sesión'}</Link><WhatsAppCta message={message} placement={placement} className="cg-button cg-button-whatsapp cg-header-demo">Solicitar demo <ArrowRight size={16} aria-hidden="true" /></WhatsAppCta></div>
        <button type="button" className="cg-mobile-toggle" onClick={() => setMenuOpen(value => !value)} aria-expanded={menuOpen} aria-controls="public-mobile-menu" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}>{menuOpen ? <X size={23} aria-hidden="true" /> : <Menu size={23} aria-hidden="true" />}</button>
      </div>
      {menuOpen ? <div id="public-mobile-menu" className="cg-mobile-menu"><nav aria-label="Navegación móvil"><Link to="/" onClick={closeMenus} aria-current={active('/') ? 'page' : undefined}>Plataforma</Link>{SOLUTIONS.map(item => <Link key={item.path} to={item.path} onClick={closeMenus} aria-current={active(item.path) ? 'page' : undefined}>{item.label}</Link>)}<Link to="/encuestas-con-inteligencia-artificial" onClick={closeMenus}>Encuestas e inteligencia artificial</Link><Link to="/blog" onClick={closeMenus}>Guías y recursos</Link></nav><div className="cg-mobile-actions"><Link to={loginPath} className="cg-button cg-button-secondary" onClick={closeMenus}>{user ? 'Ir al panel' : 'Iniciar sesión'}</Link><WhatsAppCta message={message} placement={`${placement}-movil`} className="cg-button cg-button-whatsapp">Solicitar demo <ArrowRight size={16} aria-hidden="true" /></WhatsAppCta></div></div> : null}
    </header>
  )
}
