import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowRight, ChevronRight, Clock3, ExternalLink, MapPin } from 'lucide-react'
import { LeadFunnel } from '@/components/marketing/LeadFunnel'
import { StickyWhatsApp, WhatsAppCta } from '@/components/marketing/WhatsAppCta'
import { formatBlogDate, getBlogPost, relatedBlogPosts } from '@/lib/blog'

export default function BlogPostPage() {
  const { slug = '' } = useParams()
  const post = getBlogPost(slug)
  if (!post) return <Navigate to="/blog" replace />
  const related = relatedBlogPosts(post)

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-white/10 bg-[#102d3e] text-white">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Control G, inicio"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 font-black">CG</span><span className="font-black">Control G</span></Link>
          <nav className="flex items-center gap-2 text-sm"><Link to="/blog" className="px-3 py-2 font-semibold text-white/75 hover:text-white">Blog</Link><Link to="/login" className="hidden px-3 py-2 font-semibold text-white/75 hover:text-white sm:block">Clientes</Link><WhatsAppCta message={post.whatsappMessage} placement={`nav-articulo-${post.slug}`} className="rounded-xl bg-[#25D366] px-4 py-2 font-bold text-white">Solicitar demo</WhatsAppCta></nav>
        </div>
      </header>

      <main>
        <article>
          <header className="bg-gradient-to-br from-[#102d3e] via-[#1B3A4B] to-[#2C6E8A] px-5 py-16 text-white sm:py-20">
            <div className="mx-auto max-w-4xl">
              <nav aria-label="Migas de pan" className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white/55"><Link to="/" className="hover:text-white">Inicio</Link><ChevronRight size={13} /><Link to="/blog" className="hover:text-white">Blog</Link><ChevronRight size={13} /><span>{post.category}</span></nav>
              <div className="mt-8 flex flex-wrap gap-2 text-xs font-black uppercase tracking-[.13em]"><span className="rounded-full bg-white/10 px-3 py-1.5 text-teal-200">{post.category}</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-white/70">{post.country}</span></div>
              <h1 className="mt-5 text-4xl font-black leading-[1.08] sm:text-5xl">{post.title}</h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/75">{post.description}</p>
              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/55"><span>Equipo editorial Control G</span><time dateTime={post.updatedAt}>Actualizado {formatBlogDate(post.updatedAt)}</time><span className="inline-flex items-center gap-1"><Clock3 size={15} /> {post.readingMinutes} min de lectura</span><span className="inline-flex items-center gap-1"><MapPin size={15} /> {post.country}</span></div>
            </div>
          </header>

          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 lg:grid-cols-[minmax(0,760px)_280px] lg:items-start">
            <div className="min-w-0">
              <div className="space-y-5 text-lg leading-8 text-slate-700">{post.intro.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>

              <aside className="my-10 rounded-2xl border-l-4 border-teal-500 bg-[#eef7f8] p-6"><p className="font-black text-[#102d3e]">En síntesis</p><p className="mt-2 leading-7 text-slate-700">{post.verdict}</p></aside>

              {post.sections.map((section, index) => (
                <section key={section.title} className="mt-12 scroll-mt-24" id={`seccion-${index + 1}`}>
                  <h2 className="text-3xl font-black leading-tight text-[#102d3e]">{section.title}</h2>
                  <div className="mt-5 space-y-5 text-base leading-8 text-slate-700">{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
                  {section.bullets && <ul className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-6 text-slate-700">{section.bullets.map(item => <li key={item} className="flex gap-3"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-teal-500" /><span>{item}</span></li>)}</ul>}
                </section>
              ))}

              {post.comparison.length > 0 && (
                <section className="mt-12">
                  <h2 className="text-3xl font-black text-[#102d3e]">Comparación funcional</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">Resumen editorial basado en documentación oficial pública consultada para esta actualización. Las condiciones comerciales y funciones pueden cambiar.</p>
                  <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                      <thead className="bg-[#102d3e] text-white"><tr><th className="p-4">Criterio</th><th className="p-4">Control G</th><th className="p-4">Alternativa analizada</th></tr></thead>
                      <tbody>{post.comparison.map((row, index) => <tr key={row.label} className={index % 2 ? 'bg-slate-50' : 'bg-white'}><th className="p-4 font-black text-slate-800">{row.label}</th><td className="p-4 leading-6 text-slate-700">{row.controlG}</td><td className="p-4 leading-6 text-slate-700">{row.alternative}</td></tr>)}</tbody>
                    </table>
                  </div>
                </section>
              )}

              <section className="mt-12 rounded-3xl bg-gradient-to-br from-[#102d3e] to-[#2C6E8A] p-7 text-white sm:p-9"><h2 className="text-2xl font-black">¿Quiere probar este flujo con su formulario?</h2><p className="mt-3 max-w-2xl leading-7 text-white/70">Revisamos su instrumento, territorio y equipo para preparar una demostración útil, incluida una prueba de captura sin conexión.</p><WhatsAppCta message={post.whatsappMessage} placement={`cta-articulo-${post.slug}`} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 font-black text-white">Hablar con un asesor <ArrowRight size={17} /></WhatsAppCta></section>

              <section className="mt-14">
                <h2 className="text-3xl font-black text-[#102d3e]">Preguntas frecuentes</h2>
                <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">{post.faqs.map(faq => <details key={faq.question} className="group py-5"><summary className="cursor-pointer list-none pr-8 font-black text-slate-900">{faq.question}</summary><p className="mt-3 max-w-3xl leading-7 text-slate-600">{faq.answer}</p></details>)}</div>
              </section>

              {post.sources.length > 0 && <section className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6"><h2 className="text-xl font-black text-[#102d3e]">Fuentes consultadas</h2><p className="mt-2 text-xs leading-5 text-slate-500">Las marcas citadas pertenecen a sus respectivos titulares. Verifique directamente funciones, precios y licencias vigentes.</p><ul className="mt-4 space-y-3">{post.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-2 text-sm font-bold text-[#2C6E8A] hover:underline">{source.publisher}: {source.title} <ExternalLink className="mt-0.5 shrink-0" size={14} /></a></li>)}</ul></section>}
            </div>

            <aside className="hidden lg:block lg:sticky lg:top-6"><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/5"><p className="text-xs font-black uppercase tracking-[.16em] text-[#2C6E8A]">Contenido</p><nav className="mt-4 space-y-3 text-sm">{post.sections.map((section, index) => <a key={section.title} href={`#seccion-${index + 1}`} className="block leading-5 text-slate-600 hover:text-[#2C6E8A]">{section.title}</a>)}{post.comparison.length > 0 && <span className="block text-slate-600">Comparación funcional</span>}</nav></div></aside>
          </div>
        </article>

        <section className="bg-slate-50 px-5 py-16"><div className="mx-auto max-w-6xl"><h2 className="text-3xl font-black text-[#102d3e]">También puede interesarle</h2><div className="mt-7 grid gap-5 md:grid-cols-3">{related.map(item => <article key={item.slug} className="rounded-2xl border border-slate-200 bg-white p-6"><span className="text-xs font-black uppercase tracking-widest text-[#2C6E8A]">{item.category}</span><h3 className="mt-3 text-lg font-black leading-snug"><Link to={`/blog/${item.slug}`} className="hover:text-[#2C6E8A]">{item.title}</Link></h3><p className="mt-3 text-sm leading-6 text-slate-600">{item.excerpt}</p><Link to={`/blog/${item.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-black text-green-700">Leer artículo <ArrowRight size={14} /></Link></article>)}</div><div className="mt-12"><LeadFunnel source={`articulo-${post.slug}`} /></div></div></section>
      </main>

      <footer className="bg-[#102d3e] px-5 py-10 text-white/60"><div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 sm:flex-row"><p className="font-bold text-white">Control G <span className="font-normal text-white/45">by DRAN Digital</span></p><nav className="flex flex-wrap gap-5 text-sm"><Link to="/" className="hover:text-white">Inicio</Link><Link to="/blog" className="hover:text-white">Blog</Link><Link to="/login" className="hover:text-white">Clientes</Link></nav></div></footer>
      <StickyWhatsApp message={post.whatsappMessage} />
    </div>
  )
}
