import { Link } from 'react-router-dom'
import { PublicHeader } from '@/components/marketing/PublicHeader'
import { PublicFooter } from '@/components/marketing/PublicFooter'

export default function NotFoundPage() {
  return <div className="min-h-screen bg-white text-slate-900">
    <PublicHeader message="Hola, necesito orientación para un proyecto de encuestas en Control G." placement="pagina-no-encontrada" />
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-6 py-24">
      <p className="text-sm text-slate-500">Error 404</p>
      <h1 className="mt-4 text-4xl font-bold">No encontramos esta página</h1>
      <p className="mt-5 max-w-xl leading-7 text-slate-600">El enlace puede haber cambiado o el artículo ya no está publicado. Puede consultar las soluciones y guías disponibles.</p>
      <nav className="mt-8 flex flex-wrap gap-4" aria-label="Continuar en Control G">
        <Link className="rounded-xl bg-[#123B50] px-5 py-3 font-semibold text-white" to="/">Ir al inicio</Link>
        <Link className="rounded-xl border border-slate-300 px-5 py-3 font-semibold" to="/blog">Explorar el blog</Link>
      </nav>
    </main><PublicFooter />
  </div>
}
