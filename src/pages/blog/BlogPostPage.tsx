import { Link, useParams } from 'react-router-dom'
import { ArrowRight, ChevronRight, Clock3, ExternalLink, MapPin } from 'lucide-react'
import { LeadFunnel } from '@/components/marketing/LeadFunnel'
import { StickyWhatsApp, WhatsAppCta } from '@/components/marketing/WhatsAppCta'
import { PublicHeader } from '@/components/marketing/PublicHeader'
import { PublicFooter } from '@/components/marketing/PublicFooter'
import { blogCover, blogCoverAlt, formatBlogDate, relatedBlogPosts } from '@/lib/blog'
import { usePublishedBlogPost } from '@/hooks/useBlogContent'
import NotFoundPage from '@/pages/landing/NotFoundPage'

export default function BlogPostPage() {
  const { slug = '' } = useParams()
  const { post, loading } = usePublishedBlogPost(slug)
  if (loading && !post) return <div className="min-h-screen bg-[#F4F8FA]" aria-busy="true" aria-label="Cargando artículo"><div className="mx-auto h-[84px] max-w-7xl border-b border-[#D8E4E9] bg-white" /><div className="mx-auto h-[520px] max-w-6xl p-8"><p className="text-sm text-[#4D6470]">Cargando artículo…</p></div></div>
  if (!post) return <NotFoundPage />
  const related = relatedBlogPosts(post)

  return (
    <div className="cg-marketing min-h-screen bg-white text-[#132B36]">
      <PublicHeader message={post.whatsappMessage} placement={`cabecera-articulo-${post.slug}`} />
      <main id="main-content" tabIndex={-1}>
        <article>
          <header className="border-b border-[#D8E4E9] bg-[#F4F8FA] py-8 sm:py-12 lg:py-14">
            <div className="cg-container grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)] lg:items-center lg:gap-14">
              <div>
                <nav aria-label="Migas de pan" className="flex flex-wrap items-center gap-2 text-[11px] leading-6 text-[#4D6470]"><Link to="/" className="hover:text-[#087E8B]">Inicio</Link><ChevronRight size={12} aria-hidden="true" /><Link to="/blog" className="hover:text-[#087E8B]">Guías y recursos</Link><ChevronRight size={12} aria-hidden="true" /><span>{post.category}</span></nav>
                <p className="!mt-6 text-xs font-semibold text-[#087E8B]">{post.category}</p>
                <h1 className="!mt-4 text-[36px] font-extrabold leading-[1.14] tracking-[-.04em] text-[#123B50] sm:text-5xl lg:text-[49px]">{post.title}</h1>
                <p className="!mt-6 max-w-3xl text-base leading-8 text-[#4D6470] sm:text-lg">{post.description}</p>
                <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] leading-6 text-[#4D6470]"><span className="font-semibold">Equipo editorial Control G</span><time dateTime={post.updatedAt}>Actualizado {formatBlogDate(post.updatedAt)}</time><span className="inline-flex items-center gap-1.5"><Clock3 size={14} aria-hidden="true" />{post.readingMinutes} min</span><span className="inline-flex items-center gap-1.5"><MapPin size={14} aria-hidden="true" />{post.country}</span></div>
              </div>
              <figure className="overflow-hidden rounded-lg border border-[#CFDFE6] bg-[#E5EEF2]"><img src={blogCover(post)} alt={blogCoverAlt(post)} className="aspect-[3/2] h-full w-full object-cover" width="1440" height="960" loading="eager" decoding="async" /><figcaption className="sr-only">{blogCoverAlt(post)}</figcaption></figure>
            </div>
          </header>

          <div className="cg-container grid gap-12 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start lg:gap-16">
            <div className="min-w-0 max-w-[780px]">
              <div className="space-y-5 text-base leading-8 text-[#354F5B] sm:text-lg">{post.intro.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
              {post.verdict ? <aside className="my-9 border-l-[3px] border-[#087E8B] bg-[#EDF5F6] p-6 sm:my-11 sm:p-7"><p className="text-sm font-bold text-[#123B50]">En síntesis</p><p className="!mt-3 text-[15px] leading-8 text-[#354F5B]">{post.verdict}</p></aside> : null}

              {post.sections.map((section, index) => <section key={section.title} className="mt-11 scroll-mt-28 sm:mt-14" id={`seccion-${index + 1}`}>
                <h2 className="text-2xl font-bold leading-tight tracking-[-.025em] text-[#123B50] sm:text-[30px]">{section.title}</h2>
                <div className="mt-5 space-y-5 text-[15px] leading-8 text-[#354F5B] sm:text-base">{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
                {section.bullets?.length ? <ul className="mt-6 space-y-3 border-y border-[#D8E4E9] bg-[#F4F8FA] px-5 py-6 text-sm leading-7 text-[#354F5B] sm:px-6">{section.bullets.map(item => <li key={item} className="flex gap-3"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#087E8B]" aria-hidden="true" /><span>{item}</span></li>)}</ul> : null}
              </section>)}

              {post.comparison.length > 0 ? <section className="mt-12 scroll-mt-28" id="comparacion">
                <h2 className="text-2xl font-bold tracking-tight text-[#123B50] sm:text-3xl">Comparación funcional</h2>
                <p className="!mt-4 text-sm leading-7 text-[#4D6470]">Resumen editorial basado en documentación oficial pública consultada para esta actualización. Las condiciones comerciales y funciones pueden cambiar.</p>
                <div className="mt-6 overflow-x-auto rounded-lg border border-[#D8E4E9]" role="region" aria-label="Tabla de comparación funcional" tabIndex={0}>
                  <table className="w-full min-w-[620px] border-collapse text-left text-sm"><caption className="sr-only">Comparación de Control G con la alternativa analizada en este artículo</caption><thead className="bg-[#123B50] text-white"><tr><th scope="col" className="p-4 font-semibold">Criterio</th><th scope="col" className="p-4 font-semibold">Control G</th><th scope="col" className="p-4 font-semibold">Alternativa analizada</th></tr></thead><tbody>{post.comparison.map((row, index) => <tr key={row.label} className={index % 2 ? 'bg-[#F4F8FA]' : 'bg-white'}><th scope="row" className="p-4 font-semibold leading-6 text-[#132B36]">{row.label}</th><td className="p-4 leading-7 text-[#354F5B]">{row.controlG}</td><td className="p-4 leading-7 text-[#354F5B]">{row.alternative}</td></tr>)}</tbody></table>
                </div>
              </section> : null}

              {post.relatedLinks?.length ? <section className="mt-12 scroll-mt-28 border-y border-[#D8E4E9] py-7" id="soluciones-relacionadas" aria-labelledby="related-solutions-heading"><h2 id="related-solutions-heading" className="text-2xl font-bold tracking-tight text-[#123B50]">Soluciones relacionadas</h2><nav className="mt-4 grid gap-1" aria-label="Soluciones relacionadas">{post.relatedLinks.map(item => <Link key={item.path} to={item.path} className="inline-flex min-h-12 items-center justify-between gap-6 py-2 text-sm font-semibold leading-7 text-[#087E8B] hover:text-[#123B50]"><span>{item.title}</span><ArrowRight size={17} className="shrink-0" aria-hidden="true" /></Link>)}</nav></section> : null}

              <section className="mt-12 rounded-lg border border-[#C8DCE5] bg-[#EDF5F6] p-6 sm:p-8" aria-labelledby="article-demo-heading"><h2 id="article-demo-heading" className="max-w-2xl text-2xl font-bold leading-snug tracking-tight text-[#123B50]">¿Quiere probar este flujo con su formulario?</h2><p className="!mt-4 max-w-2xl text-sm leading-7 text-[#4D6470]">Revisamos su instrumento, territorio y equipo para preparar una demostración pertinente, incluida una prueba de captura sin conexión.</p><WhatsAppCta message={post.whatsappMessage} placement={`cta-articulo-${post.slug}`} className="mt-6 inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-[#146B46] px-5 py-3 text-sm font-bold text-white hover:bg-[#0E5536]">Hablar con un asesor <ArrowRight size={17} aria-hidden="true" /></WhatsAppCta></section>

              {post.faqs.length ? <section className="mt-12 scroll-mt-28" id="preguntas-frecuentes"><h2 className="text-2xl font-bold tracking-tight text-[#123B50] sm:text-3xl">Preguntas frecuentes</h2><div className="cg-faq-list mt-6">{post.faqs.map(faq => <details key={faq.question}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div></section> : null}

              {post.sources.length > 0 ? <section className="mt-12 scroll-mt-28 rounded-lg border border-[#D8E4E9] bg-[#F4F8FA] p-6" id="fuentes"><h2 className="text-xl font-bold tracking-tight text-[#123B50]">Fuentes consultadas</h2><p className="!mt-3 text-xs leading-6 text-[#4D6470]">{post.comparison.length > 0 ? 'Las marcas citadas pertenecen a sus respectivos titulares. Verifique directamente funciones, precios y licencias vigentes.' : 'Consulte la documentación original para ampliar los conceptos y verificar los requisitos aplicables a su proyecto.'}</p><ul className="mt-5 space-y-4">{post.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-2 text-sm font-semibold leading-7 text-[#087E8B] hover:underline">{source.publisher}: {source.title} <ExternalLink className="mt-1.5 shrink-0" size={14} aria-hidden="true" /></a></li>)}</ul></section> : null}
            </div>

            <aside className="hidden border-l border-[#D8E4E9] pl-6 lg:sticky lg:top-28 lg:block"><p className="text-xs font-bold text-[#123B50]">En este artículo</p><nav aria-label="Contenido del artículo" className="mt-5 space-y-4 text-xs leading-6 text-[#4D6470]">{post.sections.map((section, index) => <a key={section.title} href={`#seccion-${index + 1}`} className="block hover:text-[#087E8B]">{section.title}</a>)}{post.comparison.length > 0 ? <a href="#comparacion" className="block hover:text-[#087E8B]">Comparación funcional</a> : null}{post.relatedLinks?.length ? <a href="#soluciones-relacionadas" className="block hover:text-[#087E8B]">Soluciones relacionadas</a> : null}{post.faqs.length ? <a href="#preguntas-frecuentes" className="block hover:text-[#087E8B]">Preguntas frecuentes</a> : null}{post.sources.length ? <a href="#fuentes" className="block hover:text-[#087E8B]">Fuentes consultadas</a> : null}</nav></aside>
          </div>
        </article>

        <section className="border-t border-[#D8E4E9] bg-[#F4F8FA] py-12 sm:py-16" aria-labelledby="related-articles-heading"><div className="cg-container"><h2 id="related-articles-heading" className="text-3xl font-bold tracking-tight text-[#123B50]">Continúe explorando.</h2><div className="mt-8 grid gap-6 md:grid-cols-3">{related.map(item => <article key={item.slug} className="flex flex-col overflow-hidden rounded-lg border border-[#D8E4E9] bg-white"><Link to={`/blog/${item.slug}`} className="block aspect-[1.7] overflow-hidden" tabIndex={-1} aria-hidden="true"><img src={blogCover(item)} alt="" className="h-full w-full object-cover" width="720" height="480" loading="lazy" decoding="async" /></Link><div className="flex flex-1 flex-col p-6"><p className="text-[11px] font-semibold text-[#087E8B]">{item.category}</p><h3 className="!mt-3 text-lg font-bold leading-snug tracking-tight text-[#123B50]"><Link to={`/blog/${item.slug}`} className="hover:text-[#087E8B]">{item.title}</Link></h3><p className="!mt-4 flex-1 text-sm leading-7 text-[#4D6470]">{item.excerpt}</p><Link to={`/blog/${item.slug}`} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#146B46]">Leer artículo <ArrowRight size={15} aria-hidden="true" /></Link></div></article>)}</div><div className="cg-funnel-wrapper !mt-12"><LeadFunnel source={`articulo-${post.slug}`} /></div></div></section>
      </main>
      <PublicFooter />
      <StickyWhatsApp message={post.whatsappMessage} />
    </div>
  )
}
