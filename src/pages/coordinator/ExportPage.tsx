import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, FileSpreadsheet, FileJson, FileText, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper } from '@/components/shared'

const exportJobs = [
  { id: '1', name: 'Caracterización Arjona — Completo', format: 'xlsx', status: 'completed', rows: 842, size: '2.4 MB', date: '2026-03-29 10:30' },
  { id: '2', name: 'Informe Turbaco — Marzo', format: 'pdf', status: 'completed', rows: 312, size: '890 KB', date: '2026-03-28 16:15' },
  { id: '3', name: 'Datos crudos — JSON completo Bolívar', format: 'json', status: 'processing', rows: 1842, size: '—', date: '2026-03-29 11:45' },
  { id: '4', name: 'Villanueva — Validados', format: 'csv', status: 'failed', rows: 0, size: '—', date: '2026-03-27 09:00' },
]

const formatIcon = (f: string) => {
  if (f === 'xlsx') return <FileSpreadsheet size={16} className="text-green-600" />
  if (f === 'json') return <FileJson size={16} className="text-blue-600" />
  return <FileText size={16} className="text-red-600" />
}

const statusCfg = {
  completed:  { icon: CheckCircle, cls: 'text-green-600', label: 'Listo' },
  processing: { icon: RefreshCw,   cls: 'text-yellow-600 animate-spin', label: 'Procesando' },
  failed:     { icon: AlertCircle, cls: 'text-red-500',   label: 'Error' },
}

export default function ExportPage() {
  const [format, setFormat] = useState('xlsx')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)

  const handleExport = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 2500)
  }

  return (
    <PageWrapper>
      <TopBar title="Exportar Datos" subtitle="Descarga los datos recolectados en múltiples formatos" />
      <div className="p-6 space-y-6">

        {/* Config panel */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h3 className="font-bold text-foreground mb-4">Nueva exportación</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Proyecto</label>
                <select className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                  <option>Caracterización Socioeconómica Bolívar 2026</option>
                  <option>Diagnóstico Comunal Zodes Dique</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Rango de fechas</label>
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" className="px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" defaultValue="2026-03-01" />
                  <input type="date" className="px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" defaultValue="2026-03-29" />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Estado de formularios</label>
                <select value={filter} onChange={e => setFilter(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                  <option value="all">Todos</option>
                  <option value="approved">Solo aprobados</option>
                  <option value="synced">Solo sincronizados</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Formato de exportación</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { v: 'xlsx', label: 'Excel', icon: FileSpreadsheet, color: 'text-green-600' },
                    { v: 'csv', label: 'CSV', icon: FileText, color: 'text-blue-600' },
                    { v: 'json', label: 'JSON', icon: FileJson, color: 'text-orange-600' },
                  ].map(opt => (
                    <button key={opt.v} onClick={() => setFormat(opt.v)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${format === opt.v ? 'border-brand-primary bg-brand-primary/5' : 'border-border hover:border-brand-primary/40'}`}>
                      <opt.icon size={22} className={opt.color} />
                      <span className="text-xs font-bold">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleExport} disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-secondary text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60">
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                {loading ? 'Generando archivo...' : 'Exportar ahora'}
              </button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="space-y-4">
            {[
              { label: 'Total de respuestas', value: '1,842', sub: 'En el proyecto activo' },
              { label: 'Aprobadas y listas', value: '1,347', sub: '73% del total' },
              { label: 'Última exportación', value: 'Hace 2h', sub: 'Excel · 842 filas' },
            ].map(s => (
              <div key={s.label} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                <div className="text-2xl font-black text-foreground">{s.value}</div>
                <div className="text-sm font-semibold text-foreground mt-0.5">{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* History */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-bold text-foreground">Exportaciones recientes</h3>
          </div>
          <div className="divide-y divide-border">
            {exportJobs.map((job, i) => {
              const s = statusCfg[job.status as keyof typeof statusCfg]
              return (
                <motion.div key={job.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    {formatIcon(job.format)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{job.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1"><Clock size={11} />{job.date}</span>
                      {job.rows > 0 && <span>{job.rows.toLocaleString()} registros</span>}
                      {job.size !== '—' && <span>{job.size}</span>}
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${s.cls}`}>
                    <s.icon size={13} />
                    {s.label}
                  </div>
                  {job.status === 'completed' && (
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
                      <Download size={15} />
                    </button>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
