import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  WifiOff, Smartphone, FileText, Camera, BarChart2, MapPin, Users,
  Shield, CheckCircle, ChevronRight, ChevronDown, Star, Building2,
  Zap, Globe, Download, ArrowRight, Menu, X, Play, ClipboardList,
  Layers, RefreshCw, TrendingUp, Lock, Mail, Phone, ExternalLink,
} from 'lucide-react'

// ─── Data ────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: WifiOff,
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    title: 'Offline-First',
    desc: 'Funciona sin internet en zonas rurales y periféricas. Los datos se sincronizan automáticamente al recuperar señal.',
  },
  {
    icon: Layers,
    color: 'from-emerald-500 to-emerald-600',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    title: 'Form Builder Drag & Drop',
    desc: 'Crea formularios personalizados sin programar. 17 tipos de campo, lógica condicional y validaciones avanzadas.',
  },
  {
    icon: Camera,
    color: 'from-violet-500 to-violet-600',
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    title: 'OCR Inteligente',
    desc: 'Digitaliza formularios en papel con IA. Captura con cámara o carga PDFs, revisión campo por campo con nivel de confianza.',
  },
  {
    icon: MapPin,
    color: 'from-orange-500 to-orange-600',
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    title: 'Georreferenciación Nativa',
    desc: 'Jerarquía DIVIPOLA del DANE integrada. Departamentos, municipios, veredas y barrios de Colombia listos para usar.',
  },
  {
    icon: BarChart2,
    color: 'from-rose-500 to-rose-600',
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    title: 'Analítica en Tiempo Real',
    desc: 'Dashboards con avance por zona, producción diaria, validación de calidad y exportación a Excel / Google Sheets.',
  },
  {
    icon: FileText,
    color: 'from-teal-500 to-teal-600',
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    title: 'Plantillas PDF Imprimibles',
    desc: 'Cada formulario digital genera automáticamente una versión imprimible para trabajo en papel sin smartphone.',
  },
]

const roles = [
  {
    name: 'Superadministrador',
    badge: 'DRAN Digital',
    color: 'from-slate-700 to-slate-900',
    icon: Shield,
    items: ['Gestión de organizaciones y planes', 'Administración global de usuarios', 'Jerarquía geográfica DANE', 'Auditoría y logs del sistema'],
  },
  {
    name: 'Coordinador',
    badge: 'Entidad / ONG',
    color: 'from-blue-600 to-blue-800',
    icon: ClipboardList,
    items: ['Form Builder visual drag & drop', 'Monitoreo de equipo en campo', 'Dashboard analítico avanzado', 'Exportación y reportes'],
  },
  {
    name: 'Técnico de Campo',
    badge: 'Terreno',
    color: 'from-emerald-600 to-emerald-800',
    icon: Smartphone,
    items: ['App mobile-first optimizada', 'Llenado offline con sincronización', 'Escaneo OCR con cámara', 'GPS y captura multimedia'],
  },
]

const useCases = [
  { icon: Building2, title: 'Gobiernos Locales', desc: 'Caracterizaciones socioeconómicas, censos de vivienda, catastros y planes de desarrollo territorial.' },
  { icon: Users, title: 'ONGs y Fundaciones', desc: 'Levantamiento de beneficiarios, diagnósticos comunitarios, seguimiento de proyectos sociales.' },
  { icon: Globe, title: 'Entidades Nacionales', desc: 'DANE, IPSE, IGAC, Ministerios. Operativos de campo a gran escala con miles de técnicos.' },
  { icon: TrendingUp, title: 'Empresas Privadas', desc: 'Consultoras, firmas de ingeniería, empresas de servicios con fieldwork intensivo.' },
]

const stats = [
  { value: '4×', label: 'Más rápido que papel', desc: 'Tiempos de recolección' },
  { value: '99%', label: 'Uptime garantizado', desc: 'Disponibilidad del servicio' },
  { value: '17', label: 'Tipos de campo', desc: 'En el Form Builder' },
  { value: '0%', label: 'Pérdida de datos', desc: 'Con sync automático' },
]

