import { useState } from 'react'
import { Search, Filter, Eye, CheckCircle, XCircle, AlertCircle, Download } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { StatusBadge, Avatar, PageWrapper } from '@/components/shared'
import { mockResponses } from '@/lib/mockData'
import { formatRelativeTime } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import type { FormResponse } from '@/types'

export default function DataPage() {
  const [selected, setSelected] = useState<FormResponse | null>(null)
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all'
    ? mockResponses
    : mockResponses.filter(r => r.status === filter)

  return (
    <PageWrapper className="flex">
      {/* Table */}
      <div className="flex-1 min-w-0">
        <TopBar
          title="Datos Recolectados"
          subtitle={`${mockResponses.length} formularios recibidos`}
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
              { key: 'all', label: 'Todos', count: mockResponses.length },
              { key: 'in_review', label: 'En revisión', count: 1 },
              { key: 'approved', label: 'Aprobados', count: 1 },
              { key: 'rejected', label: 'Rechazados', count: 1 },
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
                  {filtered.map(response => (
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
                          response.source === 'ocr_camera' ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'
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
                <div className="bg-purple-50 rounded-xl p-3 mb-5">
                  <div className="text-xs font-semibold text-purple-700 mb-1">Confianza OCR</div>
                  <div className="text-lg font-bold text-purple-800">{Math.round(selected.ocrConfidence * 100)}%</div>
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
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors">
                    <CheckCircle size={16} /> Aprobar
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors">
                    <XCircle size={16} /> Rechazar
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  )
}
