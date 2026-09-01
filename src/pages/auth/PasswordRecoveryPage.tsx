import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react'
import { completePasswordRecovery, sendPasswordRecovery } from '@/lib/auth'
import { validateSecurePassword } from '@/lib/password-policy'
import { supabase } from '@/lib/supabase'

type RecoveryMode = 'request' | 'update'

export default function PasswordRecoveryPage({ mode }: { mode: RecoveryMode }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingLink, setCheckingLink] = useState(mode === 'update')
  const [linkReady, setLinkReady] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    if (mode !== 'update') return

    let active = true
    const acceptSession = (hasSession: boolean) => {
      if (!active) return
      setLinkReady(hasSession)
      setCheckingLink(false)
      if (!hasSession) {
        setMessage({ text: 'El enlace de recuperación no es válido o ya venció. Solicita uno nuevo.', ok: false })
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) acceptSession(Boolean(session))
    })

    void supabase.auth.getSession().then(({ data }) => acceptSession(Boolean(data.session)))

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [mode])

  async function requestRecovery(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const redirectUrl = `${window.location.origin}/restablecer-contrasena`
      await sendPasswordRecovery(email, redirectUrl)
      setMessage({
        text: 'Si la cuenta existe, recibirás un enlace de recuperación. Revisa también correo no deseado.',
        ok: true,
      })
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'No fue posible solicitar la recuperación.', ok: false })
    } finally {
      setLoading(false)
    }
  }

  async function updateRecoveredPassword(event: React.FormEvent) {
    event.preventDefault()
    setMessage(null)
    const policyError = validateSecurePassword(password)
    if (policyError) {
      setMessage({ text: policyError, ok: false })
      return
    }
    if (password !== confirmation) {
      setMessage({ text: 'Las contraseñas no coinciden.', ok: false })
      return
    }

    setLoading(true)
    try {
      await completePasswordRecovery(password)
      await supabase.auth.signOut()
      setMessage({ text: 'Contraseña actualizada. Ya puedes iniciar sesión.', ok: true })
      window.setTimeout(() => navigate('/login?password=updated', { replace: true }), 900)
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'No fue posible actualizar la contraseña.', ok: false })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
        <Link to="/login" className="mb-8 inline-flex items-center gap-3 text-slate-900">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1B3A4B] font-black text-white">CG</span>
          <span className="text-xl font-black">Control G</span>
        </Link>

        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#1B3A4B]">
          {mode === 'request' ? <Mail size={22} /> : <LockKeyhole size={22} />}
        </div>
        <h1 className="text-2xl font-black text-slate-950">
          {mode === 'request' ? 'Recuperar contraseña' : 'Crear una nueva contraseña'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {mode === 'request'
            ? 'Te enviaremos un enlace de uso único al correo de tu cuenta.'
            : 'Usa 12 o más caracteres, con mayúscula, minúscula, número y símbolo.'}
        </p>

        {checkingLink ? (
          <div className="mt-8 flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
            <Loader2 size={18} className="animate-spin" /> Validando enlace seguro…
          </div>
        ) : (
          <form onSubmit={mode === 'request' ? requestRecovery : updateRecoveredPassword} className="mt-8 space-y-4">
            {mode === 'request' ? (
              <div>
                <label htmlFor="recovery-email" className="mb-1.5 block text-sm font-bold text-slate-800">Correo electrónico</label>
                <input
                  id="recovery-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="tu@organizacion.gov.co"
                  className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-[#1B3A4B] focus:ring-2 focus:ring-[#1B3A4B]/15"
                />
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="recovery-password" className="mb-1.5 block text-sm font-bold text-slate-800">Nueva contraseña</label>
                  <div className="relative">
                    <input
                      id="recovery-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      className="min-h-12 w-full rounded-xl border border-slate-300 px-4 pr-12 outline-none focus:border-[#1B3A4B] focus:ring-2 focus:ring-[#1B3A4B]/15"
                    />
                    <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="recovery-confirmation" className="mb-1.5 block text-sm font-bold text-slate-800">Confirmar contraseña</label>
                  <input
                    id="recovery-confirmation"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmation}
                    onChange={event => setConfirmation(event.target.value)}
                    className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-[#1B3A4B] focus:ring-2 focus:ring-[#1B3A4B]/15"
                  />
                </div>
              </>
            )}

            {message && (
              <div role={message.ok ? 'status' : 'alert'} className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${message.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
                {message.ok ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> : <AlertCircle size={17} className="mt-0.5 shrink-0" />}
                <span>{message.text}</span>
              </div>
            )}

            <button type="submit" disabled={loading || (mode === 'update' && !linkReady)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1B3A4B] px-4 font-bold text-white hover:bg-[#2a5570] disabled:cursor-not-allowed disabled:opacity-50">
              {loading && <Loader2 size={18} className="animate-spin" />}
              {mode === 'request' ? 'Enviar enlace de recuperación' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}

        <Link to="/login" className="mt-6 block text-center text-sm font-bold text-[#1B3A4B] hover:underline">Volver a iniciar sesión</Link>
      </div>
    </main>
  )
}
