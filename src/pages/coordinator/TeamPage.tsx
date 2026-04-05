import { useState, useEffect } from 'react'
import { UserPlus, X, Check, Users } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper } from '@/components/shared'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query, ID } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'

const ROLE_LABELS: Record<string, string> = {
  coordinator: 'Coordinador',
  support: 'Apoyo Administrativo',
  professional: 'Profesional',
}

const ROLE_COLORS: Record<string, string> = {
  coordinator: 'bg-[#1B3A4B] text-white',
  support: 'bg-[#3D7B9E] text-white',
  professional: 'bg-[#27AE60] text-white',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  suspended: 'bg-red-100 text-red-600',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
}

type InviteRole = 'coordinator' | 'support' | 'professional'

export default function TeamPage() {
  const { user } = useAuthStore()
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState('')

  const [form, setForm] = useState({ full_name: '', email: '', role: 'professional' as InviteRole })
  const [inviting, setInviting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (user?.entityId) loadMembers()
  }, [user?.entityId])

  async function loadMembers() {
    setLoading(true)
    try {
      const res = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.USER_PROFILES,
        [Query.equal('entity_id', user!.entityId!), Query.limit(100)]
      )
      setMembers(res.documents)
    } catch (err) {
      console.error('Error cargando equipo:', err)
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite() {
    if (!form.full_name.trim() || !form.email.trim()) {
      setFormError('Nombre y email son requeridos')
      return
    }
    setInviting(true)
    setFormError('')
    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_IDS.USER_PROFILES,
        ID.unique(),
        {
          user_id: ID.unique(),
          full_name: form.full_name,
          email: form.email.trim().toLowerCase(),
          entity_id: user?.entityId ?? null,
          role: form.role,
          status: 'active',
          signature_url: null,
          phone: null,
          avatar_url: null,
          last_seen_at: null,
          last_sync_at: null,
        }
      )
      showToast('Invitación enviada. El miembro debe registrarse con este email.')
      setShowModal(false)
      setForm({ full_name: '', email: '', role: 'professional' })
      loadMembers()
    } catch (err) {
      console.error('Error invitando miembro:', err)
      setFormError('Error al crear el perfil. Intenta de nuevo.')
    } finally {
      setInviting(false)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  function closeModal() {
    setShowModal(false)
    setForm({ full_name: '', email: '', role: 'professional' })
    setFormError('')
  }

  const grouped: Record<string, any[]> = {
    coordinator: members.filter(m => m.role === 'coordinator'),
    support: members.filter(m => m.role === 'support'),
    professional: members.filter(m => m.role === 'professional'),
  }

  return (
    <PageWrapper>
      <TopBar
        title="Equipo"
        subtitle="Gestión de Coordinador, Apoyo Administrativo y Profesionales"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#1B3A4B] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2a5570] transition-colors"
          >
            <UserPlus size={16} /> Invitar miembro
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <div className="animate-spin w-6 h-6 border-2 border-[#1B3A4B] border-t-transparent rounded-full mr-3" />
            Cargando equipo...
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Users size={48} className="mx-auto mb-4 opacity-25" />
            <p className="font-semibold text-base">Invita a tu equipo para comenzar</p>
            <p className="text-sm mt-1">Agrega coordinadores, apoyo administrativo y profesionales.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([role, list]) => {
            if (list.length === 0) return null
            return (
              <div key={role}>
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  {ROLE_LABELS[role]} ({list.length})
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {list.map((m: any) => (
                    <div key={m.$id} className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-full bg-[#1B3A4B]/10 flex items-center justify-center text-[#1B3A4B] font-bold text-sm flex-shrink-0">
                          {(m.full_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex gap-1.5 flex-wrap justify-end">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[m.role] ?? 'bg-gray-100 text-gray-600'}`}>
                            {ROLE_LABELS[m.role] ?? m.role}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[m.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {STATUS_LABELS[m.status] ?? m.status}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground leading-snug">{m.full_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{m.email ?? '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 bg-[#1B3A4B] text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium">
          <Check size={16} className="text-green-400" />
          {toast}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Invitar miembro</h2>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Nombre completo</label>
                <input
                  value={form.full_name}
                  onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Ej: María García López"
                  className="w-full px-4 py-2.5 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Correo electrónico</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="correo@entidad.gov.co"
                  className="w-full px-4 py-2.5 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Rol</label>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value as InviteRole }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30"
                >
                  <option value="coordinator">Coordinador</option>
                  <option value="support">Apoyo Administrativo</option>
                  <option value="professional">Profesional</option>
                </select>
              </div>
              {formError && <p className="text-sm text-red-500">{formError}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1B3A4B] text-white text-sm font-medium hover:bg-[#2a5570] transition-colors disabled:opacity-60"
              >
                {inviting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Invitando...
                  </>
                ) : (
                  'Invitar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
