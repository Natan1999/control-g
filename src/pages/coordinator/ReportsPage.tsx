import { useEffect, useState } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper } from '@/components/shared'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'
import { Download, FileText, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface ZoneEntry  { name: string; value: number }
interface DailyEntry { name: string; value: number }
interface SourceEntry { name: string; value: number; color: string }
interface StatusEntry { name: string; value: number; color: string }

interface Stats {
  total: number
  approved: number
  in_review: number
  rejected: number
  synced: number
  avgOcr: number
}

export default function ReportsPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [zoneData,   setZoneData]   = useState<ZoneEntry[]>([])
  const [dailyData,  setDailyData]  = useState<DailyEntry[]>([])
  const [sourceData, setSourceData] = useState<SourceEntry[]>([])
  const [statusData, setStatusData] = useState<StatusEntry[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0, approved: 0, in_review: 0, rejected: 0, synced: 0, avgOcr: 0
  })

  useEffect(() => {
    if (!user?.organizationId) return
    loadData()
  }, [user?.organizationId])

  async function loadData() {
    setLoading(true)
    try {
      const res = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.FORM_RESPONSES,
        [Query.equal('organization_id', user!.organizationId!), Query.limit(500)]
      )

      // 1. Zone data
      const zoneMap: Record<string, number> = {}
      res.documents.forEach(doc => {
        const zone = doc.zone_id || 'Sin zona'
        zoneMap[zone] = (zoneMap[zone] || 0) + 1
      })
      setZoneData(Object.entries(zoneMap).map(([name, value]) => ({ name: name.slice(0, 15), value })))

      // 2. Daily data (last 25 days)
      const dailyMap: Record<string, number> = {}
      const today = new Date()
      for (let i = 24; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const key = d.toISOString().split('T')[0]
        dailyMap[key] = 0
      }
      res.documents.forEach(doc => {
        const day = doc.$createdAt.split('T')[0]
        if (dailyMap[day] !== undefined) dailyMap[day]++
      })
      setDailyData(
        Object.entries(dailyMap).map(([date, value]) => ({
          name: new Date(date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }),
          value,
        }))
      )

      // 3. Source data
      const sourceMap = { digital: 0, ocr_camera: 0, ocr_pdf: 0 }
      res.documents.forEach(doc => {
        const src = doc.source as keyof typeof sourceMap
        if (src in sourceMap) sourceMap[src]++
      })
      setSourceData([
        { name: 'Digital',    value: sourceMap.digital,    color: '#2E86C1' },
        { name: 'OCR Cámara', value: sourceMap.ocr_camera, color: '#9B59B6' },
        { name: 'OCR PDF',    value: sourceMap.ocr_pdf,    color: '#F39C12' },
      ])

      // 4. Status data
      const statusMap = { approved: 0, in_review: 0, rejected: 0, synced: 0 }
      res.documents.forEach(doc => {
        const s = doc.status as keyof typeof statusMap
        if (s in statusMap) statusMap[s]++
      })
      setStatusData([
        { name: 'Aprobados',    value: statusMap.approved,  color: '#27AE60' },
        { name: 'En revisión',  value: statusMap.in_review, color: '#F39C12' },
        { name: 'Rechazados',   value: statusMap.rejected,  color: '#E74C3C' },
        { name: 'Sincronizados',value: statusMap.synced,    color: '#2E86C1' },
      ])

      // 5. KPIs
      const ocrDocs = res.documents.filter(d => d.ocr_confidence != null)
      const avgOcr = ocrDocs.length > 0
        ? ocrDocs.reduce((acc, d) => acc + Number(d.ocr_confidence), 0) / ocrDocs.length
        : 0

      setStats({
        total: res.total,
        approved: statusMap.approved,
        in_review: statusMap.in_review,
        rejected: statusMap.rejected,
        synced: statusMap.synced,
        avgOcr,
      })
    } catch (err) {
      console.error('Error cargando reportes:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePDF = () => {
    const content = [
      'REPORTE CONTROL G',
      `Generado: ${new Date().toLocaleString('es-CO')}`,
      '',
      `Total formularios: ${stats.total}`,
      `Aprobados: ${stats.approved}`,
      `En revisión: ${stats.in_review}`,
      `Rechazados: ${stats.rejected}`,
      `Sincronizados: ${stats.synced}`,
      `Promedio diario (25 días): ${stats.total > 0 ? (stats.total / 25).toFixed(1) : '0'}`,
      `Tasa de aprobación: ${stats.total > 0 ? ((stats.approved / stats.total) * 100).toFixed(1) : '0'}%`,
      `Confianza OCR promedio: ${stats.avgOcr > 0 ? (stats.avgOcr * 100).toFixed(1) : 'N/D'}%`,
    ].join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-control-g-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalStatusSum = statusData.reduce((a, b) => a + b.value, 0)

  return (
    <PageWrapper>
      <TopBar
        title="Reportes y Análisis"
        subtitle="Análisis estadístico de la recolección de datos"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleGeneratePDF}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              <FileText size={16} /> Generar PDF
            </button>
            <button
              onClick={() => navigate('/coord/export')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-secondary transition-colors"
            >
              <Download size={16} /> Exportar datos
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw size={28} className="animate-spin text-brand-primary" />
          <span className="ml-3 text-muted-foreground">Cargando datos...</span>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Zone bar chart */}
            <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
              <h3 className="font-bold mb-4">Formularios por zona</h3>
              {zoneData.length === 0 ? (
                <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">Sin datos disponibles</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={zoneData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2E86C1" radius={[0, 4, 4, 0]} name="Recolectados" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Source pie */}
            <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
              <h3 className="font-bold mb-4">Fuente de datos</h3>
              <div className="flex items-center justify-center mb-3">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={sourceData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={50}
                      label={({ name, value }) => `${value}`}
                    >
                      {sourceData.map(d => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4">
                {sourceData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.name}: <strong>{d.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status distribution */}
            <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
              <h3 className="font-bold mb-4">Distribución de estados</h3>
              <div className="space-y-3">
                {statusData.map(s => {
                  const pct = totalStatusSum > 0 ? Math.round((s.value / totalStatusSum) * 100) : 0
                  return (
                    <div key={s.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{s.name}</span>
                        <span className="font-semibold">{s.value.toLocaleString('es-CO')} ({pct}%)</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: s.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* KPI summary */}
            <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
              <h3 className="font-bold mb-4">Indicadores clave</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    label: 'Total formularios',
                    value: stats.total.toLocaleString('es-CO'),
                    unit: 'registros en total',
                  },
                  {
                    label: 'Promedio diario',
                    value: stats.total > 0 ? (stats.total / 25).toFixed(1) : '0',
                    unit: 'formularios/día (25 días)',
                  },
                  {
                    label: 'Tasa de aprobación',
                    value: stats.total > 0 ? ((stats.approved / stats.total) * 100).toFixed(1) : '0',
                    unit: '%',
                  },
                  {
                    label: 'Confianza OCR',
                    value: stats.avgOcr > 0 ? (stats.avgOcr * 100).toFixed(1) : 'N/D',
                    unit: stats.avgOcr > 0 ? '% confianza promedio' : 'sin datos OCR',
                  },
                  {
                    label: 'Aprobados',
                    value: stats.approved.toLocaleString('es-CO'),
                    unit: 'formularios aprobados',
                  },
                  {
                    label: 'En revisión',
                    value: stats.in_review.toLocaleString('es-CO'),
                    unit: 'pendientes de revisión',
                  },
                ].map((s, i) => (
                  <div key={i} className="bg-muted/30 rounded-xl p-3">
                    <div className="text-2xl font-black text-foreground">{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.unit}</div>
                    <div className="text-xs font-medium text-muted-foreground mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
