import { useState } from 'react'
import { TopBar } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/stores/authStore'
import { updatePassword } from '@/lib/appwrite-auth'

export default function AdminSettingsPage() {
  const { user } = useAuthStore()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  async function handlePasswordChange() {
    if (!currentPw || !newPw) return
    setSaving(true)
    try {
      await updatePassword(currentPw, newPw)
      setMsg({ text: 'Contraseña actualizada correctamente', ok: true })
      setCurrentPw(''); setNewPw('')
    } catch (e: any) {
      setMsg({ text: e.message || 'Error al actualizar', ok: false })
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(null), 3000)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <TopBar title="Configuración" subtitle="Cuenta y seguridad" />

      <div className="mt-6 space-y-4">
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="font-bold mb-4">Mi cuenta</h2>
          <div className="space-y-3 text-sm">
            <div><span className="text-muted-foreground">Nombre:</span> <span className="font-medium">{user?.fullName}</span></div>
            <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{user?.email}</span></div>
            <div><span className="text-muted-foreground">Rol:</span> <span className="font-medium">Administrador</span></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="font-bold mb-4">Cambiar contraseña</h2>
          <div className="space-y-3">
            <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
              placeholder="Contraseña actual"
              className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30" />
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
              placeholder="Nueva contraseña"
              className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30" />
            {msg && <p className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
            <button onClick={handlePasswordChange} disabled={saving || !currentPw || !newPw}
              className="w-full py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-60"
              style={{ background: '#1B3A4B' }}>
              {saving ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
