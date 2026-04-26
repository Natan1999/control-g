import { Link } from 'react-router-dom'
import {
  Wifi, WifiOff, BarChart2, FileText, Users, MapPin,
  Camera, PenLine, ArrowRight, CheckCircle2, Shield,
  Smartphone, Globe, ChevronRight, Menu, X,
} from 'lucide-react'
import { useState } from 'react'

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: WifiOff,
    color: '#27AE60',
    title: '100% Offline',
    desc: 'Los profesionales trabajan sin internet. Los datos se sincronizan automáticamente al reconectar.',
  },
  {
    icon: FileText,
    color: '#3D7B9E',
    title: 'Form Builder Visual',
    desc: 'Diseña cualquier formulario sin programar. Arrastra campos, configura validaciones y publica en segundos.',
  },
  {
    icon: BarChart2,
    color: '#E67E22',
    title: 'Analítica en Tiempo Real',
    desc: 'Dashboards con avance por municipio, profesional y actividad. Métricas actualizadas al instante.',
  },
  {
    icon: Camera,
    color: '#8E44AD',
    title: 'Captura Multimedia',
    desc: 'Fotos, videos, firmas digitales y geolocalización directamente desde el celular en campo.',
  },
  {
    icon: MapPin,
    color: '#E74C3C',
    title: 'Cobertura DIVIPOLA',
    desc: 'Base oficial de 1.123 municipios de Colombia integrada. Georreferenciación con códigos DANE.',
  },
  {
    icon: FileText,
    color: '#1B3A4B',
    title: 'Informes PDF',
    desc: 'Genera informes profesionales con fotos, firmas y estadísticas con un solo clic.',
  },
]

const ROLES = [
  {
    role: 'Administrador',
    tag: 'DRAN Digital',
    color: '#1B3A4B',
    items: ['Crea entidades cliente', 'Configura coordinadores', 'Vista global de todas las operaciones'],
  },
  {
    role: 'Coordinador',
    tag: 'Líder operativo',
    color: '#3D7B9E',
    items: ['Diseña formularios personalizados', 'Gestiona equipo y municipios', 'Monitorea avance en tiempo real'],
  },
  {
    role: 'Apoyo Administrativo',
    tag: 'Control de calidad',
    color: '#27AE60',
    items: ['Revisa datos de campo', 'Valida consistencia', 'Envía observaciones a profesionales'],
  },
  {
    role: 'Profesional de Campo',
    tag: 'En terreno',
    color: '#E67E22',
    items: ['App mobile-first', 'Trabaja sin internet', 'Sincronización automática'],
  },
]

