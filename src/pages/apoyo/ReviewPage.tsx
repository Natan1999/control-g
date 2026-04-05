import { useState, useEffect, useRef, useCallback } from 'react'
import { CheckCircle, XCircle, MessageSquare, ChevronDown } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query, ID } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'

interface ActivityCard {
  $id: string
  family_id: string
  professional_id: string
  activity_type: string
  activity_date: string
  photo_url?: string
  status: string
  review_notes?: string
  familyName: string
  professionalName: string
}

const ACTIVITY_LABELS: Record<string, string> = {
  ex_ante: 'Caracterización Ex-Antes',
  encounter_1: 'Momento de Encuentro 1',
  encounter_2: 'Momento de Encuentro 2',
  encounter_3: 'Momento de Encuentro 3',
  ex_post: 'Caracterización Ex-Post',
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl font-semibold text-white text-sm flex items-center gap-2 transition-all ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {message}
    </div>
  )
}

export default function ApoyoReviewPage() {
  const { user } = useAuthStore()
  const [activities, setActivities] = useState<ActivityCard[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [rejectModalId, setRejectModalId] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [obsModalId, setObsModalId] = useState<string | null>(null)
  const [obsContent, setObsContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!user?.entityId) { setLoading(false); return }
    setLoading(true)
    try {
      const [actsRes, profRes, famRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ACTIVITIES, [
          Query.equal('entity_id', user.entityId),
          Query.equal('status', 'synced'),
          Query.limit(50),
          Query.orderDesc('$createdAt'),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.USER_PROFILES, [
          Query.equal('entity_id', user.entityId),
          Query.equal('role', 'professional'),
          Query.limit(50),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FAMILIES, [
          Query.equal('entity_id', user.entityId),
          Query.limit(500),
        ]),
      ])

      const profMap: Record<string, string> = {}
      profRes.documents.forEach((p: any) => { profMap[p.user_id] = p.full_name })
      const famMap: Record<string, string> = {}
      famRes.documents.forEach((f: any) => {
        famMap[f.$id] = `${f.first_name ?? ''} ${f.first_lastname ?? ''}`.trim() || f.$id
      })

      const cards: ActivityCard[] = actsRes.documents.map((a: any) => ({
        $id: a.$id,
        family_id: a.family_id,
        professional_id: a.professional_id,
        activity_type: a.activity_type,
        activity_date: a.activity_date,
        photo_url: a.photo_url,
        status: a.status,
        review_notes: a.review_notes,
        familyName: famMap[a.family_id] ?? a.family_id,
        professionalName: profMap[a.professional_id] ?? a.professional_id,
      }))
      setActivities(cards)
    } catch { /* silent */ }
    setLoading(false)
  }, [user?.entityId])

  useEffect(() => { load() }, [load])

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type })

  async function approveActivity(id: string) {
    setSubmitting(true)
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.ACTIVITIES, id, { status: 'approved' })
      setActivities(prev => prev.filter(a => a.$id !== id))
      showToast('Actividad aprobada exitosamente', 'success')
    } catch {
      showToast('Error al aprobar la actividad', 'error')
    }
    setSubmitting(false)
  }

  async function rejectActivity() {
    if (!rejectModalId) return
    setSubmitting(true)
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.ACTIVITIES, rejectModalId, {
        status: 'rejected',
        review_notes: rejectNotes,
      })
      setActivities(prev => prev.filter(a => a.$id !== rejectModalId))
      setRejectModalId(null)
      setRejectNotes('')
      showToast('Actividad rechazada', 'success')
    } catch {
      showToast('Error al rechazar la actividad', 'error')
    }
    setSubmitting(false)
  }

  async function createObservation() {
    if (!obsModalId || !obsContent.trim()) return
    const act = activities.find(a => a.$id === obsModalId)
    if (!act || !user?.id || !user?.entityId) return
    setSubmitting(true)
    try {
      await databases.createDocument(DATABASE_ID, COLLECTION_IDS.OBSERVATIONS, ID.unique(), {
        entity_id: user.entityId,
        from_user_id: user.id,
        to_user_id: act.professional_id,
        activity_id: act.$id,
        content: obsContent,
        type: 'observation',
        read: false,
      })
      setObsModalId(null)
      setObsContent('')
      showToast('Observación enviada al profesional', 'success')
    } catch {
      showToast('Error al crear la observación', 'error')
    }
    setSubmitting(false)
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; bg: string; text: string }> = {
      synced: { label: 'En Revisión', bg: 'bg-yellow-100', text: 'text-yellow-700' },
      approved: { label: 'Aprobado', bg: 'bg-green-100', text: 'text-green-700' },
      rejected: { label: 'Rechazado', bg: 'bg-red-100', text: 'text-red-700' },
    }
    const cfg = map[status] ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-600' }
    return (
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
        {cfg.label}
      </span>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <TopBar title="Revisión de Actividades" subtitle="Actividades enviadas por profesionales" />

      {loading ? (
        <div className="mt-8 text-center text-muted-foreground">Cargando actividades...</div>
      ) : activities.length === 0 ? (
        <div className="mt-8 text-center text-muted-foreground">
          <CheckCircle size={40} className="mx-auto mb-3 text-green-400" />
          <p className="font-semibold">No hay actividades pendientes de revisión</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {activities.map(act => (
            <div key={act.$id} className="bg-white rounded-2xl border border-border shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-sm">{act.familyName}</span>
                    {statusBadge(act.status)}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>{ACTIVITY_LABELS[act.activity_type] ?? act.activity_type}</div>
                    <div>Profesional: {act.professionalName}</div>
                    {act.activity_date && (
                      <div>Fecha: {new Date(act.activity_date).toLocaleDateString('es-CO')}</div>
                    )}
                  </div>
                </div>
                {act.photo_url && (
                  <img
                    src={act.photo_url}
                    alt="Evidencia"
                    className="w-20 h-20 object-cover rounded-xl border border-border flex-shrink-0"
                  />
                )}
              </div>

              <div className="flex gap-2 mt-4 flex-wrap">
                <button
                  onClick={() => approveActivity(act.$id)}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-60"
                >
                  <CheckCircle size={15} /> Aprobar
                </button>
                <button
                  onClick={() => { setRejectModalId(act.$id); setRejectNotes('') }}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
                >
                  <XCircle size={15} /> Rechazar
                </button>
                <button
                  onClick={() => { setObsModalId(act.$id); setObsContent('') }}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-60"
                >
                  <MessageSquare size={15} /> Observación
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-lg mb-4">Rechazar actividad</h3>
            <textarea
              value={rejectNotes}
              onChange={e => setRejectNotes(e.target.value)}
              placeholder="Motivo del rechazo (notas de revisión)..."
              rows={4}
              className="w-full px-4 py-3 border border-input rounded-xl text-sm focus:outline-none focus:ring-2 resize-none"
              style={{ '--tw-ring-color': '#1B3A4B' } as any}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setRejectModalId(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={rejectActivity}
                disabled={submitting || !rejectNotes.trim()}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Observation Modal */}
      {obsModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-lg mb-4">Crear observación</h3>
            <textarea
              value={obsContent}
              onChange={e => setObsContent(e.target.value)}
              placeholder="Escribe la observación para el profesional..."
              rows={4}
              className="w-full px-4 py-3 border border-input rounded-xl text-sm focus:outline-none focus:ring-2 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setObsModalId(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createObservation}
                disabled={submitting || !obsContent.trim()}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition-colors"
                style={{ background: '#1B3A4B' }}
              >
                Enviar observación
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
