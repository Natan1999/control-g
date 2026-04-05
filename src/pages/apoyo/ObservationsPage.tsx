import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, Plus, X } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query, ID } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'

interface ObsRow {
  $id: string
  from_user_id: string
  to_user_id: string
  content: string
  type: string
  read: boolean
  $createdAt: string
  fromName?: string
  toName?: string
}

interface Professional {
  userId: string
  fullName: string
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl font-semibold text-white text-sm ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {message}
    </div>
  )
}

const TYPE_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  observation: { label: 'Observación', bg: 'bg-blue-100', text: 'text-blue-700' },
  correction:  { label: 'Corrección',  bg: 'bg-red-100',  text: 'text-red-700' },
  approval:    { label: 'Aprobación',  bg: 'bg-green-100', text: 'text-green-700' },
}

export default function ApoyoObservationsPage() {
  const { user } = useAuthStore()
  const [observations, setObservations] = useState<ObsRow[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ professionalId: '', content: '', type: 'observation' })
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const loadObservations = useCallback(async () => {
    if (!user?.entityId || !user?.id) { setLoading(false); return }
    setLoading(true)
    try {
      const profRes = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.USER_PROFILES, [
        Query.equal('entity_id', user.entityId),
        Query.equal('role', 'professional'),
        Query.limit(50),
      ])
      const profsData: Professional[] = profRes.documents.map((p: any) => ({
        userId: p.user_id,
        fullName: p.full_name,
      }))
      setProfessionals(profsData)

      const profIds = profsData.map(p => p.userId)
      const profMap: Record<string, string> = {}
      profRes.documents.forEach((p: any) => { profMap[p.user_id] = p.full_name })

      let allObs: ObsRow[] = []
      if (profIds.length > 0) {
        // Load observations TO professionals
        const toRes = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.OBSERVATIONS, [
          Query.equal('to_user_id', profIds.slice(0, 25)), // Appwrite limit
          Query.limit(100),
          Query.orderDesc('$createdAt'),
        ])
        allObs = toRes.documents.map((o: any) => ({
          $id: o.$id,
          from_user_id: o.from_user_id,
          to_user_id: o.to_user_id,
          content: o.content,
          type: o.type,
          read: o.read,
          $createdAt: o.$createdAt,
          fromName: o.from_user_id === user.id ? user.fullName : profMap[o.from_user_id] ?? o.from_user_id,
          toName: profMap[o.to_user_id] ?? o.to_user_id,
        }))
      }

      // Also load from current user
      try {
        const fromRes = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.OBSERVATIONS, [
          Query.equal('from_user_id', user.id),
          Query.limit(50),
          Query.orderDesc('$createdAt'),
        ])
        const fromObs: ObsRow[] = fromRes.documents
          .filter((o: any) => !allObs.some(existing => existing.$id === o.$id))
          .map((o: any) => ({
            $id: o.$id,
            from_user_id: o.from_user_id,
            to_user_id: o.to_user_id,
            content: o.content,
            type: o.type,
            read: o.read,
            $createdAt: o.$createdAt,
            fromName: user.fullName,
            toName: profMap[o.to_user_id] ?? o.to_user_id,
          }))
        allObs = [...allObs, ...fromObs]
      } catch { /* silent */ }

      allObs.sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime())
      setObservations(allObs)
    } catch { /* silent */ }
    setLoading(false)
  }, [user?.entityId, user?.id, user?.fullName])

  useEffect(() => { loadObservations() }, [loadObservations])

  async function createObservation() {
    if (!form.professionalId || !form.content.trim() || !user?.id || !user?.entityId) return
    setSubmitting(true)
    try {
      await databases.createDocument(DATABASE_ID, COLLECTION_IDS.OBSERVATIONS, ID.unique(), {
        entity_id: user.entityId,
        from_user_id: user.id,
        to_user_id: form.professionalId,
        content: form.content,
        type: form.type,
        read: false,
      })
      setShowModal(false)
      setForm({ professionalId: '', content: '', type: 'observation' })
      setToast({ message: 'Observación enviada exitosamente', type: 'success' })
      await loadObservations()
    } catch {
      setToast({ message: 'Error al crear la observación', type: 'error' })
    }
    setSubmitting(false)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <TopBar
        title="Observaciones"
        subtitle="Alarmas y solicitudes de corrección"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
            style={{ background: '#1B3A4B' }}
          >
            <Plus size={16} /> Nueva observación
          </button>
        }
      />

      <div className="mt-6 bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Cargando observaciones...</div>
        ) : observations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            <AlertCircle size={36} className="mx-auto mb-3 text-gray-300" />
            No hay observaciones registradas aún.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {observations.map(obs => {
              const cfg = TYPE_BADGE[obs.type] ?? TYPE_BADGE.observation
              return (
                <div key={obs.$id} className={`px-6 py-4 ${!obs.read ? 'bg-yellow-50/40' : ''}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                      {!obs.read && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                          No leída
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(obs.$createdAt).toLocaleDateString('es-CO', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-foreground leading-relaxed">{obs.content}</p>
                  <div className="mt-2 text-xs text-muted-foreground flex items-center gap-3">
                    <span>De: <strong>{obs.fromName}</strong></span>
                    <span>Para: <strong>{obs.toName}</strong></span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* New Observation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">Nueva observación</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Profesional
                </label>
                <select
                  value={form.professionalId}
                  onChange={e => setForm(f => ({ ...f, professionalId: e.target.value }))}
                  className="w-full px-4 py-3 border border-input rounded-xl text-sm focus:outline-none focus:ring-2 bg-background"
                >
                  <option value="">Seleccionar profesional...</option>
                  {professionals.map(p => (
                    <option key={p.userId} value={p.userId}>{p.fullName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Tipo
                </label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-4 py-3 border border-input rounded-xl text-sm focus:outline-none focus:ring-2 bg-background"
                >
                  <option value="observation">Observación</option>
                  <option value="correction">Corrección</option>
                  <option value="approval">Aprobación</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Contenido
                </label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Escribe la observación..."
                  rows={4}
                  className="w-full px-4 py-3 border border-input rounded-xl text-sm focus:outline-none focus:ring-2 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createObservation}
                disabled={submitting || !form.professionalId || !form.content.trim()}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition-colors"
                style={{ background: '#1B3A4B' }}
              >
                {submitting ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
