import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, BarChart3, CalendarDays, Download, FileSpreadsheet,
  FileText, Filter, Loader2, MapPinned, RefreshCw, ShieldCheck, DatabaseZap,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { buildAnalyticsReport, listAnalyticsVariables, normalizeIndicatorDefinition } from '@/lib/analytics'
import { analyticsOperations, COLLECTION_IDS, DATABASE_ID, databases, governance, ID, Query } from '@/lib/backend'
import { createReportArtifact, downloadReportArtifact, sha256Hex, type AnalyticsExportFormat } from '@/lib/report-export'
import { useAuthStore } from '@/stores/authStore'
import type { AnalyticsFilters } from '@/types/analytics'

const EMPTY_FILTERS: AnalyticsFilters = {
  formId: '',
  municipalityId: '',
  status: '',
  from: '',
  to: '',
  variableKey: '',
}

const CHART_COLORS = ['#1B3A4B', '#3D7B9E', '#27AE60', '#F39C12', '#E74C3C', '#7F8C8D']

function asDateLabel(value: string) {
  if (!value) return '—'
  return new Date(`${value}T12:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

export default function AnalyticsPage() {
  const { user } = useAuthStore()
  const [entities, setEntities] = useState<any[]>([])
  const [entityId, setEntityId] = useState(user?.entityId || '')
  const [forms, setForms] = useState<any[]>([])
  const [responses, setResponses] = useState<any[]>([])
  const [municipalities, setMunicipalities] = useState<any[]>([])
  const [indicatorDefinitions, setIndicatorDefinitions] = useState<any[]>([])
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [filters, setFilters] = useState<AnalyticsFilters>(EMPTY_FILTERS)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<AnalyticsExportFormat | null>(null)
  const [snapshotting, setSnapshotting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadEntities = useCallback(async () => {
    if (!user) return
    if (user.role !== 'admin' && user.entityId) {
      try {
        const entity = await databases.getDocument(DATABASE_ID, COLLECTION_IDS.ENTITIES, user.entityId)
        setEntities([entity])
      } catch { setEntities([]) }
      setEntityId(user.entityId)
      return
    }
    const result = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ENTITIES, [Query.orderAsc('name'), Query.limit(500)])
    setEntities(result.documents)
    setEntityId(current => current || result.documents[0]?.$id || '')
  }, [user])

  const loadAnalytics = useCallback(async () => {
    if (!entityId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const [formResult, responseResult, municipalityResult, indicatorResult, snapshotResult] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORMS, [Query.equal('entity_id', entityId), Query.limit(1000)]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORM_RESPONSES, [Query.equal('entity_id', entityId), Query.orderDesc('captured_at'), Query.limit(5000)]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ENTITY_MUNICIPALITIES, [Query.equal('entity_id', entityId), Query.orderAsc('municipality_name'), Query.limit(2000)]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.INDICATOR_DEFINITIONS, [Query.limit(1000)]).catch(() => ({ documents: [], total: 0 })),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.INDICATOR_SNAPSHOTS, [Query.equal('entity_id', entityId), Query.orderDesc('cutoff_at'), Query.limit(200)]).catch(() => ({ documents: [], total: 0 })),
      ])
      setForms(formResult.documents)
      setResponses(responseResult.documents)
      setMunicipalities(municipalityResult.documents)
      setIndicatorDefinitions(indicatorResult.documents
        .filter((item: any) => !item.entity_id || item.entity_id === entityId)
        .map(normalizeIndicatorDefinition))
      setSnapshots(snapshotResult.documents)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar los datos analíticos.')
    } finally {
      setLoading(false)
    }
  }, [entityId])

  useEffect(() => { void loadEntities() }, [loadEntities])
  useEffect(() => { void loadAnalytics() }, [loadAnalytics])

  const entity = entities.find(item => item.$id === entityId)
  const variables = useMemo(() => listAnalyticsVariables(forms, responses)
    .filter(variable => !filters.formId || variable.formId === filters.formId), [filters.formId, forms, responses])
  const report = useMemo(() => buildAnalyticsReport({
    entityId,
    entityName: entity?.name || 'Entidad',
    forms,
    responses,
    municipalities,
    filters,
    minimumGroupSize: 5,
  }), [entity?.name, entityId, filters, forms, municipalities, responses])
  const indicatorById = useMemo(() => new Map(indicatorDefinitions.map(item => [item.id, item])), [indicatorDefinitions])
  const latestSnapshotCutoff = snapshots[0]?.cutoff_at || ''
  const latestSnapshots = latestSnapshotCutoff ? snapshots.filter(item => item.cutoff_at === latestSnapshotCutoff) : []

  const setFilter = (key: keyof AnalyticsFilters, value: string) => {
    setFilters(current => ({
      ...current,
      [key]: value,
      ...(key === 'formId' ? { variableKey: '' } : {}),
    }))
  }

  const exportReport = async (format: AnalyticsExportFormat) => {
    if (!user || !entityId) return
    setExporting(format)
    setError('')
    setMessage('')
    try {
      const artifact = await createReportArtifact(format, report)
      const checksum = await sha256Hex(artifact.blob)
      downloadReportArtifact(artifact)
      await Promise.allSettled([
        databases.createDocument(DATABASE_ID, COLLECTION_IDS.REPORT_RUNS, ID.unique(), {
          entity_id: entityId,
          report_type: 'institutional_analytics',
          output_format: format,
          cutoff_at: report.cutoffAt,
          filters,
          methodology_version: report.methodologyVersion,
          status: 'completed',
          row_count: report.recordCount,
          sha256: checksum,
          created_by: user.id,
          completed_at: new Date().toISOString(),
        }),
        governance.recordSensitiveAccess({
          action: 'export_aggregated_report',
          resourceType: 'analytics_report',
          purpose: 'Generación de informe institucional agregado',
          metadata: { format, cutoff_at: report.cutoffAt, filters, row_count: report.recordCount },
        }),
      ])
      setMessage(`${artifact.filename} generado con trazabilidad metodológica.`)
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'No fue posible generar el informe.')
    } finally {
      setExporting(null)
    }
  }

  const createServerSnapshot = async () => {
    if (!entityId) return
    setSnapshotting(true)
    setError('')
    setMessage('')
    try {
      const result = await analyticsOperations.runSnapshots(entityId, report.cutoffAt, { ...filters })
      setMessage(`${result.snapshot_count} resultados territoriales calculados y fijados en Supabase con corte ${new Date(result.cutoff_at).toLocaleString('es-CO')}.`)
      await loadAnalytics()
    } catch (snapshotError) {
      setError(snapshotError instanceof Error ? snapshotError.message : 'No fue posible crear el snapshot en el servidor.')
    } finally { setSnapshotting(false) }
  }

  const timeline = report.timeline.map(item => ({ ...item, label: asDateLabel(item.date) }))
  const thematicChart = report.thematicDistribution.map(item => ({
    ...item,
    count: item.suppressed ? 0 : item.count,
    label: item.suppressed ? 'Categorías protegidas' : item.label,
  }))

  return (
    <PageWrapper>
      <TopBar
        title="Analítica institucional"
        subtitle="Indicadores reproducibles, calidad, territorio y salidas ejecutivas"
        actions={(
          <div className="flex gap-2">
            <Button className="h-11 gap-2" onClick={() => void createServerSnapshot()} disabled={loading || snapshotting || !entityId}>
              {snapshotting ? <Loader2 size={16} className="animate-spin" /> : <DatabaseZap size={16} />}
              <span className="hidden sm:inline">Fijar corte</span>
            </Button>
            <Button variant="outline" className="h-11 gap-2" onClick={() => void loadAnalytics()} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
          </div>
        )}
      />

      <div className="space-y-6 p-4 sm:p-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="analytics-filters-title">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="analytics-filters-title" className="flex items-center gap-2 font-black text-[#1B3A4B]"><Filter size={18} /> Corte y segmentación</h2>
              <p className="mt-1 text-xs text-slate-500">Los filtros, la fecha de corte y la versión metodológica se incorporan en cada salida.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">{report.methodologyVersion}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {user?.role === 'admin' && (
              <label className="space-y-1 text-xs font-bold text-slate-600">
                Entidad
                <select className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" value={entityId} onChange={event => setEntityId(event.target.value)}>
                  {entities.map(item => <option key={item.$id} value={item.$id}>{item.name}</option>)}
                </select>
              </label>
            )}
            <label className="space-y-1 text-xs font-bold text-slate-600">
              Formulario
              <select className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" value={filters.formId} onChange={event => setFilter('formId', event.target.value)}>
                <option value="">Todos los formularios</option>
                {forms.map(form => <option key={form.$id} value={form.$id}>{form.title || form.name}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs font-bold text-slate-600">
              Territorio
              <select className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" value={filters.municipalityId} onChange={event => setFilter('municipalityId', event.target.value)}>
                <option value="">Todos los territorios</option>
                {municipalities.map(item => <option key={item.$id} value={item.$id}>{item.municipality_name}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs font-bold text-slate-600">
              Estado de revisión
              <select className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" value={filters.status} onChange={event => setFilter('status', event.target.value)}>
                <option value="">Todos los estados</option>
                <option value="synced">Sincronizado</option><option value="reviewed">Revisado</option><option value="approved">Aprobado</option><option value="rejected">Rechazado</option>
              </select>
            </label>
            <label className="space-y-1 text-xs font-bold text-slate-600">
              Desde
              <input type="date" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" value={filters.from} onChange={event => setFilter('from', event.target.value)} />
            </label>
            <label className="space-y-1 text-xs font-bold text-slate-600">
              Hasta
              <input type="date" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" value={filters.to} onChange={event => setFilter('to', event.target.value)} />
            </label>
            <label className="space-y-1 text-xs font-bold text-slate-600 sm:col-span-2">
              Variable temática no sensible
              <select className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" value={filters.variableKey} onChange={event => setFilter('variableKey', event.target.value)}>
                <option value="">Sin variable seleccionada</option>
                {variables.map(variable => <option key={`${variable.formId}:${variable.key}`} value={`${variable.formId || ''}:${variable.key}`}>{variable.label}</option>)}
              </select>
            </label>
          </div>
        </section>

        {latestSnapshots.length > 0 && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm sm:p-5" aria-labelledby="server-snapshot-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 id="server-snapshot-title" className="flex items-center gap-2 font-black text-emerald-950"><DatabaseZap size={18} /> Último corte fijado en servidor</h2><p className="mt-1 text-xs text-emerald-800">{new Date(latestSnapshotCutoff).toLocaleString('es-CO')} · motor control-g-server-v1 · {latestSnapshots.length} resultados</p></div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-800">Reproducible</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {latestSnapshots.slice(0, 8).map(snapshot => {
                const definition = indicatorById.get(snapshot.indicator_definition_id)
                return <article key={snapshot.$id} className="rounded-xl border border-emerald-100 bg-white p-3"><p className="truncate text-xs font-bold text-slate-500">{definition?.name || snapshot.calculation_metadata?.indicator_code || 'Indicador'}</p><p className="mt-1 text-lg font-black text-[#1B3A4B]">{snapshot.suppressed ? 'Grupo protegido' : snapshot.indicator_value === null ? 'Sin dato' : Number(snapshot.indicator_value).toLocaleString('es-CO', { maximumFractionDigits: 2 })}</p><p className="mt-1 truncate text-[11px] text-slate-500">{snapshot.territory_name || 'Toda la entidad'} · n={snapshot.sample_size}</p></article>
              })}
            </div>
          </section>
        )}

        {error && <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertTriangle className="shrink-0" size={18} />{error}</div>}
        {message && <div role="status" className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><ShieldCheck className="shrink-0" size={18} />{message}</div>}

        {loading ? (
          <div className="flex min-h-72 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-500"><Loader2 className="animate-spin" /> Calculando indicadores…</div>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principales">
              {report.kpis.map(kpi => (
                <article key={kpi.code} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{kpi.label}</p>
                  <p className="mt-2 text-3xl font-black text-[#1B3A4B]">{kpi.display}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500" title={kpi.warning}>{kpi.methodology}</p>
                </article>
              ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="flex items-center gap-2 font-black text-[#1B3A4B]"><CalendarDays size={18} /> Captura y revisión por día</h2>
                <div className="mt-4 h-72" role="img" aria-label="Gráfica de registros, ubicaciones y revisiones por día">
                  {timeline.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={timeline}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Line type="monotone" dataKey="total" name="Registros" stroke="#1B3A4B" strokeWidth={3} /><Line type="monotone" dataKey="mapped" name="Con GPS" stroke="#3D7B9E" strokeWidth={2} /><Line type="monotone" dataKey="reviewed" name="Revisados" stroke="#27AE60" strokeWidth={2} /></LineChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-500">Sin datos para el corte.</div>}
                </div>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="flex items-center gap-2 font-black text-[#1B3A4B]"><BarChart3 size={18} /> Distribución por estado</h2>
                <div className="mt-4 h-72" role="img" aria-label="Gráfica de distribución de registros por estado">
                  {report.statusDistribution.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={report.statusDistribution} dataKey="count" nameKey="label" innerRadius={55} outerRadius={90} label>{report.statusDistribution.map((_, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-500">Sin estados disponibles.</div>}
                </div>
              </article>
            </section>

            {report.thematicVariable && (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="flex items-center gap-2 font-black text-[#1B3A4B]"><BarChart3 size={18} /> {report.thematicVariable.label}</h2>
                <p className="mt-1 text-xs text-slate-500">Las categorías con menos de cinco registros se agrupan y no muestran su conteo individual.</p>
                <div className="mt-4 h-80" role="img" aria-label={`Distribución temática de ${report.thematicVariable.label}`}>
                  <ResponsiveContainer width="100%" height="100%"><BarChart data={thematicChart} layout="vertical" margin={{ left: 18, right: 24 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" name="Registros" fill="#3D7B9E" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer>
                </div>
              </section>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="territory-table-title">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 sm:px-5">
                <div><h2 id="territory-table-title" className="flex items-center gap-2 font-black text-[#1B3A4B]"><MapPinned size={18} /> Resultado territorial</h2><p className="mt-1 text-xs text-slate-500">Cobertura frente a la meta, GPS y revisión por unidad territorial.</p></div>
                <span className="text-xs font-bold text-slate-500">{report.territories.length} territorios</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{['Territorio','Meta','Registros','GPS','Revisados','Rechazados','Cobertura'].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.territories.map(item => <tr key={item.id}><td className="px-4 py-3 font-bold text-slate-800">{item.suppressed ? 'Grupo pequeño suprimido' : item.name}</td><td className="px-4 py-3">{item.target || '—'}</td><td className="px-4 py-3">{item.suppressed ? '<5' : item.total}</td><td className="px-4 py-3">{item.suppressed ? '—' : `${item.gpsPercent.toFixed(1)}%`}</td><td className="px-4 py-3">{item.suppressed ? '—' : item.reviewed}</td><td className="px-4 py-3">{item.suppressed ? '—' : item.rejected}</td><td className="px-4 py-3 font-bold text-[#1B3A4B]">{item.suppressed ? '—' : item.coveragePercent === null ? 'Sin meta' : `${item.coveragePercent.toFixed(1)}%`}</td></tr>)}
                    {!report.territories.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No hay registros territoriales en este corte.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <h2 className="flex items-center gap-2 font-black"><AlertTriangle size={18} /> Interpretación responsable</h2>
                <ul className="mt-2 space-y-1 pl-5 text-xs leading-5">{report.warnings.map(warning => <li key={warning} className="list-disc">{warning}</li>)}</ul>
                <p className="mt-3 text-xs font-bold">Diccionario disponible: {indicatorDefinitions.length} indicadores versionados.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 font-black text-[#1B3A4B]"><Download size={18} /> Exportar corte</h2>
                <div className="grid grid-cols-2 gap-2">
                  {(['pdf','docx','xlsx','csv'] as AnalyticsExportFormat[]).map(format => (
                    <Button key={format} variant={format === 'pdf' ? 'default' : 'outline'} className="h-11 gap-2 uppercase" disabled={Boolean(exporting)} onClick={() => void exportReport(format)}>
                      {exporting === format ? <Loader2 size={15} className="animate-spin" /> : format === 'xlsx' ? <FileSpreadsheet size={15} /> : <FileText size={15} />}{format}
                    </Button>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </PageWrapper>
  )
}
