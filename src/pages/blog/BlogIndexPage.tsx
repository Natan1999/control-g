import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Clock3, MapPin } from 'lucide-react'
import { LeadFunnel } from '@/components/marketing/LeadFunnel'
import { StickyWhatsApp } from '@/components/marketing/WhatsAppCta'
import { PublicHeader } from '@/components/marketing/PublicHeader'
import { PublicFooter } from '@/components/marketing/PublicFooter'
import { BLOG_META, blogCover, blogCoverAlt, formatBlogDate } from '@/lib/blog'
import { usePublishedBlogPosts } from '@/hooks/useBlogContent'

export default function BlogIndexPage() {
  const [category, setCategory] = useState('Todos')
  const { posts } = usePublishedBlogPosts()
  const categories = useMemo(() => ['Todos', ...new Set(posts.map(post => post.category))], [posts])
  const featured = posts.find(post => post.slug === 'elegir-software-entidades-publicas-latinoamerica') ?? posts[0]
  const visiblePosts = (category === 'Todos' ? posts : posts.filter(post => post.category === category)).filter(post => post.slug !== featured?.slug)

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PublicHeader message={BLOG_META.whatsappMessage} placement="cabecera-blog" />

      <main id="main-content" tabIndex={-1}>
        <section className="bg-gradient-to-br from-[#102d3e] via-[#1B3A4B] to-[#2C6E8A] px-5 py-20 text-white sm:py-24">
          <div className="mx-auto max-w-6xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[.15em] text-teal-200"><BookOpen size={15} /> Centro de conocimiento</span>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight sm:text-5xl">Blog profesional de caracterización y trabajo de campo</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/75">Guías, metodologías y comparaciones verificables para entidades y organizaciones que recolectan información con o sin conexión en Colombia y Latinoamérica.</p>
          </div>
        </section>

        <section className="px-5 py-16">
          <div className="mx-auto max-w-6xl">
            {featured && <Link to={`/blog/${featured.slug}`} className="group grid overflow-hidden rounded-3xl bg-[#eef7f8] ring-1 ring-slate-200 lg:grid-cols-[1.05fr_.95fr]">
              <div className="p-7 sm:p-10">
                <span className="text-xs font-black uppercase tracking-[.17em] text-[#2C6E8A]">Guía destacada · {featured.country}</span>
                <h2 className="mt-4 text-3xl font-black leading-tight text-[#102d3e] group-hover:text-[#2C6E8A]">{featured.title}</h2>
                <p className="mt-4 leading-7 text-slate-600">{featured.excerpt}</p>
                <span className="mt-7 inline-flex items-center gap-2 font-black text-green-700">Leer guía completa <ArrowRight size={17} /></span>
              </div>
              <div className="min-h-72 overflow-hidden bg-[#102d3e]">
                <img src={blogCover(featured)} alt={blogCoverAlt(featured)} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" width="1440" height="960" fetchPriority="high" />
              </div>
            </Link>}

            <div className="mt-12 flex gap-2 overflow-x-auto pb-2" aria-label="Filtrar artículos por categoría">
              {categories.map(option => <button key={option} type="button" aria-pressed={category === option} onClick={() => setCategory(option)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${category === option ? 'bg-[#1B3A4B] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{option}</button>)}
            </div>

            <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {visiblePosts.map(post => (
                <article key={post.slug} className="group flex overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg md:flex-col">
                  <Link to={`/blog/${post.slug}`} className="w-36 shrink-0 overflow-hidden bg-slate-100 md:h-48 md:w-full" tabIndex={-1} aria-hidden="true"><img src={blogCover(post)} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" width="720" height="480" loading="lazy" /></Link>
                  <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
                    <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider"><span className="rounded-full bg-[#e7f3f7] px-3 py-1 text-[#2C6E8A]">{post.category}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{post.country}</span></div>
                    <h2 className="mt-4 text-lg font-black leading-snug text-slate-900 sm:text-xl"><Link to={`/blog/${post.slug}`} className="hover:text-[#2C6E8A]">{post.title}</Link></h2>
                    <p className="mt-3 hidden flex-1 text-sm leading-6 text-slate-600 sm:block">{post.excerpt}</p>
                    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Clock3 size={14} /> {post.readingMinutes} min</span><span className="inline-flex items-center gap-1"><MapPin size={14} /> {post.country}</span></div>
                    <Link to={`/blog/${post.slug}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-black text-green-700">Leer artículo <ArrowRight size={15} /></Link>
                  </div>
                </article>
              ))}
            </div>
            <p className="mt-8 text-center text-xs text-slate-500">Contenido editorial actualizado el {formatBlogDate(posts[0]?.updatedAt || '2026-08-24')}. Las comparaciones citan documentación oficial disponible públicamente.</p>
          </div>
        </section>

        <section className="bg-slate-50 px-5 py-16"><div className="mx-auto max-w-5xl"><LeadFunnel source="blog" /></div></section>
      </main>

      <PublicFooter />
      <StickyWhatsApp message={BLOG_META.whatsappMessage} />
    </div>
  )
}
