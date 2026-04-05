import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, RefreshCw, User, PenLine } from 'lucide-react'
import { MobileTopBar, BottomNav } from '@/components/layout/BottomNav'
import { useAuthStore } from '@/stores/authStore'
import { useSyncStore } from '@/stores/syncStore'
import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function FieldProfilePage() {
  const { user, signOut } = useAuthStore()
  const { status, pendingCount, setSyncComplete, setStatus } = useSyncStore()
  const navigate = useNavigate()

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const handleSync = () => {
    setStatus('syncing')
    setTimeout(() => setSyncComplete(), 2000)
  }

  const handlePwSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    if (pwForm.next.length < 8) { setPwError('La nueva contraseña debe tener al menos 8 caracteres.'); return }
    if (pwForm.next !== pwForm.confirm) { setPwError('Las contraseñas no coinciden.'); return }
    // Password change would call Appwrite account.updatePassword here
    alert('Funcionalidad de cambio de contraseña disponible próximamente.')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileTopBar title="Mi Perfil" />

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Profile header */}
        <div
          className="px-5 pt-6 pb-10 flex flex-col items-center"
          style={{ background: 'linear-gradient(135deg, #1B3A4B 0%, #2C6E8A 100%)' }}
        >
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-2xl font-black mb-3">
            {getInitials(user?.fullName || 'P')}
          </div>
          <h1 className="text-white text-xl font-black">{user?.fullName}</h1>
          <p className="text-white/70 text-sm mt-0.5">Profesional de Campo</p>
          <p className="text-white/50 text-xs mt-1">{user?.email}</p>
        </div>

        {/* Sync section */}
        <div className="mx-4 -mt-5">
          <div className="bg-white rounded-2xl border border-border p-5 shadow-md">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <RefreshCw size={15} style={{ color: '#1B3A4B' }} />
              Sincronización
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estado</span>
                <span className={cn('font-semibold text-xs', {
                  'text-green-600': status === 'synced',
                  'text-yellow-600': status === 'syncing',
                  'text-red-500': status === 'offline' || status === 'error',
                })}>
                  {status === 'synced' ? 'Todo sincronizado' : status === 'syncing' ? 'Sincronizando...' : `${pendingCount} pendientes`}
                </span>
              </div>
              {user?.lastSyncAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Última sincronización</span>
                  <span className="text-xs font-medium">
                    {new Date(user.lastSyncAt).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              <button
                onClick={handleSync}
                disabled={status === 'syncing'}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition-opacity"
                style={{ background: '#1B3A4B' }}
              >
                <RefreshCw size={16} className={status === 'syncing' ? 'animate-spin' : ''} />
                {status === 'syncing' ? 'Sincronizando...' : 'Sincronizar ahora'}
              </button>
            </div>
          </div>
        </div>

        {/* Signature section */}
        <div className="mx-4 mt-4">
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <PenLine size={15} style={{ color: '#1B3A4B' }} />
              Tu firma digital
            </h3>
            <p className="text-xs text-muted-foreground mb-3">Se usa en todos los informes y actividades.</p>
            {user?.signatureUrl ? (
              <div className="rounded-xl border border-border overflow-hidden bg-gray-50">
                <img src={user.signatureUrl} alt="Firma digital" className="w-full h-32 object-contain" />
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center">
                <PenLine size={28} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-muted-foreground">No tienes firma registrada aún.</p>
                <p className="text-xs text-muted-foreground mt-1">Regístrala en tu primera actividad.</p>
              </div>
            )}
          </div>
        </div>

        {/* Change password */}
        <div className="mx-4 mt-4">
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <User size={15} style={{ color: '#1B3A4B' }} />
              Cambiar contraseña
            </h3>
            <form onSubmit={handlePwSubmit} className="space-y-3">
              {(['current', 'next', 'confirm'] as const).map((field, i) => (
                <input
                  key={field}
                  type="password"
                  placeholder={['Contraseña actual', 'Nueva contraseña', 'Confirmar nueva contraseña'][i]}
                  value={pwForm[field]}
                  onChange={e => setPwForm(f => ({ ...f, [field]: e.target.value }))}
                  className="w-full px-4 py-3 border border-input rounded-xl text-sm focus:outline-none focus:ring-2"
                />
              ))}
              {pwError && <p className="text-xs text-red-500 font-medium">{pwError}</p>}
              <button
                type="submit"
                className="w-full py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                style={{ background: '#1B3A4B' }}
              >
                Actualizar contraseña
              </button>
            </form>
          </div>
        </div>

        {/* Logout */}
        <div className="mx-4 mt-4 mb-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-50 border border-red-200 text-red-600 rounded-2xl font-semibold text-sm hover:bg-red-100 transition-colors"
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
