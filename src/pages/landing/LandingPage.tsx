import { Link } from 'react-router-dom'
import {
  ArrowRight, Building2, Camera, Check, ClipboardCheck, FileText,
  Globe2, Layers3, MapPin, ShieldCheck, Smartphone, Sparkles, UsersRound, WifiOff,
} from 'lucide-react'
import { LeadFunnel } from '@/components/marketing/LeadFunnel'
import { StickyWhatsApp, WhatsAppCta } from '@/components/marketing/WhatsAppCta'
import { PublicHeader } from '@/components/marketing/PublicHeader'
import { PublicFooter } from '@/components/marketing/PublicFooter'
import { TerritoryPreview } from '@/components/marketing/TerritoryPreview'
import { getSeoPage } from '@/lib/marketing'
import '@/components/marketing/public-marketing.css'

const LANDING_SEO = getSeoPage('/')!

const SOLUTIONS = [
  { icon: UsersRound, title: 'Caracterización social y de hogares', description: 'Conozca las condiciones, necesidades y prioridades de una comunidad con instrumentos propios.', path: '/software-caracterizacion-social' },
  { icon: WifiOff, title: 'Encuestas sin internet', description: 'Lleve el cuestionario a barrios, veredas y zonas con conectividad intermitente.', path: '/encuestas-offline' },
  { icon: MapPin, title: 'Encuestas georreferenciadas', description: 'Relacione respuestas y evidencias con su ubicación para analizar el territorio.', path: '/encuestas-georreferenciadas' },
  { icon: Sparkles, title: 'Cuestionarios con apoyo de IA', description: 'Prepare el instrumento con asistencia de inteligencia artificial y revisión humana.', path: '/encuestas-con-inteligencia-artificial' },
]

const CAPABILITIES = [
  { icon: FileText, title: 'Formularios a su medida', text: 'Organice preguntas, selecciones, validaciones, páginas y grupos repetitivos según el operativo.' },
  { icon: Camera, title: 'Evidencias con contexto', text: 'Reúna fotografías, firmas capturadas y ubicación junto a las respuestas de cada visita.' },
  { icon: ClipboardCheck, title: 'Revisión y seguimiento', text: 'Asigne formularios, revise registros y envíe observaciones al profesional que los capturó.' },
  { icon: ShieldCheck, title: 'Información por entidad', text: 'Trabaje con usuarios, roles y permisos para organizar el acceso a cada operación.' },
]

const AUDIENCES = [
  { title: 'Entidades públicas', text: 'Caracterizaciones, seguimiento de programas y diagnósticos en municipios y departamentos.', path: '/caracterizacion-colombia', label: 'Caracterización en Colombia' },
  { title: 'Empresas y corporaciones', text: 'Visitas técnicas, encuestas de servicio, inventarios y levantamiento de información de sus operaciones.', path: '/encuestas-para-empresas', label: 'Soluciones para empresas' },
  { title: 'ONG, fundaciones y organizaciones', text: 'Líneas de base, identificación de necesidades y seguimiento de hogares y beneficiarios.', path: '/encuestas-para-ong', label: 'Soluciones para organizaciones' },
]

const GUIDES = [
  { path: '/blog/software-caracterizacion-social-colombia', image: '/blog/gestion-publica-territorial.jpg', title: 'Cómo organizar una caracterización social en Colombia', text: 'Qué revisar en el instrumento, el equipo y la gestión de la información.', topic: 'Caracterización' },
  { path: '/blog/encuestas-offline-zonas-rurales', image: '/blog/encuestas-offline-rural.jpg', title: 'Encuestas en zonas rurales: prepare su operación offline', text: 'Un recorrido práctico desde la preparación de dispositivos hasta la sincronización.', topic: 'Trabajo de campo' },
  { path: '/blog/control-g-vs-arcgis-survey123', image: '/blog/comparativas-software-campo.jpg', title: 'Control G y ArcGIS Survey123: qué comparar antes de elegir', text: 'Alcance, conectividad e integración para un proyecto de datos de campo.', topic: 'Herramientas GIS' },
]

