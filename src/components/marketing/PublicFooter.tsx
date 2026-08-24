import { Link } from 'react-router-dom'
import { WHATSAPP_DISPLAY } from '@/lib/marketing'

export function PublicFooter() {
  return (
    <footer className="bg-[#102d3e] px-5 py-10 text-white/60">
      <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <Link to="/" className="inline-flex items-center gap-3 text-white"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-xs font-black">CG</span><span className="font-black">Control G</span></Link>
          <p className="mt-3 max-w-lg text-sm leading-6">Plataforma offline-first para caracterización, encuestas y levantamiento de información en campo.</p>
          <p className="mt-4 text-xs text-white/35">© 2026 DRAN Digital S.A.S. · Colombia y Latinoamérica</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold sm:justify-end" aria-label="Navegación del pie de página">
          <Link to="/software-caracterizacion-social" className="hover:text-white">Caracterización</Link>
          <Link to="/encuestas-offline" className="hover:text-white">Encuestas offline</Link>
          <Link to="/blog" className="hover:text-white">Blog</Link>
          <Link to="/login" className="hover:text-white">Clientes</Link>
          <a href={`tel:${WHATSAPP_DISPLAY.replace(/\s/g, '')}`} className="hover:text-white">{WHATSAPP_DISPLAY}</a>
        </nav>
      </div>
    </footer>
  )
}