const plans = [
  {
    name: 'Starter',
    price: 'Gratis',
    period: '',
    desc: 'Para proyectos piloto y equipos pequeños',
    color: 'border-slate-200',
    button: 'bg-slate-900 text-white hover:bg-slate-700',
    features: ['Hasta 5 usuarios', '3 formularios activos', '1.000 respuestas/mes', 'OCR: 100 escaneos/mes', 'Soporte por email'],
    popular: false,
  },
  {
    name: 'Professional',
    price: '$290.000',
    period: '/mes',
    desc: 'Para operativos medianos y ONG regionales',
    color: 'border-blue-500 ring-2 ring-blue-500',
    button: 'bg-blue-600 text-white hover:bg-blue-700',
    features: ['Hasta 50 usuarios', '20 formularios activos', '50.000 respuestas/mes', 'OCR ilimitado', 'Analítica avanzada', 'Soporte prioritario 24/7'],
    popular: true,
  },
  {
    name: 'Gobierno',
    price: 'A medida',
    period: '',
    desc: 'Para entidades nacionales y operativos masivos',
    color: 'border-slate-200',
    button: 'bg-green-700 text-white hover:bg-green-800',
    features: ['Usuarios ilimitados', 'Formularios ilimitados', 'Respuestas ilimitadas', 'SLA garantizado', 'Integración con SIGPAN/otros', 'Implementación on-premise', 'Capacitación in situ'],
    popular: false,
  },
]

const faqs = [
  { q: '¿Funciona sin internet en zonas rurales?', a: 'Sí. Control G es offline-first por diseño. Los técnicos pueden recolectar datos, tomar fotos y usar GPS sin ninguna conexión. Todo se sincroniza automáticamente al detectar señal.' },
  { q: '¿Se puede instalar como app en el celular?', a: 'Sí. Control G es una PWA instalable y también se puede empaquetar como APK para Android o IPA para iOS mediante Capacitor.js, sin necesidad de Play Store o App Store.' },
  { q: '¿Qué tan difícil es crear formularios?', a: 'El Form Builder es visual y no requiere programación. Arrastra y suelta campos, configura validaciones, lógica condicional y vistas previas. Un coordinador sin conocimientos técnicos puede crear formularios profesionales en minutos.' },
  { q: '¿Los datos son seguros y cumplen normativas colombianas?', a: 'Sí. Los datos se alojan en servidores con cifrado AES-256, autenticación JWT con MFA, y opciones de despliegue en Colombia para cumplimiento con la Ley 1581 de protección de datos.' },
  { q: '¿Puedo exportar los datos a Excel o conectar con otros sistemas?', a: 'Sí. Control G exporta a Excel, CSV y Google Sheets en un clic. También ofrece API REST para integraciones con sistemas de terceros como SIGPAN, SIGOT o plataformas BI.' },
]

// ─── AnimatedNumber ───────────────────────────────────────────────────────────
function AnimatedNumber({ value }: { value: string }) {
  return <span>{value}</span>
}

