import { CheckCircle, XCircle, MessageSquare, AlertTriangle } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { StatusBadge, Avatar, PageWrapper } from '@/components/shared'
import { mockResponses } from '@/lib/mockData'
import { useState } from 'react'
import { motion } from 'framer-motion'
import type { FormResponse } from '@/types'

export default function ReviewPage() {
  const [selected, setSelected] = useState<FormResponse | null>(mockResponses.find(r => r.status === 'in_review') || null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  return (
    <PageWrapper className="flex">
      {/* List */}
      <div className="w-80 flex-shrink-0 border-r border-border overflow-y-auto bg-white">
        <TopBar title="Revisión" subtitle="Formularios para validar" />
        <div className="divide-y divide-border">
          {mockResponses.map(r => (
            <div
              key={r.id}
              onClick={() => setSelected(r)}
              className={`px-4 py-3.5 cursor-pointer hover:bg-muted/30 transition-colors ${selected?.id === r.id ? 'bg-brand-primary/5 border-l-2 border-brand-primary' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Avatar name={r.technicianName || 'T'} size="sm" />
                  <div>
                    <div className="text-sm font-semibold">{r.technicianName}</div>
                    <div className="text-xs text-muted-foreground">{r.zoneName}</div>
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="text-xs text-muted-foreground mt-2 pl-10 line-clamp-2">{r.formName}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail */}
      {selected && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">{selected.formName}</h2>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span>{selected.technicianName}</span>
                    <span>·</span>
                    <span>{selected.zoneName}</span>
                    <span>·</span>
                    <StatusBadge status={selected.status} />
                  </div>
                </div>
                {selected.ocrConfidence && (
                  <div className="bg-indigo-100 rounded-xl px-4 py-2 text-center">
                    <div className="text-xs text-indigo-600 font-medium">Confianza OCR</div>
                    <div className="text-2xl font-black text-indigo-700">{Math.round(selected.ocrConfidence * 100)}%</div>
                  </div>
                )}
              </div>

              {/* GPS */}
              {selected.latitude && (
                <div className="bg-muted/30 rounded-xl p-3 mb-4 text-xs text-muted-foreground">
                  📍 {selected.latitude.toFixed(4)}, {selected.longitude?.toFixed(4)} — Precisión: ±{selected.accuracy?.toFixed(0)}m
                </div>
              )}

              {/* Fields */}
              <div className="space-y-4">
                {Object.entries(selected.data).map(([key, val], i) => (
                  <div key={key} className="border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground font-medium mb-1">{key.replace(/f0+/g, 'Campo ')}</div>
                        <div className="text-sm font-semibold">{String(val)}</div>
                      </div>
                      {/* Field note */}
                      <div className="flex items-center gap-1">
                        {notes[key] && (
                          <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                            <AlertTriangle size={10} className="inline mr-1" />Observación
                          </span>
                        )}
                        <button
                          onClick={() => {
                            const note = window.prompt('Agregar observación al campo:', notes[key] || '')
                            if (note !== null) setNotes(prev => note ? { ...prev, [key]: note } : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)))
                          }}
                          className="text-muted-foreground hover:text-brand-primary p-1 rounded transition-colors"
                          title="Agregar observación"
                        >
                          <MessageSquare size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            {selected.status === 'in_review' && (
              <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors">
                  <CheckCircle size={18} /> Aprobar formulario
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors">
                  <XCircle size={18} /> Rechazar con motivo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
