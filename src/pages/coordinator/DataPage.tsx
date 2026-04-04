import { useState, useEffect } from 'react'
import { Search, Eye, CheckCircle, XCircle, Download } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { StatusBadge, Avatar, PageWrapper } from '@/components/shared'
import { formatRelativeTime } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'
import type { FormResponse } from '@/types'

export default function DataPage() {
  const { user } = useAuthStore()
  const [selected, setSelected] = useState<FormResponse | null>(null)
  const [filter, setFilter] = useState('all')
  const [responses, setResponses] = useState<FormResponse[]>([])
  const [loading, setLoading] = useState(true)

  const [actionLoading, setActionLoading] = useState(false)
  const [rejectModal, setRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    async function loadData() {
      if (!user?.organizationId) return
      setLoading(true)
      try {
        const res = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_IDS.FORM_RESPONSES,
          [
            Query.equal('organization_id', user.organizationId),
            Query.orderDesc('$createdAt'),
            Query.limit(100)
          ]
        )
        const mapped = res.documents.map((doc: any) => ({
          id: doc.$id,
          localId: doc.local_id,
          formId: doc.form_id,
          formName: 'Formulario ' + doc.form_id.substring(0, 5),
          technicianId: doc.technician_id,
          technicianName: 'Técnico ' + doc.technician_id.substring(0, 4),
          zoneId: doc.zone_id,
          zoneName: doc.zone_id || 'N/A',
          status: doc.status as FormResponse['status'],
          data: doc.data ? (typeof doc.data === 'string' ? JSON.parse(doc.data) : doc.data) : {},
          createdAt: doc.$createdAt,
          syncedAt: doc.synced_at,
          source: doc.source as FormResponse['source'],
          latitude: doc.location?.latitude,
          longitude: doc.location?.longitude,
          accuracy: doc.location?.accuracy,
          ocrConfidence: doc.ocr_confidence,
          rejectionReason: doc.rejection_reason,
          formVersion: doc.form_version || '1.0',
          projectId: doc.project_id || '',
          organizationId: doc.organization_id || ''
        }))
        setResponses(mapped)
      } catch (err) {
        console.error('Error fetching responses', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user])

  const handleApprove = async () => {
    if (!selected) return
    setActionLoading(true)
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.FORM_RESPONSES, selected.id, {
        status: 'approved',
        reviewed_by: user?.id || '',
        reviewed_at: new Date().toISOString()
      })
      setResponses(prev => prev.map(r => r.id === selected.id ? { ...r, status: 'approved' as const } : r))
      setSelected(prev => prev ? { ...prev, status: 'approved' as const } : null)
    } catch {
      alert('Error al aprobar. Verifica la conexión.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selected || !rejectReason.trim()) return
    setActionLoading(true)
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.FORM_RESPONSES, selected.id, {
        status: 'rejected',
        rejection_reason: rejectReason,
        reviewed_by: user?.id || '',
        reviewed_at: new Date().toISOString()
      })
      setResponses(prev => prev.map(r =>
        r.id === selected.id ? { ...r, status: 'rejected' as const, rejectionReason: rejectReason } : r
      ))
      setSelected(prev => prev ? { ...prev, status: 'rejected' as const } : null)
      setRejectModal(false)
      setRejectReason('')
    } catch {
      alert('Error al rechazar.')
    } finally {
      setActionLoading(false)
    }
  }

  const filtered = filter === 'all'
    ? responses
    : responses.filter(r => r.status === filter)

  return (
    <PageWrapper className="flex">
      {/* Table */}
      <div className="flex-1 min-w-0">
        <TopBar
          title="Datos Recolectados"
          subtitle={`${responses.length} formularios recibidos`}
          actions={
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
              <Download size={16} /> Exportar
            </button>
          }
        />

        <div className="p-6 space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { key: 'all', label: 'Todos', count: responses.length },
              { key: 'in_review', label: 'En revisión', count: responses.filter(r => r.status === 'in_review').length },
              { key: 'approved', label: 'Aprobados', count: responses.filter(r => r.status === 'approved').length },
              { key: 'rejected', label: 'Rechazados', count: responses.filter(r => r.status === 'rejected').length },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === f.key ? 'bg-brand-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {f.label}
                <span className="text-xs opacity-70">({f.count})</span>
              </button>
            ))}

            <div className="flex-1 relative min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input placeholder="Buscar..." className="w-full pl-8 pr-3 py-1.5 rounded-full border border-input text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
            </div>
          </div>

          {/* Table */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    {['ID', 'Técnico', 'Zona', 'Formulario', 'Fecha', 'Fuente', 'Estado', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr><td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">Cargando datos...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">No se han encontrado formularios.</td></tr>
                  ) : filtered.map(response => (
                    <tr
                      key={response.id}
                      onClick={() => setSelected(response)}
                      className={`hover:bg-muted/30 cursor-pointer transition-colors ${selected?.id === response.id ? 'bg-brand-primary/5' : ''}`}
                    >
                      <td className="px-4 py-3.5 text-xs font-mono text-muted-foreground">{response.localId.slice(-8)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Avatar name={response.technicianName || 'T'} size="sm" />
                          <span className="text-sm font-medium">{response.technicianName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground">{response.zoneName}</td>
                      <td className="px-4 py-3.5 text-sm max-w-[180px] truncate">{response.formName}</td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground">{response.syncedAt && formatRelativeTime(response.syncedAt)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          response.source === 'digital' ? 'bg-blue-50 text-blue-600' :
                          response.source === 'ocr_camera' ? 'bg-cyan-50 text-cyan-600' : 'bg-orange-50 text-orange-600'
                        }`}>
                          {response.source === 'digital' ? 'Digital' : response.source === 'ocr_camera' ? 'OCR Cámara' : 'OCR PDF'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status={response.status} /></td>
                      <td className="px-4 py-3.5">
                        <button className="text-muted-foreground hover:text-foreground"><Eye size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-border bg-white overflow-hidden flex-shrink-0"
          >
            <div className="p-5 h-full overflow-y-auto w-[380px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Detalle del formulario</h3>
                <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex items-center justify-between">
                  <StatusBadge status={selected.status} />
                  <span className="text-xs text-muted-foreground">{selected.localId.slice(-12)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/30 rounded-xl p-3">
                    <div className="text-xs text-muted-foreground">Técnico</div>
                    <div className="font-semibold mt-0.5">{selected.technicianName}</div>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-3">
                    <div className="text-xs text-muted-foreground">Zona</div>
                    <div className="font-semibold mt-0.5">{selected.zoneName}</div>
                  </div>
                  {selected.latitude && (
                    <div className="bg-muted/30 rounded-xl p-3 col-span-2">
                      <div className="text-xs text-muted-foreground">GPS</div>
                      <div className="font-mono text-xs mt-0.5">{selected.latitude.toFixed(4)}, {selected.longitude?.toFixed(4)} (±{selected.accuracy?.toFixed(0)}m)</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Responses */}
              <div className="space-y-3 mb-5">
                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Respuestas</h4>
                {Object.entries(selected.data).map(([key, val]) => (
                  <div key={key} className="text-sm">
                    <div className="text-xs text-muted-foreground capitalize">{key.replace(/f0+/g, 'Campo ')}</div>
                    <div className="font-medium mt-0.5">{String(val)}</div>
                  </div>
                ))}
              </div>

              {/* OCR */}
              {selected.ocrConfidence && (
                <div className="bg-cyan-50 rounded-xl p-3 mb-5">
                  <div className="text-xs font-semibold text-cyan-700 mb-1">Confianza OCR</div>
                  <div className="text-lg font-bold text-cyan-800">{Math.round(selected.ocrConfidence * 100)}%</div>
                </div>
              )}

              {/* Rejection */}
              {selected.rejectionReason && (
                <div className="bg-red-50 rounded-xl p-3 mb-5">
                  <div className="text-xs font-semibold text-red-700 mb-1">Motivo de rechazo</div>
                  <div className="text-sm text-red-600">{selected.rejectionReason}</div>
                </div>
              )}

              {/* Actions */}
              {selected.status === 'in_review' && (
                <div className="flex gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-60"
                  >
                    {actionLoading ? 'Procesando...' : <><CheckCircle size={16} /> Aprobar</>}
                  </button>
                  <button
                    onClick={() => setRejectModal(true)}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60"
                  >
                    <XCircle size={16} /> Rechazar
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setRejectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-lg font-bold mb-1">Rechazar formulario</h3>
              <p className="text-sm text-muted-foreground mb-4">Indica el motivo del rechazo. El técnico podrá ver este mensaje.</p>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Ej: Datos incompletos, dirección incorrecta, firma faltante..."
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 resize-none"
                autoFocus
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { setRejectModal(false); setRejectReason('') }}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading || !rejectReason.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60"
                >
                  {actionLoading ? 'Procesando...' : 'Confirmar Rechazo'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  )
}
