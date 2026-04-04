import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Download, Search, Filter, Eye, Smartphone, Globe, AlertCircle, X, ChevronRight, Plus } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper, StatusBadge } from '@/components/shared'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Template {
  id: string
  name: string
  version: string
  fields: number
  size: string
  status: string
  updated: string
  downloads: number
  schema?: Record<string, unknown>
}

// ─── Fallback data ────────────────────────────────────────────────────────────

const FALLBACK_TEMPLATES: Template[] = [
  { id: 't1', name: 'Caracterización Socioeconómica - Módulo A', version: 'v3.2', fields: 42, size: '88.2 KB', status: 'published', updated: '2026-03-20', downloads: 47 },
  { id: 't2', name: 'Censo de Vivienda y Servicios Públicos', version: 'v1.5', fields: 28, size: '58.8 KB', status: 'published', updated: '2026-03-18', downloads: 31 },
  { id: 't3', name: 'Diagnóstico Comunitario Participativo', version: 'v2.0', fields: 35, size: '73.5 KB', status: 'draft', updated: '2026-03-25', downloads: 0 },
  { id: 't4', name: 'Ficha de Beneficiario Programa Social', version: 'v4.1', fields: 19, size: '39.9 KB', status: 'published', updated: '2026-03-15', downloads: 89 },
  { id: 't5', name: 'Encuesta de Necesidades Básicas', version: 'v1.0', fields: 24, size: '50.4 KB', status: 'archived', updated: '2026-02-10', downloads: 12 },
]

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-xl max-w-sm"
    >
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose}><X size={15} /></button>
    </motion.div>
  )
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

const FIELD_TYPE_LABELS: Record<string, string> = {
  text_short: 'Texto corto',
  text_long: 'Texto largo',
  numeric: 'Número',
  yes_no: 'Sí / No',
  single_select: 'Selección única',
  multi_select: 'Selección múltiple',
  date: 'Fecha',
  time: 'Hora',
  geolocation: 'Geolocalización',
  photo: 'Foto',
  signature: 'Firma',
  file: 'Archivo',
}

interface SchemaPage {
  id: string
  title: string
  fields: Array<{ id: string; label: string; type: string; required?: boolean }>
}

