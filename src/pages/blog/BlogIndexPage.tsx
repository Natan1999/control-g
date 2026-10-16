import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Clock3, MapPin } from 'lucide-react'
import { LeadFunnel } from '@/components/marketing/LeadFunnel'
import { StickyWhatsApp } from '@/components/marketing/WhatsAppCta'
import { PublicHeader } from '@/components/marketing/PublicHeader'
import { PublicFooter } from '@/components/marketing/PublicFooter'
import { BLOG_META, blogCover, formatBlogDate } from '@/lib/blog'
import { usePublishedBlogPosts } from '@/hooks/useBlogContent'

export default function BlogIndexPage() {
  const [category, setCategory] = useState('Todos')
  const { posts } = usePublishedBlogPosts()
  const categories = useMemo(() => ['Todos', ...new Set(posts.map(post => post.category))], [posts])
  const filteredPosts = category === 'Todos' ? posts : posts.filter(post => post.category === category)
  const featured = filteredPosts.find(post => post.slug === 'crear-encuestas-ia-validacion-humana')
    ?? filteredPosts.find(post => post.slug === 'software-caracterizacion-social-colombia')
    ?? filteredPosts[0]
  const visiblePosts = filteredPosts.filter(post => post.slug !== featured?.slug)
  const lastUpdated = posts.reduce((latest, post) => post.updatedAt > latest ? post.updatedAt : latest, '')

  return (
    <div className="cg-marketing min-h-screen bg-white text-[#132B36]">
      <PublicHeader message={BLOG_META.whatsappMessage} placement="cabecera-blog" />
      <main id="main-content" tabIndex={-1}>
        <section className="border-b border-[#D8E4E9] bg-[#F4F8FA] py-12 sm:py-16">
          <div className="cg-container">
            <p className="flex items-center gap-2 text-xs font-semibold text-[#087E8B]"><BookOpen size={17} aria-hidden="true" /> Guías y recursos de Control G</p>
            <h1 className="!mt-6 max-w-4xl text-[38px] font-extrabold leading-[1.12] tracking-[-.045em] text-[#123B50] sm:text-5xl lg:text-[58px]">Encuestas, caracterización y decisiones en territorio.</h1>
            <p className="!mt-6 max-w-3xl text-base leading-8 text-[#4D6470] sm:text-lg">Guías y comparaciones para preparar cuestionarios con apoyo de IA, recolectar información sin internet y analizar datos georreferenciados. Para empresas, entidades públicas, corporaciones y ONG de Colombia y Latinoamérica.</p>
          </div>
        </section>

        <section className="py-10 sm:py-14" aria-label="Artículos y guías de Control G">
          <div className="cg-container">
            <label className="block text-sm font-bold text-[#123B50] md:hidden">Explorar por tema<select value={category} onChange={event => setCategory(event.target.value)} className="mt-3 min-h-12 w-full rounded-lg border border-[#C8DCE5] bg-white px-3 text-sm font-medium text-[#132B36]">{categories.map(option => <option key={option}>{option}</option>)}</select></label>
            <div className="hidden flex-wrap gap-2 md:flex" role="group" aria-label="Filtrar artículos por categoría">{categories.map(option => <button key={option} type="button" aria-pressed={category === option} onClick={() => setCategory(option)} className={`min-h-11 rounded-md border px-4 py-2 text-xs font-semibold ${category === option ? 'border-[#123B50] bg-[#123B50] text-white' : 'border-[#D8E4E9] bg-white text-[#3C5A66] hover:border-[#087E8B] hover:text-[#087E8B]'}`}>{option}</button>)}</div>
            <p className="!mt-5 text-xs text-[#4D6470]" aria-live="polite">{filteredPosts.length} {filteredPosts.length === 1 ? 'artículo disponible' : 'artículos disponibles'}{category !== 'Todos' ? ` en ${category}` : ''}.</p>

            {featured ? <article className="mt-6 grid overflow-hidden rounded-xl border border-[#C8DCE5] bg-[#F4F8FA] lg:grid-cols-[1.1fr_.9fr]">
              <div className="flex flex-col items-start p-6 sm:p-9 lg:p-10">
                <p className="text-xs font-semibold text-[#087E8B]">Selección editorial · {featured.category}</p>
                <h2 className="!mt-5 text-2xl font-extrabold leading-[1.25] tracking-tight text-[#123B50] sm:text-3xl"><Link to={`/blog/${featured.slug}`} className="hover:text-[#087E8B]">{featured.title}</Link></h2>
                <p className="!mt-4 max-w-xl text-sm leading-7 text-[#4D6470] sm:text-base">{featured.excerpt}</p>
                <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-[#4D6470]"><span className="inline-flex items-center gap-1.5"><Clock3 size={14} aria-hidden="true" />{featured.readingMinutes} min de lectura</span><span>{featured.country}</span></div>
                <Link to={`/blog/${featured.slug}`} className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#146B46]">Leer la guía <ArrowRight size={17} aria-hidden="true" /></Link>
              </div>
              <Link to={`/blog/${featured.slug}`} className="block aspect-[3/2] overflow-hidden bg-[#D8E4E9] lg:aspect-auto" tabIndex={-1} aria-hidden="true"><img src={blogCover(featured)} alt="" className="h-full w-full object-cover" width="1440" height="960" loading="eager" decoding="async" /></Link>
            </article> : <div className="mt-7 rounded-lg border border-[#D8E4E9] bg-[#F4F8FA] p-7"><p className="text-sm leading-7 text-[#4D6470]">Todavía no hay artículos publicados en esta categoría. Explore los demás temas.</p></div>}

            <div className="mt-9 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visiblePosts.map(post => <article key={post.slug} className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-[#D8E4E9] bg-white">
                <Link to={`/blog/${post.slug}`} className="block aspect-[1.7] overflow-hidden bg-[#E8F0F3]" tabIndex={-1} aria-hidden="true"><img src={blogCover(post)} alt="" className="h-full w-full object-cover" width="720" height="480" loading="lazy" decoding="async" /></Link>
                <div className="flex flex-1 flex-col p-6">
                  <p className="text-[11px] font-semibold text-[#087E8B]">{post.category}</p>
                  <h2 className="!mt-3 text-xl font-bold leading-snug tracking-tight text-[#123B50]"><Link to={`/blog/${post.slug}`} className="hover:text-[#087E8B]">{post.title}</Link></h2>
                  <p className="!mt-4 flex-1 text-sm leading-7 text-[#4D6470]">{post.excerpt}</p>
                  <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#E0E9ED] pt-4 text-xs text-[#4D6470]"><span className="inline-flex items-center gap-1.5"><Clock3 size={14} aria-hidden="true" />{post.readingMinutes} min</span><span className="inline-flex items-center gap-1.5"><MapPin size={14} aria-hidden="true" />{post.country}</span></div>
                  <Link to={`/blog/${post.slug}`} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#146B46]">Leer artículo <ArrowRight size={16} aria-hidden="true" /></Link>
                </div>
              </article>)}
            </div>
            {lastUpdated ? <p className="!mt-10 text-xs leading-6 text-[#4D6470]">Contenido editorial actualizado el <time dateTime={lastUpdated}>{formatBlogDate(lastUpdated)}</time>. Las guías y comparaciones incluyen fuentes para profundizar en cada tema.</p> : null}
          </div>
        </section>
        <section className="border-t border-[#D8E4E9] bg-[#F4F8FA] py-14 sm:py-16" aria-label="Solicitar una demostración"><div className="cg-container cg-funnel-wrapper !mt-0"><LeadFunnel source="blog" /></div></section>
      </main>
      <PublicFooter />
      <StickyWhatsApp message={BLOG_META.whatsappMessage} />
    </div>
  )
}