const USE_CASES = [
  { emoji: '🏛️', title: 'Secretarías de Gobierno', desc: 'Caracterización de familias con enfoque diferencial' },
  { emoji: '🏘️', title: 'ONG y Fundaciones', desc: 'Censos de vivienda e inventarios comunitarios' },
  { emoji: '⚡', title: 'Servicios Públicos', desc: 'Inventario de medidores y diagnósticos técnicos' },
  { emoji: '🌐', title: 'Conectividad Digital', desc: 'Diagnóstico de brecha digital en hogares rurales' },
  { emoji: '🌿', title: 'Gestión Ambiental', desc: 'Evaluación de infraestructura y condiciones de riesgo' },
  { emoji: '🗳️', title: 'Gestión Política', desc: 'Mapeo de líderes sociales y bases comunitarias' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#1B3A4B' }}>
              <span className="text-white font-black text-base tracking-tighter">CG</span>
            </div>
            <div>
              <span className="font-black text-lg" style={{ color: '#1B3A4B' }}>Control G</span>
              <span className="hidden sm:inline text-xs text-gray-400 ml-2">by DRAN Digital</span>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-[#1B3A4B] transition-colors">Funcionalidades</a>
            <a href="#roles" className="hover:text-[#1B3A4B] transition-colors">Roles</a>
            <a href="#casos" className="hover:text-[#1B3A4B] transition-colors">Casos de Uso</a>
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: '#1B3A4B' }}
            >
              Ingresar
            </Link>
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMenuOpen(v => !v)} className="md:hidden p-2 text-gray-600">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-5 py-4 flex flex-col gap-3">
            {['features', 'roles', 'casos'].map(id => (
              <a
                key={id}
                href={`#${id}`}
                className="text-sm font-medium text-gray-600 hover:text-[#1B3A4B] capitalize py-1"
                onClick={() => setMenuOpen(false)}
              >
                {id === 'features' ? 'Funcionalidades' : id === 'roles' ? 'Roles' : 'Casos de Uso'}
              </a>
            ))}
            <Link
              to="/login"
              className="mt-2 px-4 py-3 rounded-xl text-white text-sm font-semibold text-center"
              style={{ background: '#1B3A4B' }}
            >
              Ingresar a Control G
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="pt-28 pb-24 px-5 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1B3A4B 0%, #0d2535 60%, #1B3A4B 100%)' }}
      >
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-white/80 text-xs font-semibold uppercase tracking-widest mb-8">
            <Globe size={12} />
            control.co — Plataforma SaaS de recolección de datos
          </div>

          <h1 className="text-white text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6">
            Datos de campo,<br />
            <span style={{ color: '#4ECDC4' }}>sin límites de conectividad</span>
          </h1>

          <p className="text-white/70 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Control G es la plataforma que las entidades colombianas necesitan para gestionar operaciones
            de campo con formularios personalizados, trabajo 100% offline y sincronización automática.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-white font-bold text-base transition-transform hover:scale-105 shadow-lg"
              style={{ background: '#27AE60' }}
            >
              Ingresar a la plataforma
              <ArrowRight size={18} />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-white/10 border border-white/20 text-white font-semibold text-base hover:bg-white/20 transition-colors"
            >
              Ver funcionalidades
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-4 sm:gap-8 max-w-xl mx-auto">
            {[
              { n: '4', label: 'Roles de usuario' },
              { n: '1.123', label: 'Municipios DANE' },
              { n: '100%', label: 'Funciona offline' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-white text-2xl sm:text-3xl font-black">{s.n}</div>
                <div className="text-white/50 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OFFLINE BANNER ───────────────────────────────────────────────── */}
      <section className="py-10 px-5" style={{ background: '#F0FDF4' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#27AE60' }}>
            <WifiOff size={26} className="text-white" />
          </div>
          <div>
            <h2 className="font-black text-xl text-gray-900">Diseñada para zonas rurales sin internet</h2>
            <p className="text-gray-600 mt-1 text-sm leading-relaxed max-w-2xl">
              Los profesionales de campo descargan sus tareas al iniciar sesión. Luego trabajan días o semanas
              sin conexión. Cuando hay señal, todo se sincroniza automáticamente con la nube, con fotos, firmas
              y geolocalización incluidas.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-green-100 border border-green-200 rounded-xl px-4 py-2 flex-shrink-0">
            <Wifi size={16} className="text-green-600" />
            <span className="text-green-700 font-bold text-sm whitespace-nowrap">Auto-sync activo</span>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#3D7B9E' }}>Funcionalidades</span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mt-2">Todo lo que tu equipo necesita</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto text-sm leading-relaxed">
              Una sola plataforma para diseñar formularios, recolectar datos en campo y generar informes.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="p-6 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow group">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: f.color + '18' }}
                >
                  <f.icon size={22} style={{ color: f.color }} />
                </div>
                <h3 className="font-bold text-gray-900 mb-1.5">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FORM BUILDER HIGHLIGHT ───────────────────────────────────────── */}
      <section className="py-20 px-5" style={{ background: 'linear-gradient(135deg, #1B3A4B 0%, #2C6E8A 100%)' }}>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-white/50">Form Builder</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-2 mb-5 leading-tight">
              Cualquier formulario,<br />sin programar
            </h2>
            <p className="text-white/70 text-sm leading-relaxed mb-7">
              El Coordinador arrastra y suelta 17 tipos de campo — texto, selección múltiple,
              fotografía, firma digital, geolocalización, grupos repetitivos y más.
              Configura validaciones, lógica condicional y páginas. Publica en segundos.
            </p>
            <ul className="space-y-2.5">
              {[
                'Campos con lógica condicional',
                'Grupos repetitivos (hasta 20 miembros)',
                'Captura de foto, video y firma',
                'Vista previa mobile antes de publicar',
                'Funciona sin internet en el dispositivo',
              ].map(item => (
                <li key={item} className="flex items-center gap-2.5 text-white/80 text-sm">
                  <CheckCircle2 size={16} style={{ color: '#4ECDC4' }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Mock form builder UI */}
          <div className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 p-5 space-y-3">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white font-bold text-sm">Form Builder</span>
              <span className="bg-green-400/20 text-green-300 text-xs px-2.5 py-1 rounded-full font-semibold">Publicado</span>
            </div>
            {[
              { label: 'Nombre completo', type: 'Texto corto', req: true },
              { label: 'Municipio de residencia', type: 'DIVIPOLA', req: true },
              { label: 'Miembros del hogar', type: 'Grupo repetitivo × 20', req: true },
              { label: 'Foto de evidencia', type: 'Fotografía × 3', req: false },
              { label: 'Firma del beneficiario', type: 'Firma digital', req: true },
            ].map(field => (
              <div key={field.label} className="bg-white/10 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-white text-xs font-semibold">
                    {field.label} {field.req && <span className="text-red-400">*</span>}
                  </div>
                  <div className="text-white/40 text-[10px] mt-0.5">{field.type}</div>
                </div>
                <ChevronRight size={14} className="text-white/30" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES ────────────────────────────────────────────────────────── */}
      <section id="roles" className="py-20 px-5 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#3D7B9E' }}>Roles</span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mt-2">Un ecosistema de 4 roles</h2>
            <p className="text-gray-500 mt-3 text-sm max-w-xl mx-auto leading-relaxed">
              Cada actor tiene su panel y permisos. Todos conectados en la misma plataforma.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ROLES.map(r => (
              <div key={r.role} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full mb-4"
                  style={{ background: r.color + '18', color: r.color }}
                >
                  <Shield size={11} />
                  {r.tag}
                </div>
                <h3 className="font-black text-gray-900 mb-3">{r.role}</h3>
                <ul className="space-y-2">
                  {r.items.map(item => (
                    <li key={item} className="flex items-start gap-2 text-gray-500 text-xs leading-relaxed">
                      <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0" style={{ color: r.color }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── USE CASES ────────────────────────────────────────────────────── */}
      <section id="casos" className="py-20 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#3D7B9E' }}>Casos de Uso</span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mt-2">Adaptable a cualquier entidad</h2>
            <p className="text-gray-500 mt-3 text-sm max-w-xl mx-auto leading-relaxed">
              Desde secretarías de gobierno hasta operadores de servicios públicos.
              Control G se adapta porque tú diseñas los formularios.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {USE_CASES.map(uc => (
              <div key={uc.title} className="flex items-start gap-4 p-5 rounded-2xl border border-gray-100 hover:border-[#1B3A4B]/20 hover:shadow-sm transition-all">
                <span className="text-2xl flex-shrink-0">{uc.emoji}</span>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{uc.title}</h3>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{uc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MOBILE SECTION ───────────────────────────────────────────────── */}
      <section className="py-20 px-5 bg-gray-50">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#27AE60' }}>App Móvil</span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mt-2 mb-5 leading-tight">
              Diseñada para el celular<br />del profesional en campo
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-7">
              Interfaz mobile-first con navegación por barra inferior al estilo WhatsApp.
              Fuentes grandes, alto contraste para uso al sol, campos táctiles de al menos 48px.
              Funciona como APK en Android y PWA en cualquier dispositivo.
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { icon: Smartphone, label: 'APK Android' },
                { icon: Globe, label: 'PWA' },
                { icon: WifiOff, label: 'Offline first' },
                { icon: Users, label: 'Multi-rol' },
              ].map(b => (
                <div
                  key={b.label}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border"
                  style={{ borderColor: '#1B3A4B33', color: '#1B3A4B' }}
                >
                  <b.icon size={13} />
                  {b.label}
                </div>
              ))}
            </div>
          </div>

          <div className="order-1 md:order-2 flex justify-center">
            {/* Phone mockup */}
            <div className="w-56 bg-white rounded-[2rem] shadow-2xl border-4 border-gray-200 overflow-hidden">
              <div className="h-5 bg-gray-200 flex items-center justify-center">
                <div className="w-14 h-1 bg-gray-400 rounded-full" />
              </div>
              <div style={{ background: '#1B3A4B' }} className="px-4 py-3">
                <div className="text-white text-xs font-bold">Control G</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-white/60 text-[9px]">Sincronizado</span>
                </div>
              </div>
              <div className="px-3 py-3 space-y-2">
                {['Familia García López', 'Familia Martínez Díaz', 'Familia Rodríguez P.'].map((name, i) => (
                  <div key={name} className="bg-gray-50 rounded-xl p-2.5">
                    <div className="text-gray-800 text-[10px] font-semibold">{name}</div>
                    <div className="flex gap-1 mt-1">
                      {['Ex', 'M1', 'M2', 'M3', 'EP'].map((m, j) => (
                        <div
                          key={m}
                          className={`w-5 h-5 rounded text-[8px] font-bold flex items-center justify-center ${
                            j <= i ? 'text-white' : 'bg-gray-200 text-gray-400'
                          }`}
                          style={j <= i ? { background: '#27AE60' } : {}}
                        >
                          {m}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 flex">
                {['🏠', '👥', '📷', '📄', '👤'].map((icon, i) => (
                  <div
                    key={i}
                    className={`flex-1 py-2 flex items-center justify-center text-sm ${
                      i === 2 ? 'text-white rounded-full mx-1' : ''
                    }`}
                    style={i === 2 ? { background: '#1B3A4B' } : {}}
                  >
                    {icon}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section
        className="py-20 px-5 text-center"
        style={{ background: 'linear-gradient(135deg, #1B3A4B 0%, #2C6E8A 100%)' }}
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
            ¿Listo para digitalizar<br />tu operación de campo?
          </h2>
          <p className="text-white/60 text-sm mb-8 leading-relaxed">
            Accede a tu plataforma o contacta a DRAN Digital para crear tu entidad.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-base hover:opacity-90 transition-opacity shadow-lg"
            style={{ background: '#27AE60' }}
          >
            Ingresar a Control G
            <ArrowRight size={18} />
          </Link>
          <p className="text-white/30 text-xs mt-6">
            control.co · DRAN Digital S.A.S. · Todos los derechos reservados
          </p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="py-8 px-5 border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#1B3A4B' }}>
              <span className="text-white font-black text-xs">CG</span>
            </div>
            <span className="font-bold text-sm" style={{ color: '#1B3A4B' }}>Control G</span>
            <span className="text-gray-400 text-xs">— control.co</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-gray-400">
            <span>DRAN Digital S.A.S.</span>
            <span>·</span>
            <span>Colombia</span>
            <span>·</span>
            <Link to="/login" className="hover:text-[#1B3A4B] font-medium transition-colors">Ingresar</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