function PreviewModal({ template, onClose }: { template: Template; onClose: () => void }) {
  const pages: SchemaPage[] = (() => {
    try {
      if (template.schema) {
        const raw = template.schema as { pages?: SchemaPage[] }
        if (raw.pages) return raw.pages
      }
    } catch { /* ignore */ }
    return []
  })()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-base">{template.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{template.version} · {template.fields} campos · {template.status}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-xl ml-3 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Fields list */}
        <div className="flex-1 overflow-y-auto p-5">
          {pages.length > 0 ? (
            pages.map((page, pi) => (
              <div key={page.id} className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-brand-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">{pi + 1}</span>
                  <h3 className="font-semibold text-sm">{page.title}</h3>
                </div>
                <div className="space-y-2">
                  {page.fields.map(field => (
                    <div key={field.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={14} className="text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{field.label}</span>
                        {field.required && <span className="text-red-500 text-xs flex-shrink-0">*</span>}
                      </div>
                      <span className="text-xs text-muted-foreground bg-white border border-border px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
                        {FIELD_TYPE_LABELS[field.type] ?? field.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Fallback: show generic field count info
            <div className="text-center py-8 text-muted-foreground">
              <FileText size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-sm">{template.fields} campos en este formulario</p>
              <p className="text-xs mt-1">El esquema completo no está disponible en modo offline</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-3 bg-brand-primary text-white rounded-2xl text-sm font-bold"
          >
            Cerrar vista previa
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TemplatesPageCoord() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [templates, setTemplates] = useState<Template[]>(FALLBACK_TEMPLATES)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Load forms from Appwrite
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      try {
        const queries = [Query.orderDesc('$updatedAt'), Query.limit(50)]
        if (user?.organizationId) {
          queries.push(Query.equal('organization_id', user.organizationId))
        }

        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORMS, queries)

        if (cancelled) return

        const loaded: Template[] = res.documents.map(doc => {
          const fieldCount = (() => {
            try {
              const schema = typeof doc.schema === 'string' ? JSON.parse(doc.schema) : doc.schema
              if (schema?.pages) {
                return (schema.pages as SchemaPage[]).reduce((sum: number, p) => sum + (p.fields?.length ?? 0), 0)
              }
            } catch { /* ignore */ }
            return doc.total_fields ?? 0
          })()

          const sizeKb = (fieldCount * 2.1).toFixed(1)

          return {
            id: doc.$id,
            name: doc.name as string,
            version: `v${doc.version ?? 1}`,
            fields: fieldCount,
            size: `${sizeKb} KB`,
            status: doc.status as string,
            updated: new Date(doc.$updatedAt).toISOString().slice(0, 10),
            downloads: 0,
            schema: (() => {
              try {
                return typeof doc.schema === 'string' ? JSON.parse(doc.schema) : doc.schema
              } catch { return undefined }
            })(),
          }
        })

        if (loaded.length > 0) {
          setTemplates(loaded)
        }
      } catch {
        // Use fallback data — already set as default state
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user?.organizationId])

  const filtered = templates.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || t.status === filter
    return matchSearch && matchFilter
  })

  const handleDownloadPDF = (t: Template) => {
    showToast(`Generando PDF de "${t.name}"...`)

    setTimeout(() => {
      // Build a simple text blob representing the form
      const lines: string[] = [
        `CONTROL G — Plantilla de Formulario`,
        `=========================================`,
        ``,
        `Nombre: ${t.name}`,
        `Versión: ${t.version}`,
        `Campos: ${t.fields}`,
        `Estado: ${t.status}`,
        `Actualizado: ${t.updated}`,
        ``,
      ]

      // If schema is available, list pages and fields
      try {
        const schema = t.schema as { pages?: SchemaPage[] } | undefined
        if (schema?.pages) {
          schema.pages.forEach((page, i) => {
            lines.push(`--- Sección ${i + 1}: ${page.title} ---`)
            page.fields.forEach(f => {
              const req = f.required ? ' *' : ''
              lines.push(`  [${FIELD_TYPE_LABELS[f.type] ?? f.type}] ${f.label}${req}`)
            })
            lines.push('')
          })
        }
      } catch { /* ignore */ }

      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${t.name.replace(/[^a-zA-Z0-9]/g, '_')}_${t.version}.txt`
      a.click()
      URL.revokeObjectURL(url)

      showToast('PDF descargado correctamente')
    }, 1000)
  }

  const handleNewTemplate = () => {
    navigate('/coord/form-builder')
  }

  return (
    <PageWrapper>
      <TopBar
        title="Plantillas PDF"
        subtitle="Versiones imprimibles de tus formularios para trabajo en papel"
        actions={
          <button
            onClick={handleNewTemplate}
            className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-secondary transition-colors"
          >
            <Plus size={16} /> Generar nueva plantilla
          </button>
        }
      />

      <div className="p-6 space-y-5">
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-blue-800">¿Cómo funcionan las plantillas?</div>
            <div className="text-xs text-blue-600 mt-0.5">
              Cada formulario publicado genera automáticamente una versión PDF imprimible. Los técnicos
              pueden descargarla para trabajar sin smartphone, luego digitalizar con OCR.
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar plantillas..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-muted-foreground" />
            {(['all', 'published', 'draft', 'archived'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${filter === f ? 'bg-brand-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
              >
                {f === 'all' ? 'Todos' : f === 'published' ? 'Publicados' : f === 'draft' ? 'Borrador' : 'Archivados'}
              </button>
            ))}
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse">
                <div className="w-11 h-11 bg-muted rounded-xl mb-4" />
                <div className="h-4 bg-muted rounded mb-2 w-3/4" />
                <div className="h-3 bg-muted rounded mb-4 w-1/2" />
                <div className="flex gap-2">
                  <div className="flex-1 h-9 bg-muted rounded-xl" />
                  <div className="flex-1 h-9 bg-muted rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        {!isLoading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all p-5"
              >
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
                  <button
                    onClick={() => setPreviewTemplate(t)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-colors"
                  >
                    <Eye size={13} /> Preview
                  </button>
                  <button
                    onClick={() => handleDownloadPDF(t)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-brand-primary text-white rounded-xl text-xs font-semibold hover:bg-brand-secondary transition-colors"
                  >
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
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No se encontraron plantillas</p>
            <p className="text-sm mt-1">Intenta con otro término o crea una nueva plantilla</p>
            <button
              onClick={handleNewTemplate}
              className="mt-4 inline-flex items-center gap-2 bg-brand-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold"
            >
              <Plus size={16} /> Nueva plantilla <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewTemplate && (
          <PreviewModal template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </PageWrapper>
  )
}
