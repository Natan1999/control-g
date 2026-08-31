import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, MapPin, Shield, Wifi, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'
import { Capacitor } from '@capacitor/core'
import { PublicHeader } from '@/components/marketing/PublicHeader'

const LOGIN_WHATSAPP_MESSAGE = 'Hola, quiero conocer Control G para una operación de recolección de información en campo.'

const ROLE_ROUTES: Record<UserRole, string> = {
  admin:        '/admin',
  coordinator:  '/coord',
  support:      '/apoyo',
  professional: '/field',
}

export default function LoginPage() {
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const [attempts, setAttempts] = useState(() => Number(localStorage.getItem('cg_login_attempts') || '0'))
  const [blockedUntil, setBlockedUntil] = useState(() => Number(localStorage.getItem('cg_login_blocked_until') || '0'))
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (blockedUntil <= Date.now()) return
    const interval = setInterval(() => {
      const remaining = Math.ceil((blockedUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        setCountdown(0)
        localStorage.removeItem('cg_login_blocked_until')
        localStorage.removeItem('cg_login_attempts')
        setAttempts(0)
        clearInterval(interval)
      } else {
        setCountdown(remaining)
      }
    }, 1000)
    // Initialize countdown immediately so the UI shows the right value on mount
    setCountdown(Math.ceil((blockedUntil - Date.now()) / 1000))
    return () => clearInterval(interval)
  }, [blockedUntil])

  const isBlocked = countdown > 0

  const { signIn, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  // ── Login real con Supabase ────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isBlocked) return
    clearError()

    try {
      await signIn(email, password)
      // Éxito: limpiar contadores
      localStorage.removeItem('cg_login_attempts')
      localStorage.removeItem('cg_login_blocked_until')
      setAttempts(0)
      setBlockedUntil(0)
      // El store actualiza el user; navegamos según su rol
      const { user: u } = useAuthStore.getState()
      if (u) navigate(ROLE_ROUTES[u.role])
    } catch {
      // Incrementar contador de intentos fallidos
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      localStorage.setItem('cg_login_attempts', String(newAttempts))
      if (newAttempts >= 3) {
        const until = Date.now() + 30000 // 30 segundos
        setBlockedUntil(until)
        localStorage.setItem('cg_login_blocked_until', String(until))
      }
    }
  }


  return (
    <div className="min-h-screen bg-white">
      {!Capacitor.isNativePlatform() && <PublicHeader message={LOGIN_WHATSAPP_MESSAGE} placement="cabecera-login" />}
      <main id="main-content" tabIndex={-1} className={`${Capacitor.isNativePlatform() ? 'min-h-screen' : 'min-h-[calc(100vh-72px)]'} flex bg-brand-dark overflow-hidden`}>
      {/* Panel izquierdo */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #001A33 0%, #003366 100%)' }}
      >
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Floating dots */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full"
            style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [0, -12, 0], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
          />
        ))}

          <div className="relative z-10">
          <div className="mb-8 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[.16em] text-blue-200">Plataforma institucional offline-first</div>

          <h2 className="text-white text-4xl font-black leading-tight">
            Datos del territorio,<br />
            <span className="text-blue-300">siempre disponibles.</span>
          </h2>
          <p className="text-white/70 mt-4 text-lg leading-relaxed">
            Plataforma offline-first para la recolección de datos en campo.
            Trabajamos sin internet, sincronizamos cuando hay señal.
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-3">
          {[
            { icon: <Wifi size={16} />,   text: '100% offline-first — sin internet funciona igual' },
            { icon: <MapPin size={16} />, text: 'Geolocalización y mapas de zona' },
            { icon: <Shield size={16} />, text: 'Acceso por roles y aislamiento seguro por entidad' },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.15 }}
              className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3"
            >
              <span className="text-blue-300">{f.icon}</span>
              <span className="text-white/90 text-sm">{f.text}</span>
            </motion.div>
          ))}
        </div>

        <div className="relative z-10 text-white/30 text-xs">
          © 2026 DRAN Digital · NIT 901.359.114 · Gobernación de Bolívar
        </div>
      </motion.div>

      {/* Panel derecho — Formulario */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white"
      >
        <div className="w-full max-w-md">
          {/* El APK no muestra la navegación comercial, por eso conserva su marca aquí. */}
          {Capacitor.isNativePlatform() && <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-base">CG</span>
            </div>
            <div className="font-black text-xl text-brand-primary">Control G</div>
          </div>}

          <h1 className="text-2xl font-black text-foreground">Iniciar sesión</h1>
          <p className="text-muted-foreground mt-1 mb-8">Accede con tus credenciales institucionales</p>

          {/* Formulario real */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-semibold text-foreground mb-1.5">
                Correo electrónico
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); clearError() }}
                placeholder="tu@organización.gov.co"
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-all"
                autoComplete="email"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'login-error' : undefined}
                disabled={isBlocked}
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-semibold text-foreground mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearError() }}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-14 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-all"
                  autoComplete="current-password"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-error' : undefined}
                  disabled={isBlocked}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                  className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Aviso de intentos previos (2 intentos, antes del bloqueo) */}
            {attempts >= 2 && !isBlocked && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm"
                role="status"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-yellow-600" />
                <span>Si continúas fallando, tu acceso será bloqueado temporalmente.</span>
              </motion.div>
            )}

            {/* Error Supabase */}
            {error && !isBlocked && (
              <motion.div
                id="login-error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
                role="alert"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading || !email || !password || isBlocked}
              className="w-full bg-brand-primary hover:bg-brand-secondary disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 mt-2"
            >
              {isBlocked
                ? `Espera ${countdown}s para reintentar`
                : isLoading
                  ? <><Loader2 size={18} className="animate-spin" /> Verificando...</>
                  : 'Acceder a Control G'
              }
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-8">
            ¿Problemas de acceso? Contacta al administrador de tu organización.
          </p>
        </div>
      </motion.div>
      </main>
    </div>
  )
}
