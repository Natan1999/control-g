import { useState, useEffect, useCallback } from 'react'
import { Download, AlertCircle } from 'lucide-react'
import { MobileTopBar, BottomNav } from '@/components/layout/BottomNav'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'

interface FamilyDoc {
  $id: string
  first_name?: string
  first_lastname?: string
  id_number?: string
  overall_status: string
  ex_ante_status: string
  encounter_1_status: string
  encounter_2_status: string
  encounter_3_status: string
  ex_post_status: string
}

interface ObsDoc {
  $id: string
  content: string
  type: string
  $createdAt: string
}

const OBS_TYPE_LABEL: Record<string, string> = {
  observation: 'Observación',
  correction: 'Corrección',
  approval: 'Aprobación',
}

const OBS_TYPE_COLOR: Record<string, { bg: string; text: string }> = {
  observation: { bg: 'bg-blue-100', text: 'text-blue-700' },
  correction: { bg: 'bg-red-100', text: 'text-red-700' },
  approval: { bg: 'bg-green-100', text: 'text-green-700' },
}

export default function FieldReportsPage() {
  const { user } = useAuthStore()
  const [families, setFamilies] = useState<FamilyDoc[]>([])
  const [observations, setObservations] = useState<ObsDoc[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return }
    setLoading(true)
    try {
      const [famRes, obsRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FAMILIES, [
          Query.equal('professional_id', user.id),
          Query.limit(200),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.OBSERVATIONS, [
          Query.equal('to_user_id', user.id),
          Query.limit(50),
          Query.orderDesc('$createdAt'),
        ]),
      ])
      setFamilies(famRes.documents as unknown as FamilyDoc[])
      setObservations(obsRes.documents as unknown as ObsDoc[])
    } catch { /* silent */ }
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const total = families.length
  const exAnte = families.filter(f => f.ex_ante_status === 'completed').length
  const enc1 = families.filter(f => f.encounter_1_status === 'completed').length
  const enc2 = families.filter(f => f.encounter_2_status === 'completed').length
  const enc3 = families.filter(f => f.encounter_3_status === 'completed').length
  const exPost = families.filter(f => f.ex_post_status === 'completed').length

  const progressBars = [
    { label: 'Caracterización Ex-Antes', value: exAnte, color: '#1B3A4B' },
    { label: 'Momento de Encuentro 1', value: enc1, color: '#2C6E8A' },
    { label: 'Momento de Encuentro 2', value: enc2, color: '#3D7B9E' },
    { label: 'Momento de Encuentro 3', value: enc3, color: '#4E8FB5' },
    { label: 'Caracterización Ex-Post', value: exPost, color: '#27AE60' },
  ]

  const kpis = [
    { label: 'Meta familias', value: total },
    { label: 'Ex-Antes', value: exAnte },
    { label: 'M1', value: enc1 },
    { label: 'M2', value: enc2 },
    { label: 'M3', value: enc3 },
    { label: 'Ex-Post', value: exPost },
  ]

  function downloadReport() {
    const lines: string[] = [
      'INFORME DE AVANCE — CONTROL G',
      `Profesional: ${user?.fullName ?? ''}`,
      `Fecha: ${new Date().toLocaleDateString('es-CO')}`,
      '',
      '=== RESUMEN ===',
      `Familias meta: ${total}`,
      `Ex-Antes completados: ${exAnte}`,
      `Momento 1 completados: ${enc1}`,
      `Momento 2 completados: ${enc2}`,
      `Momento 3 completados: ${enc3}`,
      `Ex-Post completados: ${exPost}`,
      '',
      '=== FAMILIAS ===',
      ...families.map(f => {
        const name = `${f.first_name ?? ''} ${f.first_lastname ?? ''}`.trim() || f.$id
        return `${name} (${f.id_number ?? 'S/D'}) — Ex:${f.ex_ante_status} M1:${f.encounter_1_status} M2:${f.encounter_2_status} M3:${f.encounter_3_status} EP:${f.ex_post_status}`
      }),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `informe_${user?.fullName?.replace(/ /g, '_') ?? 'profesional'}_${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileTopBar title="Mis Informes" />

      <div className="flex-1 overflow-y-auto pb-24 px-4">
        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {kpis.map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-border p-3 shadow-sm text-center">
              <div className="text-xl font-black text-foreground">{loading ? '—' : k.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Progress bars */}
        <div className="mt-5 bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-sm">Avance por tipo de actividad</h3>
          {progressBars.map(pb => {
            const pct = total > 0 ? Math.round((pb.value / total) * 100) : 0
            return (
              <div key={pb.label}>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-muted-foreground">{pb.label}</span>
                  <span className="font-bold">{pb.value}/{total}</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: pb.color }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Download button */}
        <button
          onClick={downloadReport}
          disabled={loading || families.length === 0}
          className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition-opacity hover:opacity-90"
          style={{ background: '#1B3A4B' }}
        >
          <Download size={18} /> Descargar mi informe
        </button>

        {/* Observations received */}
        <div className="mt-6">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <AlertCircle size={15} className="text-yellow-500" />
            Observaciones recibidas
          </h3>
          {loading ? (
            <div className="space-y-2">
              {[0, 1].map(i => <div key={i} className="bg-white rounded-xl border border-border h-[60px] animate-pulse" />)}
            </div>
          ) : observations.length === 0 ? (
            <div className="bg-white rounded-xl border border-border p-5 text-center">
              <p className="text-sm text-muted-foreground">No tienes observaciones recibidas.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {observations.map(obs => {
                const cfg = OBS_TYPE_COLOR[obs.type] ?? OBS_TYPE_COLOR.observation
                const label = OBS_TYPE_LABEL[obs.type] ?? obs.type
                return (
                  <div key={obs.$id} className="bg-white rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                        {label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(obs.$createdAt).toLocaleDateString('es-CO')}
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{obs.content}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
