import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper } from '@/components/shared'
import { mockZoneData, mockDailyData } from '@/lib/mockData'
import { Download, FileText } from 'lucide-react'

const sourceData = [
  { name: 'Digital', value: 68, color: '#2E86C1' },
  { name: 'OCR Cámara', value: 24, color: '#9B59B6' },
  { name: 'OCR PDF', value: 8, color: '#F39C12' },
]

const statusData = [
  { name: 'Aprobados', value: 1456, color: '#27AE60' },
  { name: 'En revisión', value: 234, color: '#F39C12' },
  { name: 'Rechazados', value: 89, color: '#E74C3C' },
  { name: 'Sincronizados', value: 63, color: '#2E86C1' },
]

export default function ReportsPage() {
  return (
    <PageWrapper>
      <TopBar
        title="Reportes y Análisis"
        subtitle="Análisis estadístico de la recolección de datos"
        actions={
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
              <FileText size={16} /> Generar PDF
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-secondary transition-colors">
              <Download size={16} /> Exportar datos
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Zone progress */}
          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <h3 className="font-bold mb-4">Formularios por zona</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={mockZoneData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="value" fill="#2E86C1" radius={[0, 4, 4, 0]} name="Recolectados" />
                <Bar dataKey="total" fill="#e5e7eb" radius={[0, 4, 4, 0]} name="Meta" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Source pie */}
          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <h3 className="font-bold mb-4">Fuente de datos (%)</h3>
            <div className="flex items-center justify-center mb-3">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={sourceData} dataKey="value" cx="50%" cy="50%" outerRadius={90} innerRadius={50} label={({ name, value }) => `${value}%`}>
                    {sourceData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4">
              {sourceData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name}: <strong>{d.value}%</strong></span>
                </div>
              ))}
            </div>
          </div>

          {/* Status distribution */}
          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <h3 className="font-bold mb-4">Distribución de estados</h3>
            <div className="space-y-3">
              {statusData.map(s => {
                const total = statusData.reduce((a, b) => a + b.value, 0)
                const pct = Math.round((s.value / total) * 100)
                return (
                  <div key={s.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{s.name}</span>
                      <span className="font-semibold">{s.value.toLocaleString('es-CO')} ({pct}%)</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Summary stats */}
          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <h3 className="font-bold mb-4">Indicadores clave</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Promedio diario', value: '167', unit: 'formularios/día' },
                { label: 'Tiempo promedio', value: '24', unit: 'min por formulario' },
                { label: 'Tasa de aprobación', value: '79.2', unit: '%' },
                { label: 'Tasa OCR', value: '87.4', unit: '% confianza promedio' },
                { label: 'Técnicos activos', value: '18', unit: 'de 24 asignados' },
                { label: 'Avance proyecto', value: '36.8', unit: '% hacia meta' },
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
    </PageWrapper>
  )
}
