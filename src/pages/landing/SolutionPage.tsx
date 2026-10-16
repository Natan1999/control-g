import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Check, ChevronRight, ClipboardCheck, Globe2, MessageCircle } from 'lucide-react'
import { LeadFunnel } from '@/components/marketing/LeadFunnel'
import { StickyWhatsApp, WhatsAppCta } from '@/components/marketing/WhatsAppCta'
import { PublicHeader } from '@/components/marketing/PublicHeader'
import { PublicFooter } from '@/components/marketing/PublicFooter'
import { CORE_SEO_PAGES, COUNTRY_SEO_PAGES, getSeoPage } from '@/lib/marketing'
import '@/components/marketing/public-marketing.css'
import NotFoundPage from '@/pages/landing/NotFoundPage'

export default function SolutionPage({ path }: { path?: string }) {
  const location = useLocation()
  const page = getSeoPage(path || location.pathname)
  if (!page) return <NotFoundPage />

  const portuguese = page.countryCode === 'BR'
  const relatedPages = CORE_SEO_PAGES.filter(item => item.path !== '/' && item.path !== page.path).slice(0, 4)
  const topic = page.path.slice(1)

  return (
    <div className="cg-marketing cg-solution-page" lang={page.locale || 'es-CO'}>
      <PublicHeader message={page.whatsappMessage} placement={`cabecera-${topic}`} />
      <main id="main-content" tabIndex={-1}>
        <section className="cg-solution-hero" aria-labelledby="cg-solution-title">
          <div className="cg-container">
            <nav aria-label={portuguese ? 'Navegação estrutural' : 'Migas de pan'} className="cg-breadcrumb"><Link to="/">{portuguese ? 'Início' : 'Inicio'}</Link><ChevronRight size={13} aria-hidden="true" /><span>{page.eyebrow}</span></nav>
            <div className="cg-solution-hero-grid">
              <div>
                <h1 id="cg-solution-title">{page.heading}</h1>
                <p className="cg-solution-lead">{page.lead}</p>
                <div className="cg-hero-actions"><WhatsAppCta message={page.whatsappMessage} placement={`hero-${topic}`} className="cg-button cg-button-whatsapp">{portuguese ? 'Solicitar uma demonstração' : 'Solicitar una demostración'}<ArrowRight size={18} aria-hidden="true" /></WhatsAppCta><a href="#como-funciona" className="cg-text-link">{portuguese ? 'Conhecer a solução' : 'Conocer la solución'}</a></div>
              </div>
              <aside className="cg-solution-summary" aria-label={portuguese ? 'Resumo da solução' : 'Resumen de la solución'}><ClipboardCheck size={28} strokeWidth={1.4} aria-hidden="true" /><h2>{portuguese ? 'Uma operação preparada para o campo.' : 'Una operación preparada para el territorio.'}</h2><ul>{page.benefits.slice(0, 3).map(benefit => <li key={benefit}><Check size={16} aria-hidden="true" />{benefit}</li>)}</ul><p>{portuguese ? 'Revisamos seu instrumento, a preparação dos dispositivos e o acompanhamento necessário.' : 'Revisamos su instrumento, la preparación de dispositivos y el acompañamiento que necesita.'}</p></aside>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="cg-section cg-solution-detail" aria-labelledby="cg-detail-title">
          <div className="cg-container">
            <div className="cg-solution-detail-heading"><h2 id="cg-detail-title">{portuguese ? 'Do questionário à informação que sua equipe precisa.' : 'Del cuestionario a la información que su equipo necesita.'}</h2><p>{portuguese ? 'Conheça o alcance da solução e os pontos que definimos antes de iniciar o trabalho de campo.' : 'Conozca el alcance de la solución y los puntos que definimos antes de iniciar el trabajo de campo.'}</p></div>
            <div className="cg-solution-sections">{page.sections.map(section => <article key={section.title}><h3>{section.title}</h3><p>{section.body}</p></article>)}</div>
          </div>
        </section>

        <section className="cg-section cg-solution-capabilities" aria-labelledby="cg-capabilities-title">
          <div className="cg-container cg-solution-benefit-grid"><div><h2 id="cg-capabilities-title">{portuguese ? 'Defina a operação a partir do seu projeto.' : 'Configure la operación a partir de su proyecto.'}</h2><p>{portuguese ? 'Formulários, equipes, territórios e revisão de informações fazem parte do mesmo fluxo de trabalho. A configuração e a capacitação são definidas conforme o alcance contratado.' : 'Formularios, equipos, territorios y revisión de información forman parte del mismo flujo de trabajo. La configuración y la capacitación se definen según el alcance contratado.'}</p><WhatsAppCta message={page.whatsappMessage} placement={`alcance-${topic}`} className="cg-text-link">{portuguese ? 'Conversar sobre meu projeto' : 'Conversar sobre mi proyecto'}<ArrowRight size={17} aria-hidden="true" /></WhatsAppCta></div><ul className="cg-solution-benefits">{page.benefits.map(benefit => <li key={benefit}><Check size={17} aria-hidden="true" /><span>{benefit}</span></li>)}</ul></div>
        </section>

        {page.relatedLinks?.length ? <section className="cg-section cg-solution-resources" aria-labelledby="cg-resources-title"><div className="cg-container"><div className="cg-section-heading"><h2 id="cg-resources-title">{portuguese ? 'Recursos para preparar o próximo passo.' : 'Recursos para preparar el siguiente paso.'}</h2><p>{portuguese ? 'Aprofunde o tema com guias operacionais, critérios de seleção e soluções relacionadas.' : 'Profundice en el tema con guías operativas, criterios de selección y soluciones relacionadas.'}</p></div><nav className="cg-resource-links" aria-label={portuguese ? 'Guias e soluções relacionadas' : 'Guías y soluciones relacionadas'}>{page.relatedLinks.map(item => <Link key={item.path} to={item.path}><span>{item.title}</span><ArrowRight size={18} aria-hidden="true" /></Link>)}</nav></div></section> : null}

        <section className="cg-section cg-solution-contact" aria-label={portuguese ? 'Demonstração da solução' : 'Demostración de la solución'}><div className="cg-container"><div className="cg-solution-contact-heading"><MessageCircle size={27} strokeWidth={1.5} aria-hidden="true" /><div><h2>{portuguese ? 'Vamos revisar sua operação.' : 'Revisemos su operación.'}</h2><p>{portuguese ? 'Conte-nos sobre a organização, o território e o tamanho da equipe para preparar uma demonstração pertinente.' : 'Cuéntenos sobre la organización, el territorio y el tamaño del equipo para preparar una demostración pertinente.'}</p></div></div><div className="cg-funnel-wrapper"><LeadFunnel source={topic} /></div></div></section>

        <section className="cg-section cg-faq-section" aria-labelledby="cg-solution-faq-title"><div className="cg-container cg-faq-grid"><div><h2 id="cg-solution-faq-title">{portuguese ? 'Antes de começar.' : 'Antes de comenzar.'}</h2><p>{portuguese ? 'Respostas para avaliar a solução e preparar o trabalho em campo.' : 'Respuestas para evaluar la solución y preparar el trabajo de campo.'}</p></div><div className="cg-faq-list">{page.faqs.map(faq => <details key={faq.question}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div></div></section>

        <section className="cg-section cg-solution-other" aria-labelledby="cg-other-solutions-title"><div className="cg-container"><div className="cg-section-heading"><h2 id="cg-other-solutions-title">{portuguese ? 'Explore outras soluções do Control G.' : 'Explore otras soluciones de Control G.'}</h2><p>{portuguese ? 'Encontre a abordagem adequada para seus formulários, evidências e análise territorial.' : 'Encuentre el enfoque adecuado para sus formularios, evidencias y análisis territorial.'}</p></div><nav className="cg-other-solutions" aria-label={portuguese ? 'Outras soluções' : 'Otras soluciones'}>{relatedPages.map(item => <Link key={item.path} to={item.path}><h3>{item.heading}</h3><ArrowRight size={18} aria-hidden="true" /></Link>)}</nav></div></section>

        {(page.path === '/encuestas-offline' || page.countryCode) ? <section className="cg-section cg-country-section" aria-labelledby="countries-title"><div className="cg-container"><div className="cg-country-heading"><Globe2 size={29} strokeWidth={1.5} aria-hidden="true" /><div><h2 id="countries-title">{portuguese ? 'Operações de campo na América Latina.' : 'Operaciones de campo en Latinoamérica.'}</h2><p>{portuguese ? 'Consulte o enfoque territorial para cada país.' : 'Consulte el enfoque territorial para cada país.'}</p></div></div><nav className="cg-country-links" aria-label="Soluciones por país">{COUNTRY_SEO_PAGES.map(countryPage => <Link key={countryPage.path} to={countryPage.path} aria-current={countryPage.path === page.path ? 'page' : undefined}>{countryPage.heading.replace(/^Encuestas y caracterización offline en |^Pesquisas e caracterização offline no /, '')}</Link>)}</nav></div></section> : null}
        {page.sources?.length ? <section className="cg-section" aria-labelledby="cg-country-sources"><div className="cg-container"><h2 id="cg-country-sources">{portuguese ? 'Referências para preparar o território' : 'Referencias para preparar el territorio'}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{portuguese ? 'Fontes públicas para consultar divisões e catálogos. Sua inclusão não implica parceria nem integração automática.' : 'Fuentes públicas para consultar divisiones y catálogos. Citarlas no implica alianza ni integración automática.'}</p><ul className="mt-5 space-y-3">{page.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#087E8B] underline underline-offset-4">{source.publisher}: {source.title}</a></li>)}</ul></div></section> : null}
      </main>
      <PublicFooter />
      <StickyWhatsApp message={page.whatsappMessage} />
    </div>
  )
}