export default function LandingPage() {
  return (
    <div className="cg-marketing">
      <PublicHeader message={LANDING_SEO.whatsappMessage} placement="cabecera-inicio" />
      <main id="main-content" tabIndex={-1}>
        <section className="cg-hero" aria-labelledby="cg-hero-title">
          <div className="cg-container cg-hero-grid">
            <div className="cg-hero-copy">
              <p className="cg-location"><span aria-hidden="true" /> Desde Colombia, para el territorio latinoamericano</p>
              <h1 id="cg-hero-title">{LANDING_SEO.heading}</h1>
              <p className="cg-hero-lead">{LANDING_SEO.lead}</p>
              <div className="cg-hero-actions">
                <WhatsAppCta message={LANDING_SEO.whatsappMessage} placement="hero-inicio" className="cg-button cg-button-whatsapp">
                  Solicitar una demostración <ArrowRight size={18} aria-hidden="true" />
                </WhatsAppCta>
                <a href="#como-funciona" className="cg-text-link">Conocer cómo funciona</a>
              </div>
              <ul className="cg-hero-assurances" aria-label="Plataformas y alcance">
                <li><Smartphone size={17} aria-hidden="true" /> Aplicación Android y web</li>
                <li><WifiOff size={17} aria-hidden="true" /> Captura offline</li>
                <li><MapPin size={17} aria-hidden="true" /> Datos georreferenciados</li>
              </ul>
            </div>
            <TerritoryPreview />
          </div>
          <div className="cg-container cg-hero-footnote">
            <p>De la visita en campo a la decisión: formularios, evidencias y territorio en una misma operación.</p>
            <a href="#soluciones">Explore las soluciones <ArrowRight size={17} aria-hidden="true" /></a>
          </div>
        </section>

        <section id="soluciones" className="cg-section cg-solutions" aria-labelledby="cg-solutions-title">
          <div className="cg-container">
            <div className="cg-section-heading">
              <h2 id="cg-solutions-title">La información que necesita, desde donde ocurre.</h2>
              <p>Una plataforma para caracterizar comunidades, hacer encuestas y conocer lo que pasa en campo. Configure el instrumento y organice a su equipo alrededor del proyecto.</p>
            </div>
            <div className="cg-solution-grid">
              {SOLUTIONS.map(solution => (
                <Link key={solution.path} to={solution.path} className="cg-solution-link">
                  <solution.icon size={25} strokeWidth={1.65} aria-hidden="true" />
                  <h3>{solution.title}</h3>
                  <p>{solution.description}</p>
                  <span>Explorar solución <ArrowRight size={17} aria-hidden="true" /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="cg-section cg-process-section" aria-labelledby="cg-process-title">
          <div className="cg-container">
            <div className="cg-section-heading">
              <h2 id="cg-process-title">Su operación sigue, aunque se pierda la señal.</h2>
              <p>Prepare la cuenta y los formularios con conexión antes de salir. Después, el equipo puede capturar información y guardarla en el dispositivo hasta recuperar internet.</p>
            </div>
            <ol className="cg-process">
              <li>
                <span className="cg-step-number" aria-hidden="true">1</span>
                <h3>Prepare y asigne</h3>
                <p>Configure el formulario, los territorios y los profesionales. Inicie sesión y descargue las asignaciones en cada dispositivo.</p>
                <span className="cg-process-state">Con conexión antes de salir</span>
              </li>
              <li>
                <span className="cg-step-number" aria-hidden="true">2</span>
                <h3>Capture en campo</h3>
                <p>Diligencie respuestas, registre evidencias y solicite la ubicación GPS disponible, incluso sin datos móviles.</p>
                <span className="cg-process-state"><WifiOff size={15} aria-hidden="true" /> Los registros quedan en el dispositivo</span>
              </li>
              <li>
                <span className="cg-step-number" aria-hidden="true">3</span>
                <h3>Sincronice y analice</h3>
                <p>Al recuperar internet, sincronice la información para revisarla en los paneles, el mapa y las exportaciones del proyecto.</p>
                <span className="cg-process-state">Información disponible para coordinación</span>
              </li>
            </ol>
            <p className="cg-operational-note"><MapPin size={17} aria-hidden="true" /> La ubicación depende de los permisos, la señal y la precisión del dispositivo. La visualización de mapas base requiere conectividad o preparación previa compatible.</p>
          </div>
        </section>

        <section id="features" className="cg-section" aria-labelledby="cg-instrument-title">
          <div className="cg-container cg-instrument-grid">
            <div className="cg-instrument-copy">
              <h2 id="cg-instrument-title">El formulario se adapta al proyecto. El equipo sabe qué hacer.</h2>
              <p>Una caracterización de hogares necesita preguntas distintas a una visita técnica. Construya sus formularios y asigne a cada profesional los instrumentos que le corresponden.</p>
              <div className="cg-capabilities">
                {CAPABILITIES.map(item => (
                  <div key={item.title} className="cg-capability">
                    <item.icon size={22} strokeWidth={1.65} aria-hidden="true" />
                    <div><h3>{item.title}</h3><p>{item.text}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <figure className="cg-form-preview">
              <figcaption><FileText size={18} aria-hidden="true" /><span>Caracterización del hogar</span><span className="cg-example-label">Ejemplo ilustrativo</span></figcaption>
              <div className="cg-form-preview-body">
                <div className="cg-form-progress"><span /> <span /> <span /></div>
                <p className="cg-form-section-name">Condiciones y necesidades del hogar</p>
                <div className="cg-preview-field"><span>Municipio o territorio</span><div>Seleccione una opción <span aria-hidden="true">⌄</span></div></div>
                <div className="cg-preview-field"><span>¿Qué servicios tiene la vivienda?</span><ul><li><span className="cg-preview-check"><Check size={12} aria-hidden="true" /></span> Acueducto</li><li><span className="cg-preview-check"><Check size={12} aria-hidden="true" /></span> Energía eléctrica</li><li><span className="cg-preview-check cg-preview-check-empty" /> Alcantarillado</li></ul></div>
                <div className="cg-preview-evidence"><span><Camera size={19} aria-hidden="true" /> Fotografía</span><span><MapPin size={19} aria-hidden="true" /> Ubicación GPS</span></div>
                <p className="cg-preview-save"><ShieldCheck size={16} aria-hidden="true" /> Respuestas y evidencias en el mismo registro</p>
              </div>
            </figure>
          </div>
          <div className="cg-container">
            <div className="cg-ai-callout">
              <Sparkles size={29} strokeWidth={1.5} aria-hidden="true" />
              <div><h3>De una idea a un cuestionario mejor estructurado.</h3><p>Prepare su cuestionario con apoyo de IA y publíquelo con revisión humana. Podemos acompañarle para definir preguntas, opciones y validaciones antes de configurar el formulario.</p></div>
              <Link to="/encuestas-con-inteligencia-artificial" className="cg-text-link">Conocer el enfoque <ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <section className="cg-section cg-territory-section" aria-labelledby="cg-territory-title">
          <div className="cg-container cg-territory-grid">
            <div className="cg-territory-heading"><Layers3 size={34} strokeWidth={1.3} aria-hidden="true" /><h2 id="cg-territory-title">De respuestas dispersas a una lectura del territorio.</h2></div>
            <div>
              <p>Después de sincronizar, ubique los registros georreferenciados en un mapa territorial. Explore puntos, capas, filtros, agrupaciones, calor y cobertura para entender dónde se ha trabajado y qué zonas requieren atención.</p>
              <ul className="cg-territory-list"><li>Mapa con vista ampliada y herramientas de análisis.</li><li>Capas y archivos geográficos según el formato y alcance del proyecto.</li><li>Información exportable para continuar el análisis en herramientas GIS.</li></ul>
              <p className="cg-territory-clarification">El intercambio con ArcGIS se define según los formatos, las licencias, los servicios y los permisos disponibles. Revisamos la conexión y configuración necesarias para cada caso.</p>
              <Link to="/integracion-arcgis" className="cg-text-link">Explorar GIS y ArcGIS <ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <section id="casos" className="cg-section cg-audiences" aria-labelledby="cg-audiences-title">
          <div className="cg-container">
            <div className="cg-section-heading"><h2 id="cg-audiences-title">Para organizaciones que necesitan conocer su territorio.</h2><p>Desde Colombia y para Latinoamérica, configuramos la operación según su organización, su cuestionario y el lugar donde trabaja.</p></div>
            <div className="cg-audience-grid">
              {AUDIENCES.map(item => <article key={item.path}><Building2 size={25} strokeWidth={1.5} aria-hidden="true" /><h3>{item.title}</h3><p>{item.text}</p><Link to={item.path} className="cg-text-link">{item.label} <ArrowRight size={16} aria-hidden="true" /></Link></article>)}
            </div>
            <div className="cg-latam-line"><Globe2 size={22} aria-hidden="true" /><p><strong>Una operación adaptada al país.</strong> Defina territorios, departamentos o estados, municipios y equipos según el alcance de su proyecto.</p><Link to="/encuestas-offline/colombia" className="cg-text-link">Empezar en Colombia <ArrowRight size={16} aria-hidden="true" /></Link></div>
          </div>
        </section>

        <section className="cg-section cg-guides-section" aria-labelledby="cg-guides-title">
          <div className="cg-container">
            <div className="cg-section-heading cg-heading-with-link"><div><h2 id="cg-guides-title">Mejores decisiones antes de salir a campo.</h2><p>Guías para preparar formularios, comparar herramientas y organizar el levantamiento de información.</p></div><Link to="/blog" className="cg-text-link">Explorar todas las guías <ArrowRight size={17} aria-hidden="true" /></Link></div>
            <div className="cg-guides-grid">
              {GUIDES.map(guide => <article key={guide.path}><Link to={guide.path} className="cg-guide-image" tabIndex={-1} aria-hidden="true"><img src={guide.image} width="640" height="400" alt="" loading="lazy" decoding="async" /></Link><div className="cg-guide-content"><p className="cg-guide-topic">{guide.topic}</p><h3><Link to={guide.path}>{guide.title}</Link></h3><p>{guide.text}</p><Link to={guide.path} className="cg-text-link">Leer la guía <ArrowRight size={16} aria-hidden="true" /></Link></div></article>)}
            </div>
          </div>
        </section>

        <section className="cg-section cg-contact-section" aria-label="Demostración y asesoría de Control G">
          <div className="cg-container cg-contact-intro"><div><p className="cg-provider">Control G, una plataforma de DRAN Digital</p><h2>Conversemos sobre su próxima operación.</h2><p>Cuéntenos qué necesita conocer, dónde hará el levantamiento y cuántas personas trabajarán en campo. Revisamos el formulario, la preparación de dispositivos, la capacitación y el acompañamiento que requiere.</p></div><div className="cg-contact-points"><span><Check size={18} aria-hidden="true" /> Demostración según su caso de uso</span><span><Check size={18} aria-hidden="true" /> Alcance y propuesta antes de iniciar</span><span><Check size={18} aria-hidden="true" /> Atención directa por WhatsApp</span></div></div>
          <div className="cg-container cg-funnel-wrapper"><LeadFunnel source="pagina-principal" /></div>
        </section>

        <section className="cg-section cg-faq-section" aria-labelledby="cg-faq-title">
          <div className="cg-container cg-faq-grid"><div><h2 id="cg-faq-title">Antes de comenzar.</h2><p>Resolvemos las preguntas que ayudan a preparar una operación de información en campo.</p></div><div className="cg-faq-list">{LANDING_SEO.faqs.map(faq => <details key={faq.question}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div></div>
        </section>
      </main>
      <PublicFooter />
      <StickyWhatsApp message={LANDING_SEO.whatsappMessage} />
    </div>
  )
}
