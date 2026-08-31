import { useEffect, useState } from 'react'
import { KeyRound, Loader2, LogOut, ShieldCheck, Smartphone } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { COLLECTION_IDS, DATABASE_ID, databases } from '@/lib/backend'
import { useAuthStore } from '@/stores/authStore'

type GateState = 'checking' | 'allowed' | 'required'

function MfaChallenge({ onVerified }: { onVerified: () => void }) {
  const signOut = useAuthStore(state => state.signOut)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void (async () => {
      const { data, error: factorsError } = await supabase.auth.mfa.listFactors()
      if (!active) return
      if (factorsError) {
        setError('No fue posible consultar el segundo factor. Intenta de nuevo con conexión a internet.')
      } else {
        const verified = data.totp.find(factor => factor.status === 'verified')
        if (verified) setFactorId(verified.id)
      }
      setLoading(false)
    })()
    return () => { active = false }
  }, [])

  const enroll = async () => {
    setSubmitting(true)
    setError('')
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Control G',
    })
    if (enrollError) setError(enrollError.message)
    else {
      setFactorId(data.id)
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
    }
    setSubmitting(false)
  }

  const verify = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!factorId || !/^\d{6}$/.test(code)) {
      setError('Escribe el código de seis dígitos de tu aplicación autenticadora.')
      return
    }
    setSubmitting(true)
    setError('')
    const { error: verificationError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (verificationError) {
      setError('El código no es válido o venció. Genera uno nuevo e inténtalo otra vez.')
      setSubmitting(false)
      return
    }
    await supabase.auth.refreshSession()
    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    setSubmitting(false)
    if (assurance?.currentLevel === 'aal2') onVerified()
    else setError('Supabase no confirmó el nivel de seguridad AAL2. Intenta de nuevo.')
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <section className="mx-auto mt-8 max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:mt-16 sm:p-8" aria-labelledby="mfa-title">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E9F1F3] text-[#1B3A4B]"><ShieldCheck size={28} /></div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.15em] text-[#3D7B9E]">Acceso institucional protegido</p>
        <h1 id="mfa-title" className="mt-2 text-2xl font-black text-slate-950">Verificación en dos pasos</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Esta entidad exige un segundo factor para administración, coordinación y revisión de información.</p>

        {loading ? <div className="mt-8 flex items-center gap-3 text-sm font-bold text-slate-500"><Loader2 className="animate-spin" /> Consultando seguridad…</div> : !factorId ? (
          <button type="button" onClick={() => void enroll()} disabled={submitting} className="mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1B3A4B] px-4 text-sm font-black text-white disabled:opacity-60">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Smartphone size={18} />} Configurar aplicación autenticadora
          </button>
        ) : (
          <form className="mt-7 space-y-5" onSubmit={verify}>
            {qrCode && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                <img src={qrCode} alt="Código QR para configurar el segundo factor" className="mx-auto h-48 w-48 bg-white" />
                <p className="mt-3 text-xs leading-5 text-slate-600">Escanea el QR con una aplicación TOTP. Si no puedes escanearlo, usa esta clave:</p>
                <code className="mt-2 block break-all rounded-lg bg-white p-2 text-xs font-bold text-slate-800">{secret}</code>
              </div>
            )}
            <label className="block text-xs font-black uppercase tracking-wide text-slate-600">
              Código de seis dígitos
              <div className="relative mt-2"><KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" aria-label="Código de seis dígitos" className="h-12 w-full rounded-xl border border-slate-300 pl-12 pr-4 text-lg font-black tracking-[0.25em] outline-none focus:border-[#3D7B9E]" /></div>
            </label>
            <button disabled={submitting || code.length !== 6} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1B3A4B] px-4 text-sm font-black text-white disabled:opacity-50">{submitting && <Loader2 size={18} className="animate-spin" />} Verificar y continuar</button>
          </form>
        )}
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <button type="button" onClick={() => void signOut()} className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 text-sm font-bold text-slate-500"><LogOut size={16} /> Cerrar sesión</button>
      </section>
    </main>
  )
}

export function MfaGate({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(state => state.user)
  const [state, setState] = useState<GateState>('checking')

  useEffect(() => {
    let active = true
    void (async () => {
      if (!user || user.role === 'professional') {
        if (active) setState('allowed')
        return
      }
      let required = user.role === 'admin' && import.meta.env.VITE_REQUIRE_ADMIN_MFA === 'true'
      if (user.entityId) {
        try {
          const entity = await databases.getDocument(DATABASE_ID, COLLECTION_IDS.ENTITIES, user.entityId)
          required = Boolean(entity.require_mfa_for_privileged)
        } catch {
          // Preserve offline access to cached screens; database RLS enforces AAL2 once online.
          if (active) setState('allowed')
          return
        }
      }
      if (!required) {
        if (active) setState('allowed')
        return
      }
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (active) setState(!error && data.currentLevel === 'aal2' ? 'allowed' : 'required')
    })()
    return () => { active = false }
  }, [user])

  if (state === 'checking') return <div className="min-h-screen grid place-items-center bg-slate-100 text-sm font-bold text-slate-500"><Loader2 className="animate-spin" /></div>
  if (state === 'required') return <MfaChallenge onVerified={() => setState('allowed')} />
  return <>{children}</>
}
