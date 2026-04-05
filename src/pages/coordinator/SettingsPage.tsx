import { useState, useEffect } from 'react'
import { User, Lock, Building2, CheckCircle, AlertCircle } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper } from '@/components/shared'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query } from 'appwrite'
import { updatePassword } from '@/lib/appwrite-auth'
import { useAuthStore } from '@/stores/authStore'

export default function SettingsPage() {
  const { user } = useAuthStore()

  // Password form
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  // Entity info
  const [entity, setEntity] = useState<any>(null)
  const [entityLoading, setEntityLoading] = useState(true)

  useEffect(() => {
    if (user?.entityId) loadEntity()
  }, [user?.entityId])

  async function loadEntity() {
    setEntityLoading(true)
    try {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ENTITIES, [
        Query.equal('$id', user!.entityId!), Query.limit(1),
      ])
      setEntity(res.documents[0] ?? null)
    } catch (err) {
      console.error('Error cargando entidad:', err)
      setEntity(null)
    } finally {
      setEntityLoading(false)
    }
  }

  async function handleChangePassword() {
    setPwError('')
    if (!pwForm.current.trim()) { setPwError('Ingresa tu contraseña actual'); return }
    if (pwForm.next.length < 8) { setPwError('La nueva contraseña debe tener al menos 8 caracteres'); return }
    if (pwForm.next !== pwForm.confirm) { setPwError('Las contraseñas no coinciden'); return }

    setPwLoading(true)
    try {
      await updatePassword(pwForm.current, pwForm.next)
      setPwSuccess(true)
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwSuccess(false), 4000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar contraseña'
      setPwError(msg)
    } finally {
      setPwLoading(false)
    }
  }

  const ROLE_LABELS: Record<string, string> = {
    coordinator: 'Coordinador',
    support: 'Apoyo Administrativo',
    professional: 'Profesional',
    admin: 'Administrador',
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <PageWrapper>
      <TopBar
        title="Configuración"
        subtitle="Información de cuenta y preferencias"
      />

      <div className="p-6 space-y-6 max-w-2xl">

        {/* User Info */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#1B3A4B]/10 flex items-center justify-center">
              <User size={16} className="text-[#1B3A4B]" />
            </div>
            <h3 className="font-bold text-foreground">Mi cuenta</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Nombre completo
              </label>
              <p className="text-sm font-medium text-foreground">{user?.fullName ?? '—'}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Correo electrónico
              </label>
              <p className="text-sm font-medium text-foreground">{user?.email ?? '—'}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Rol
              </label>
              <span className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full bg-[#1B3A4B] text-white">
                {ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? '—'}
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Estado
              </label>
              <span className={`inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full ${
                user?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {user?.status === 'active' ? 'Activo' : user?.status ?? '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#1B3A4B]/10 flex items-center justify-center">
              <Lock size={16} className="text-[#1B3A4B]" />
            </div>
            <h3 className="font-bold text-foreground">Cambiar contraseña</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Contraseña actual</label>
              <input
                type="password"
                value={pwForm.current}
                onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Nueva contraseña</label>
              <input
                type="password"
                value={pwForm.next}
                onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                placeholder="Mínimo 8 caracteres"
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={pwForm.confirm}
                onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                placeholder="Repite la nueva contraseña"
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30"
              />
            </div>

            {pwError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{pwError}</p>
              </div>
            )}

            {pwSuccess && (
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle size={15} className="text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700 font-medium">Contraseña actualizada correctamente.</p>
              </div>
            )}

            <button
              onClick={handleChangePassword}
              disabled={pwLoading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B3A4B] text-white text-sm font-semibold hover:bg-[#2a5570] transition-colors disabled:opacity-60"
            >
              {pwLoading ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : 'Actualizar contraseña'}
            </button>
          </div>
        </div>

        {/* Entity Info */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#1B3A4B]/10 flex items-center justify-center">
              <Building2 size={16} className="text-[#1B3A4B]" />
            </div>
            <h3 className="font-bold text-foreground">Información de la entidad</h3>
          </div>

          {entityLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
              <div className="animate-spin w-4 h-4 border-2 border-[#1B3A4B] border-t-transparent rounded-full" />
              Cargando...
            </div>
          ) : entity ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Nombre de la entidad
                </label>
                <p className="text-sm font-medium text-foreground">{entity.name ?? '—'}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  NIT
                </label>
                <p className="text-sm font-medium text-foreground">{entity.nit ?? '—'}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Número de contrato
                </label>
                <p className="text-sm font-medium text-foreground">{entity.contract_number ?? '—'}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Operador
                </label>
                <p className="text-sm font-medium text-foreground">{entity.operator_name ?? '—'}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Inicio del período
                </label>
                <p className="text-sm font-medium text-foreground">{formatDate(entity.period_start)}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Fin del período
                </label>
                <p className="text-sm font-medium text-foreground">{formatDate(entity.period_end)}</p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Objeto del contrato
                </label>
                <p className="text-sm text-foreground leading-relaxed">{entity.contract_object ?? '—'}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">No se encontró información de la entidad. Contacta al administrador.</p>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