// ─── NavBar ───────────────────────────────────────────────────────────────────
function NavBar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-white font-black text-sm">CG</span>
          </div>
          <div>
            <div className={`font-black text-lg leading-none transition-colors ${scrolled ? 'text-slate-900' : 'text-white'}`}>Control G</div>
            <div className={`text-[10px] font-medium leading-none transition-colors ${scrolled ? 'text-blue-600' : 'text-white/70'}`}>by DRAN Digital</div>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-7">
          {['Características', 'Casos de Uso', 'Precios', 'FAQ'].map(label => (
            <a key={label} href={`#${label.toLowerCase().replace(/ /g, '-')}`}
              className={`text-sm font-medium transition-colors hover:text-blue-400 ${scrolled ? 'text-slate-600' : 'text-white/80'}`}>
              {label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className={`text-sm font-medium transition-colors ${scrolled ? 'text-slate-600 hover:text-blue-600' : 'text-white/80 hover:text-white'}`}>
            Iniciar sesión
          </Link>
          <a href="#precios" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors shadow-md shadow-blue-600/30">
            Solicitar demo →
          </a>
        </div>

        {/* Mobile toggle */}
        <button 
          onClick={() => setOpen(!open)} 
          className="md:hidden p-2 text-foreground"
          aria-label={open ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
          aria-expanded={open}
        >
          {open ? <X size={22} className={scrolled ? 'text-slate-900' : 'text-white'} /> : <Menu size={22} className={scrolled ? 'text-slate-900' : 'text-white'} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-white border-t border-slate-100 px-5 py-4 space-y-3">
            {['Características', 'Casos de Uso', 'Precios', 'FAQ'].map(label => (
              <a key={label} href={`#${label.toLowerCase().replace(/ /g, '-')}`}
                onClick={() => setOpen(false)}
                className="block text-sm font-medium text-slate-700 py-1.5">
                {label}
              </a>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <Link to="/login" onClick={() => setOpen(false)}
                className="text-center py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl">
                Iniciar sesión
              </Link>
              <a href="#precios" onClick={() => setOpen(false)}
                className="text-center py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl">
                Solicitar demo
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ children, id, className = '' }: { children: React.ReactNode; id?: string; className?: string }) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <section ref={ref} id={id} className={className}>
      <motion.div initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}>
        {children}
      </motion.div>
    </section>
  )
}

// ─── Main Landing ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-white font-sans" style={{ fontFamily: "'Inter', sans-serif" }}>
      <NavBar />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        {/* Glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-[120px]" />

        <div className="relative max-w-7xl mx-auto px-5 pt-20 pb-16 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/15 border border-blue-500/30 rounded-full text-blue-300 text-xs font-semibold mb-6 tracking-wide">
                <Zap size={12} className="text-blue-400" />
                Plataforma de recolección de datos en campo · Colombia
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.08] mb-6">
                Del papel al dato{' '}
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  verificado
                </span>{' '}
                en campo.
              </h1>
              <p className="text-lg text-white/65 leading-relaxed mb-8 max-w-xl">
                Control G digitaliza operativos de campo para caracterizaciones territoriales en Colombia. Funciona sin internet, automatiza la validación y entrega analítica en tiempo real desde zonas rurales hasta áreas urbanas.
              </p>
              <div className="flex flex-wrap gap-4 mb-10">
                <a href="#precios"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-7 py-3.5 rounded-2xl shadow-xl shadow-blue-600/40 transition-all hover:-translate-y-0.5">
                  Solicitar demo gratuita <ArrowRight size={18} />
                </a>
                <Link to="/login"
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold px-7 py-3.5 rounded-2xl border border-white/20 transition-all backdrop-blur-sm">
                  <Play size={16} /> Ver plataforma
                </Link>
              </div>
              {/* Trust logos */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <span className="text-white/35 text-xs font-medium uppercase tracking-widest">Diseñado para</span>
                {['DANE', 'IPSE', 'Gobernaciones', 'Alcaldías', 'ONGs'].map(e => (
                  <span key={e} className="text-white/55 text-sm font-semibold px-3 py-1 bg-white/8 rounded-lg border border-white/10">{e}</span>
                ))}
              </div>
            </motion.div>

            {/* Right — Dashboard mockup */}
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.15 }}
              className="hidden lg:block">
              <div className="relative">
                {/* Main card */}
                <div className="bg-white/8 backdrop-blur-xl rounded-3xl border border-white/15 p-6 shadow-2xl">
                  {/* Header bar */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <div className="text-white font-bold text-lg">Dashboard Coordinador</div>
                      <div className="text-white/50 text-sm">Proyecto: Caracterización Socioeconómica Cartagena</div>
                    </div>
                    <div className="flex items-center gap-2 bg-green-500/15 text-green-400 text-xs font-semibold px-3 py-1.5 rounded-full border border-green-500/25">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                      En vivo
                    </div>
                  </div>
                  {/* KPIs */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { l: 'Formularios hoy', v: '247', c: 'text-blue-400' },
                      { l: 'Técnicos activos', v: '18', c: 'text-emerald-400' },
                      { l: 'Avance general', v: '36.8%', c: 'text-orange-400' },
                    ].map(k => (
                      <div key={k.l} className="bg-white/5 rounded-2xl p-3 border border-white/10">
                        <div className={`text-2xl font-black ${k.c}`}>{k.v}</div>
                        <div className="text-white/45 text-xs mt-0.5">{k.l}</div>
                      </div>
                    ))}
                  </div>
                  {/* Progress bars */}
                  <div className="space-y-2.5 mb-5">
                    {[
                      { z: 'El Pozón', p: 72, c: 'bg-blue-500' },
                      { z: 'La Boquilla', p: 48, c: 'bg-cyan-500' },
                      { z: 'Nelson Mandela', p: 31, c: 'bg-orange-400' },
                      { z: 'Boston', p: 85, c: 'bg-emerald-500' },
                    ].map(z => (
                      <div key={z.z}>
                        <div className="flex justify-between text-xs text-white/50 mb-1">
                          <span>{z.z}</span><span>{z.p}%</span>
                        </div>
                        <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${z.p}%` }}
                            transition={{ duration: 1.2, delay: 0.5 }}
                            className={`h-full rounded-full ${z.c}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Sync pill */}
                  <div className="flex items-center gap-2 text-xs text-green-400 font-medium">
                    <RefreshCw size={12} className="animate-spin" />
                    Sincronizando 12 formularios pendientes...
                  </div>
                </div>
                {/* Floating offline badge */}
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -top-4 -right-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs font-bold px-4 py-2 rounded-2xl shadow-xl shadow-orange-500/40">
                  Offline-First ✓
                </motion.div>
                {/* Floating mobile card */}
                <motion.div animate={{ y: [0, 4, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                  className="absolute -bottom-8 -left-8 bg-white rounded-2xl shadow-2xl p-4 w-52 border border-slate-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Smartphone size={16} className="text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-slate-900 text-xs font-bold">Ana García · Técnico</div>
                      <div className="text-slate-400 text-[10px]">Sin señal • 3 pendientes</div>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '62%' }} />
                  </div>
                  <div className="text-slate-500 text-[10px] mt-1">62% de meta diaria</div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}
            className="flex flex-col items-center gap-2 text-white/30">
            <span className="text-xs tracking-widest uppercase">Descubrir</span>
            <ChevronDown size={16} />
          </motion.div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-blue-700 to-blue-900 py-12">
        <div className="max-w-7xl mx-auto px-5 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="text-center">
              <div className="text-4xl font-black text-white mb-1">{s.value}</div>
              <div className="text-blue-200 font-semibold text-sm">{s.label}</div>
              <div className="text-blue-300/60 text-xs mt-0.5">{s.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <Section id="características" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full mb-4 tracking-wide uppercase">
              <Zap size={12} /> Capacidades
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Todo lo que necesita un operativo de campo</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">Desde la zona más remota de la Guajira hasta el barrio más denso de Bogotá, Control G trabaja donde otros sistemas fallan.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="group bg-white rounded-3xl p-7 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className={`w-12 h-12 ${f.bg} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <f.icon size={22} className={f.text} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── ROLES ────────────────────────────────────────────────── */}
      <Section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full mb-4 tracking-wide uppercase">
              <Users size={12} /> Roles del Sistema
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Una plataforma, cuatro perfiles</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">Cada rol tiene su propia interfaz optimizada para sus necesidades específicas.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {roles.map((r, i) => (
              <motion.div key={r.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="relative overflow-hidden rounded-3xl">
                <div className={`bg-gradient-to-br ${r.color} p-7 text-white h-full`}>
                  <div className="flex items-center justify-between mb-5">
                    <r.icon size={28} className="opacity-80" />
                    <span className="text-xs font-bold bg-white/15 px-3 py-1 rounded-full">{r.badge}</span>
                  </div>
                  <h3 className="text-xl font-black mb-4">{r.name}</h3>
                  <ul className="space-y-2.5">
                    {r.items.map(item => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-white/80">
                        <CheckCircle size={15} className="text-white/50 flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/login"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold px-8 py-3.5 rounded-2xl transition-colors">
              Ver plataforma en vivo <ExternalLink size={16} />
            </Link>
          </div>
        </div>
      </Section>

      {/* ── USE CASES ────────────────────────────────────────────── */}
      <Section id="casos-de-uso" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full mb-4 tracking-wide uppercase">
              <Globe size={12} /> Casos de Uso
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-4">¿Quién usa Control G?</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">Diseñado para el contexto colombiano: geografía dispersa, conectividad irregular y equipos multidisciplinarios.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((uc, i) => (
              <motion.div key={uc.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
                <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                  <uc.icon size={20} className="text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{uc.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{uc.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <Section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full mb-4 tracking-wide uppercase">
              <Zap size={12} /> Cómo Funciona
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Operativo digital en 4 pasos</h2>
          </div>
          <div className="relative">
            {/* Connecting line */}
            <div className="hidden lg:block absolute left-1/2 top-8 bottom-8 w-0.5 bg-gradient-to-b from-blue-200 to-blue-400 -translate-x-1/2" />
            <div className="space-y-10">
              {[
                { n: '01', title: 'Coordinador diseña el formulario', desc: 'Con el Form Builder drag & drop, crea formularios personalizados en minutos. Define campos, validaciones, saltos condicionales y genera la plantilla PDF automáticamente.', side: 'left', icon: Layers },
                { n: '02', title: 'Técnicos reciben sus asignaciones', desc: 'Descarga los formularios en la app offline. Llega a zona sin señal y empieza a recolectar datos con GPS, fotos y firma digital.', side: 'right', icon: Smartphone },
                { n: '03', title: 'Sincronización automática', desc: 'Al detectar señal WiFi o datos, la app sincroniza todos los formularios, fotos y audios pendientes en segundo plano sin interrumpir el trabajo.', side: 'left', icon: RefreshCw },
                { n: '04', title: 'Analítica y exportación', desc: 'El coordinador visualiza avance en tiempo real, valida respuestas, genera reportes y exporta los datos a Excel, Google Sheets o APIs externas.', side: 'right', icon: BarChart2 },
              ].map((step, i) => (
                <motion.div key={step.n} initial={{ opacity: 0, x: step.side === 'left' ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className={`flex items-center gap-8 ${step.side === 'right' ? 'lg:flex-row-reverse' : ''}`}>
                  <div className={`flex-1 bg-slate-50 rounded-3xl p-7 border border-slate-100 ${step.side === 'right' ? 'lg:text-right' : ''}`}>
                    <div className="text-5xl font-black text-slate-100 mb-2">{step.n}</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                  <div className="hidden lg:flex w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 items-center justify-center flex-shrink-0 shadow-xl shadow-blue-600/30 z-10">
                    <step.icon size={24} className="text-white" />
                  </div>
                  <div className="flex-1 hidden lg:block" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── PRICING ──────────────────────────────────────────────── */}
      <Section id="precios" className="py-24 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full mb-4 tracking-wide uppercase">
              <Star size={12} /> Planes y Precios
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Transparencia total de precios</h2>
            <p className="text-slate-500 text-lg">Sin tarifas ocultas. Sin intermediarios. Sin contratos de largo plazo forzosos.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 items-start">
            {plans.map((plan, i) => (
              <motion.div key={plan.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`relative bg-white rounded-3xl p-8 border-2 ${plan.color} shadow-sm ${plan.popular ? 'shadow-blue-500/20 shadow-xl' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-5 py-2 rounded-full shadow-lg">
                    Más elegido
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-black text-slate-900 mb-1">{plan.name}</h3>
                  <p className="text-slate-500 text-sm mb-4">{plan.desc}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                    {plan.period && <span className="text-slate-400 text-sm">{plan.period}</span>}
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-slate-700">
                      <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="mailto:ventas@drandigital.co"
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-colors ${plan.button}`}>
                  {plan.name === 'Gobierno' ? 'Contactar equipo comercial' : 'Empezar ahora'} →
                </a>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-slate-400 text-sm mt-8">Precios en COP. IVA no incluido. Facturación mensual o anual.</p>
        </div>
      </Section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <Section id="faq" className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full mb-4 tracking-wide uppercase">
              FAQ
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="border border-slate-200 rounded-2xl overflow-hidden">
                <button 
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-slate-50 transition-colors"
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-answer-${i}`}
                >
                  <span className="font-semibold text-slate-900 text-sm pr-4">{faq.q}</span>
                  <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div 
                      id={`faq-answer-${i}`}
                      initial={{ height: 0 }} 
                      animate={{ height: 'auto' }} 
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                      role="region"
                    >
                      <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── CTA FINAL ────────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/20 rounded-full blur-[100px]" />
        <div className="relative max-w-4xl mx-auto px-5 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/40">
              <span className="text-white font-black text-xl">CG</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-6">¿Listo para digitalizar su operativo de campo?</h2>
            <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto">Nuestro equipo le acompaña desde el diseño de formularios hasta la capacitación de técnicos. Empezamos en 48 horas.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="mailto:ventas@drandigital.co"
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-blue-600/40 transition-all hover:-translate-y-0.5">
                <Mail size={18} /> Escribir al equipo comercial
              </a>
              <a href="https://wa.me/573001234567"
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-emerald-600/30 transition-all hover:-translate-y-0.5">
                <Phone size={18} /> WhatsApp directo
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-white py-12">
        <div className="max-w-7xl mx-auto px-5">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-black text-xs">CG</span>
                </div>
                <div>
                  <div className="font-black text-white">Control G</div>
                  <div className="text-blue-400 text-[10px]">by DRAN Digital S.A.S.</div>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Plataforma de recolección de datos en campo para caracterizaciones territoriales en Colombia.</p>
              <div className="text-slate-500 text-xs mt-3">NIT: 901.359.114-1 · Cartagena, Colombia</div>
            </div>
            {[
              { title: 'Plataforma', links: ['Características', 'Precios', 'Casos de uso', 'Seguridad'] },
              { title: 'Empresa', links: ['Sobre DRAN Digital', 'Blog técnico', 'Contacto', 'Soporte'] },
              { title: 'Legal', links: ['Términos de uso', 'Política de privacidad', 'Tratamiento de datos', 'SLA'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="font-bold text-slate-300 mb-4 text-sm">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(l => (
                    <li key={l}>
                      <a href="#" className="text-slate-500 text-sm hover:text-white transition-colors">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">© 2026 DRAN Digital S.A.S. Todos los derechos reservados.</p>
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <Lock size={12} />
              <span>Cifrado AES-256 · Ley 1581 de Protección de Datos · Colombia</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
