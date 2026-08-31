import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ChevronRight, FileCheck2, MapPin, ShieldCheck, WifiOff } from 'lucide-react'
import { LeadFunnel } from '@/components/marketing/LeadFunnel'
import { StickyWhatsApp, WhatsAppCta } from '@/components/marketing/WhatsAppCta'
import { PublicHeader } from '@/components/marketing/PublicHeader'
import { PublicFooter } from '@/components/marketing/PublicFooter'
import { getSeoPage, SEO_PAGES } from '@/lib/marketing'

const ICONS = [WifiOff, FileCheck2, MapPin, ShieldCheck, CheckCircle2, ChevronRight]

export default function SolutionPage({ path }: { path: string }) {
  const page = getSeoPage(path)
  if (!page) return null

  const relatedPages = SEO_PAGES.filter(item => item.path !== '/' && item.path !== page.path)

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PublicHeader message={page.whatsappMessage} placement={`cabecera-${page.path.slice(1)}`} />

      <main id="main-content" tabIndex={-1}>
        <section className="relative overflow-hidden bg-gradient-to-br from-[#102d3e] via-[#1B3A4B] to-[#2C6E8A] px-5 py-20 text-white sm:py-28">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-teal-300/10 blur-3xl" />
          <div className="relative mx-auto max-w-5xl">
            <nav aria-label="Migas de pan" className="mb-8 flex items-center gap-2 text-xs font-semibold text-white/55">
              <Link to="/" className="hover:text-white">Inicio</Link>
              <ChevronRight size={13} aria-hidden="true" />
              <span>{page.eyebrow}</span>
            </nav>
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-teal-200">{page.eyebrow}</span>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.08] sm:text-5xl lg:text-6xl">{page.heading}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/75 sm:text-xl">{page.lead}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <WhatsAppCta
                message={page.whatsappMessage}
                placement={`hero-${page.path.slice(1)}`}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-7 font-black text-white shadow-xl shadow-black/15 transition hover:-translate-y-0.5 hover:bg-[#20bd5a]"
              >
                Solicitar demostración
                <ArrowRight size={18} aria-hidden="true" />
              </WhatsAppCta>
              <a href="#como-funciona" className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-7 font-bold text-white transition hover:bg-white/15">Conocer cómo funciona</a>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-100 bg-slate-50 px-5 py-8">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 text-center sm:grid-cols-4">
            {[['100%', 'captura offline'], ['Android', 'celulares y tabletas'], ['4 roles', 'operación controlada'], ['1 plataforma', 'campo y oficina']].map(([value, label]) => (
              <div key={label}>
                <div className="text-xl font-black text-[#1B3A4B]">{value}</div>
                <div className="mt-1 text-xs text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="px-5 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-3xl">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[#3D7B9E]">Del formulario a la decisión</span>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Una operación de campo ordenada de principio a fin</h2>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {page.sections.map((section, index) => (
                <article key={section.title} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1B3A4B]/10 font-black text-[#1B3A4B]">{index + 1}</span>
                  <h3 className="mt-5 text-xl font-black text-slate-900">{section.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{section.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f3f8fa] px-5 py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-green-700">Capacidades principales</span>
              <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Configure la plataforma según su proyecto</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">No obligamos a su entidad a trabajar con un cuestionario genérico. El flujo se configura según sus instrumentos, roles, territorios y necesidades de verificación.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {page.benefits.map((benefit, index) => {
                const Icon = ICONS[index % ICONS.length]
                return (
                  <div key={benefit} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-800">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700"><Icon size={17} aria-hidden="true" /></span>
                    {benefit}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <LeadFunnel source={page.path.slice(1)} />
          </div>
        </section>

        <section className="border-y border-slate-100 bg-slate-50 px-5 py-20">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[#3D7B9E]">Preguntas frecuentes</span>
              <h2 className="mt-3 text-3xl font-black text-slate-900">Respuestas para evaluar Control G</h2>
            </div>
            <div className="mt-10 space-y-4">
              {page.faqs.map(faq => (
                <details key={faq.question} className="group rounded-2xl border border-slate-200 bg-white p-5 open:shadow-sm">
                  <summary className="cursor-pointer list-none pr-8 font-black text-slate-900 marker:hidden">{faq.question}</summary>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-black text-slate-900">Explore otras soluciones de Control G</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {relatedPages.map(item => (
                <Link key={item.path} to={item.path} className="group rounded-2xl border border-slate-200 p-5 transition hover:border-[#3D7B9E] hover:shadow-sm">
                  <span className="text-xs font-black uppercase tracking-wide text-[#3D7B9E]">{item.eyebrow}</span>
                  <h3 className="mt-2 font-black text-slate-900 group-hover:text-[#2C6E8A]">{item.heading}</h3>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-green-700">Ver solución <ArrowRight size={15} aria-hidden="true" /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />

      <StickyWhatsApp message={page.whatsappMessage} />
    </div>
  )
}
