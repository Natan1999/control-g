import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Clock3, MapPin } from 'lucide-react'
import { LeadFunnel } from '@/components/marketing/LeadFunnel'
import { StickyWhatsApp, WhatsAppCta } from '@/components/marketing/WhatsAppCta'
import { BLOG_META, BLOG_POSTS, formatBlogDate } from '@/lib/blog'

export default function BlogIndexPage() {
  const [category, setCategory] = useState('Todos')
  const categories = useMemo(() => ['Todos', ...new Set(BLOG_POSTS.map(post => post.category))], [])
  const visiblePosts = category === 'Todos' ? BLOG_POSTS : BLOG_POSTS.filter(post => post.category === category)
  const featured = BLOG_POSTS.find(post => post.slug === 'elegir-software-entidades-publicas-latinoamerica') ?? BLOG_POSTS[0]

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-white/10 bg-[#102d3e] text-white">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Control G, inicio">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 font-black">CG</span>
            <span className="font-black">Control G</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm" aria-label="Navegación principal">
            <Link to="/software-caracterizacion-social" className="hidden px-3 py-2 font-semibold text-white/70 hover:text-white sm:block">Soluciones</Link>
            <Link to="/login" className="hidden px-3 py-2 font-semibold text-white/70 hover:text-white md:block">Clientes</Link>
            <WhatsAppCta message={BLOG_META.whatsappMessage} placement="nav-blog" className="rounded-xl bg-[#25D366] px-4 py-2 font-bold text-white">Solicitar demo</WhatsAppCta>
          </nav>
        </div>
      </header>

      <main>
        <section className="bg-gradient-to-br from-[#102d3e] via-[#1B3A4B] to-[#2C6E8A] px-5 py-20 text-white sm:py-24">
          <div className="mx-auto max-w-6xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[.15em] text-teal-200"><BookOpen size={15} /> Centro de conocimiento</span>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight sm:text-5xl">Blog profesional de caracterización y trabajo de campo</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/75">Guías, metodologías y comparaciones verificables para entidades y organizaciones que recolectan información con o sin conexión en Colombia y Latinoamérica.</p>
          </div>
        </section>

        <section className="px-5 py-16">
          <div className="mx-auto max-w-6xl">
            <Link to={`/blog/${featured.slug}`} className="group grid overflow-hidden rounded-3xl bg-[#eef7f8] ring-1 ring-slate-200 lg:grid-cols-[1.05fr_.95fr]">
              <div className="p-7 sm:p-10">
                <span className="text-xs font-black uppercase tracking-[.17em] text-[#2C6E8A]">Guía destacada · {featured.country}</span>
                <h2 className="mt-4 text-3xl font-black leading-tight text-[#102d3e] group-hover:text-[#2C6E8A]">{featured.title}</h2>
                <p className="mt-4 leading-7 text-slate-600">{featured.excerpt}</p>
                <span className="mt-7 inline-flex items-center gap-2 font-black text-green-700">Leer guía completa <ArrowRight size={17} /></span>
              </div>
              <div className="flex min-h-64 items-center justify-center bg-gradient-to-br from-[#1B3A4B] to-[#2C6E8A] p-10 text-center text-white">
                <div><BookOpen className="mx-auto text-teal-300" size={54} /><p className="mt-5 text-2xl font-black">Decisiones informadas para operativos territoriales</p><p className="mt-3 text-sm text-white/65">Metodología · Offline · Gestión pública</p></div>
              </div>
            </Link>

            <div className="mt-12 flex gap-2 overflow-x-auto pb-2" aria-label="Filtrar artículos por categoría">
              {categories.map(option => <button key={option} type="button" onClick={() => setCategory(option)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${category === option ? 'bg-[#1B3A4B] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{option}</button>)}
            </div>

            <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {visiblePosts.map(post => (
                <article key={post.slug} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-[#e7f3f7] px-3 py-1 text-[#2C6E8A]">{post.category}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{post.country}</span></div>
                  <h2 className="mt-5 text-xl font-black leading-snug text-slate-900"><Link to={`/blog/${post.slug}`} className="hover:text-[#2C6E8A]">{post.title}</Link></h2>
                  <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{post.excerpt}</p>
                  <div className="mt-6 flex items-center gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Clock3 size={14} /> {post.readingMinutes} min</span><span className="inline-flex items-center gap-1"><MapPin size={14} /> {post.country}</span></div>
                  <Link to={`/blog/${post.slug}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-black text-green-700">Leer artículo <ArrowRight size={15} /></Link>
                </article>
              ))}
            </div>
            <p className="mt-8 text-center text-xs text-slate-500">Contenido editorial actualizado el {formatBlogDate('2026-08-24')}. Las comparaciones citan documentación oficial disponible públicamente.</p>
          </div>
        </section>

        <section className="bg-slate-50 px-5 py-16"><div className="mx-auto max-w-5xl"><LeadFunnel source="blog" /></div></section>
      </main>

      <footer className="bg-[#102d3e] px-5 py-10 text-white/60"><div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 sm:flex-row"><p className="font-bold text-white">Control G <span className="font-normal text-white/45">by DRAN Digital</span></p><nav className="flex flex-wrap gap-5 text-sm"><Link to="/" className="hover:text-white">Inicio</Link><Link to="/blog" className="text-white">Blog</Link><Link to="/login" className="hover:text-white">Clientes</Link></nav></div></footer>
      <StickyWhatsApp message={BLOG_META.whatsappMessage} />
    </div>
  )
}
