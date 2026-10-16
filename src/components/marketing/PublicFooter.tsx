import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { WHATSAPP_DISPLAY } from '@/lib/marketing'
import { WhatsAppCta } from '@/components/marketing/WhatsAppCta'
import '@/components/marketing/public-marketing.css'

export function PublicFooter() {
  return (
    <footer className="cg-public-footer">
      <div className="cg-container cg-footer-grid">
        <div className="cg-footer-brand"><Link to="/" className="cg-footer-wordmark">Control G</Link><p>Datos de campo para entender el territorio.</p><p>Una plataforma de DRAN Digital para caracterización, encuestas y levantamiento de información en Colombia y Latinoamérica.</p><WhatsAppCta message="Hola, quiero conversar sobre una operación de campo con Control G." placement="pie-de-pagina" className="cg-footer-contact">{WHATSAPP_DISPLAY} <ArrowUpRight size={17} aria-hidden="true" /></WhatsAppCta></div>
        <nav aria-label="Soluciones de Control G"><h2>Soluciones</h2><Link to="/software-caracterizacion-social">Caracterización social</Link><Link to="/encuestas-offline">Encuestas sin internet</Link><Link to="/encuestas-georreferenciadas">Georreferenciación</Link><Link to="/encuestas-con-inteligencia-artificial">Cuestionarios con apoyo de IA</Link><Link to="/integracion-arcgis">GIS y ArcGIS</Link></nav>
        <nav aria-label="Organizaciones y recursos"><h2>Su operación</h2><Link to="/caracterizacion-colombia">Caracterización en Colombia</Link><Link to="/encuestas-para-empresas">Empresas y corporaciones</Link><Link to="/encuestas-para-ong">ONG y fundaciones</Link><Link to="/blog">Guías y recursos</Link><Link to="/login">Acceso a la plataforma</Link></nav>
      </div>
      <div className="cg-container cg-footer-bottom"><p>© 2026 DRAN Digital S.A.S.</p><p>Colombia y Latinoamérica</p><a href="/sitemap.html">Mapa del sitio</a><a href="/#solicitar-demo">Conversemos sobre su proyecto</a></div>
    </footer>
  )
}
