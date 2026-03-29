import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Download, Search, Filter, Eye, Smartphone, Globe, AlertCircle } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper, StatusBadge } from '@/components/shared'

const templates = [
  { id: 't1', name: 'Caracterización Socioeconómica - Módulo A', version: 'v3.2', fields: 42, size: '1.2 MB', status: 'published', updated: '2026-03-20', downloads: 47, previewUrl: '#' },
  { id: 't2', name: 'Censo de Vivienda y Servicios Públicos', version: 'v1.5', fields: 28, size: '890 KB', status: 'published', updated: '2026-03-18', downloads: 31, previewUrl: '#' },
  { id: 't3', name: 'Diagnóstico Comunitario Participativo', version: 'v2.0', fields: 35, size: '1.0 MB', status: 'draft', updated: '2026-03-25', downloads: 0, previewUrl: '#' },
  { id: 't4', name: 'Ficha de Beneficiario Programa Social', version: 'v4.1', fields: 19, size: '560 KB', status: 'published', updated: '2026-03-15', downloads: 89, previewUrl: '#' },
  { id: 't5', name: 'Encuesta de Necesidades Básicas', version: 'v1.0', fields: 24, size: '720 KB', status: 'archived', updated: '2026-02-10', downloads: 12, previewUrl: '#' },
]

export default function TemplatesPageCoord() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = templates.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || t.status === filter
    return matchSearch && matchFilter
  })

  return (
    <PageWrapper>
      <TopBar
        title="Plantillas PDF"
        subtitle="Versiones imprimibles de tus formularios para trabajo en papel"
        actions={
          <button className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-secondary transition-colors">
            <FileText size={16} /> Generar nueva plantilla
          </button>
        }
      />

      <div className="p-6 space-y-5">
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-blue-800">¿Cómo funcionan las plantillas?</div>
            <div className="text-xs text-blue-600 mt-0.5">Cada formulario publicado genera automáticamente una versión PDF imprimible. Los técnicos pueden descargarla para trabajar sin smartphone, luego digitalizar con OCR.</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar plantillas..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-muted-foreground" />
            {['all', 'published', 'draft', 'archived'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${filter === f ? 'bg-brand-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                {f === 'all' ? 'Todos' : f === 'published' ? 'Publicados' : f === 'draft' ? 'Borrador' : 'Archivados'}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center">
                  <FileText size={20} className="text-red-500" />
                </div>
                <StatusBadge status={t.status} />
              </div>
              <h3 className="font-bold text-foreground text-sm leading-snug mb-2">{t.name}</h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-4">
                <span>{t.version}</span>
                <span>{t.fields} campos</span>
                <span>{t.size}</span>
                <span className="flex items-center gap-1"><Download size={10} />{t.downloads} descargas</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-colors">
                  <Eye size={13} /> Preview
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-brand-primary text-white rounded-xl text-xs font-semibold hover:bg-brand-secondary transition-colors">
                  <Download size={13} /> Descargar PDF
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><Globe size={10} />Actualizado: {t.updated}</span>
                <span className="flex items-center gap-1"><Smartphone size={10} />App ready</span>
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No se encontraron plantillas</p>
            <p className="text-sm mt-1">Intenta con otro término o crea una nueva plantilla</p>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
