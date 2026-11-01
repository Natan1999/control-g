import { Link } from 'react-router-dom'

export function LegalLinks() {
  return (
    <nav aria-label="Privacidad y cuenta" className="flex flex-wrap justify-center gap-x-5 gap-y-2 py-4 text-xs">
      <Link to="/privacidad" className="min-h-11 inline-flex items-center underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Política de privacidad</Link>
      <Link to="/eliminar-cuenta" className="min-h-11 inline-flex items-center underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Eliminar cuenta y datos</Link>
    </nav>
  )
}
