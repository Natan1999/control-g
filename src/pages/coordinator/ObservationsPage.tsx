import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Plus, X, Eye, ChevronDown } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper } from '@/components/shared'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query, ID } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'

type ObservationType = 'observation' | 'correction' | 'approval'

const TYPE_LABELS: Record<ObservationType, string> = {
  observation: 'Observación',
  correction: 'Corrección',
  approval: 'Aprobación',
}

const TYPE_COLORS: Record<ObservationType, string> = {
  observation: 'bg-blue-100 text-blue-700',
  correction: 'bg-orange-100 text-orange-700',
  approval: 'bg-green-100 text-green-700',
}

export default function ObservationsPage() {
  const { user } = useAuthStore()
  const [observations, setObservations] = useState<any[]>([])
  const [professionals, setProfessionals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [toast, setToast] = useState('')

  const defaultForm = { to_user_id: '', content: '', type: 'observation' as ObservationType }
  const [form, setForm] = useState({ ...defaultForm })

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [obsRes, profRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.OBSERVATIONS, [
          Query.equal('entity_id', user!.entityId!),
          Query.limit(200),
          Query.orderDesc('$createdAt'),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.USER_PROFILES, [
          Query.equal('entity_id', user!.entityId!),
          Query.equal('role', 'professional'),
          Query.limit(100),
        ]),
      ])
      setObservations(obsRes.documents)
      setProfessionals(profRes.documents)
    } catch (err) {
      console.error('Error cargando observaciones:', err)
      setObservations([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user?.entityId) loadAll()
  }, [user?.entityId, loadAll])

  function getUserName(id: string): string {
    const found = professionals.find(p => p.$id === id || p.user_id === id)
    return found?.full_name ?? id
  }

  async function handleSave() {
    if (!form.to_user_id) {
      setSaveError('Selecciona un profesional')
      return
    }
    if (!form.content.trim()) {
      setSaveError('El contenido es requerido')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_IDS.OBSERVATIONS,
        ID.unique(),
        {
          entity_id: user?.entityId,
          from_user_id: user?.id,
          to_user_id: form.to_user_id,
          content: form.content,
          type: form.type,
          read: false,
        }
      )
      setToast('Observación enviada correctamente')
      setTimeout(() => setToast(''), 3500)
      setShowModal(false)
      setForm({ ...defaultForm })
      loadAll()
    } catch (err) {
      console.error('Error guardando observación:', err)
      setSaveError('Error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function markAsRead(docId: string) {
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.OBSERVATIONS, docId, { read: true })
      setObservations(prev => prev.map(o => o.$id === docId ? { ...o, read: true } : o))
    } catch (err) {
      console.error('Error marcando como leída:', err)
    }
  }

  const unreadCount = observations.filter(o => !o.read).length

  return (
    <PageWrapper>
      <TopBar
        title="Observaciones"
        subtitle="Anotaciones y solicitudes a Profesionales"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#1B3A4B] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2a5570] transition-colors"
          >
            <Plus size={16} /> Nueva observación
          </button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Stats pill */}
        {unreadCount > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-sm font-medium">
            <MessageSquare size={14} />
            {unreadCount} observación{unreadCount !== 1 ? 'es' : ''} sin leer
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <div className="animate-spin w-6 h-6 border-2 border-[#1B3A4B] border-t-transparent rounded-full mr-3" />
            Cargando observaciones...
          </div>
        ) : observations.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <MessageSquare size={48} className="mx-auto mb-4 opacity-25" />
            <p className="font-semibold text-base">Sin observaciones aún</p>
            <p className="text-sm mt-1">Crea una nueva observación para los profesionales de tu equipo.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {observations.map((obs: any) => {
              const typeLabel = TYPE_LABELS[obs.type as ObservationType] ?? obs.type
              const typeCls = TYPE_COLORS[obs.type as ObservationType] ?? 'bg-gray-100 text-gray-600'
              const date = obs.$createdAt
                ? new Date(obs.$createdAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
                : ''

              return (
                <div
                  key={obs.$id}
                  className={`bg-card rounded-2xl border p-4 transition-shadow hover:shadow-md ${obs.read ? 'border-border' : 'border-[#1B3A4B]/30 shadow-sm'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeCls}`}>
                          {typeLabel}
                        </span>
                        {!obs.read && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#1B3A4B]/10 text-[#1B3A4B]">
                            No leída
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{date}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">
                        De: <span className="font-medium text-foreground">{getUserName(obs.from_user_id)}</span>
                        {' → '}
                        Para: <span className="font-medium text-foreground">{getUserName(obs.to_user_id)}</span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{obs.content}</p>
                    </div>
                    {!obs.read && (
                      <button
                        onClick={() => markAsRead(obs.$id)}
                        title="Marcar como leída"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                      >
                        <Eye size={13} /> Marcar leída
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-[#1B3A4B] text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Nueva Observación</h2>
              <button onClick={() => { setShowModal(false); setForm({ ...defaultForm }); setSaveError('') }} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Profesional destinatario</label>
                <div className="relative">
                  <select
                    value={form.to_user_id}
                    onChange={e => setForm(p => ({ ...p, to_user_id: e.target.value }))}
                    className="w-full appearance-none px-4 py-2.5 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30 pr-9"
                  >
                    <option value="">Seleccionar profesional...</option>
                    {professionals.map((p: any) => (
                      <option key={p.$id} value={p.$id}>{p.full_name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Tipo</label>
                <div className="relative">
                  <select
                    value={form.type}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value as ObservationType }))}
                    className="w-full appearance-none px-4 py-2.5 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30 pr-9"
                  >
                    <option value="observation">Observación</option>
                    <option value="correction">Corrección</option>
                    <option value="approval">Aprobación</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Contenido</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  rows={4}
                  placeholder="Escribe la observación aquí..."
                  className="w-full px-4 py-2.5 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30 resize-none"
                />
              </div>

              {saveError && <p className="text-sm text-red-500">{saveError}</p>}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowModal(false); setForm({ ...defaultForm }); setSaveError('') }}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1B3A4B] text-white text-sm font-medium hover:bg-[#2a5570] transition-colors disabled:opacity-60"
              >
                {saving ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
