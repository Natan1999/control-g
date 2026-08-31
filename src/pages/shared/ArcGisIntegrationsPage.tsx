import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CloudCog, Loader2, Paperclip, PauseCircle, Play, Plus, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { COLLECTION_IDS, DATABASE_ID, databases, Query } from '@/lib/backend'
import {
  cancelArcGisJob,
  createArcGisIntegration,
  enqueueArcGisJob,
  loadArcGisIntegrations,
  processArcGisJob,
  verifyArcGisIntegration,
  type ArcGisConnectionRecord,
  type ArcGisJobRecord,
  type ArcGisMappingRecord,
} from '@/lib/arcgis-jobs'
import { useAuthStore } from '@/stores/authStore'

const EMPTY_FORM = {
  name: '',
  portalUrl: 'https://www.arcgis.com',
  authMode: 'public' as ArcGisConnectionRecord['auth_mode'],
  clientId: '',
  credentialRef: 'ARCGIS_',
  serviceUrl: '',
  layerId: 0,
  direction: 'import' as ArcGisMappingRecord['direction'],
  formId: '',
  filterExpression: '1=1',
  batchSize: 500,
  attachmentPolicy: 'none' as ArcGisMappingRecord['attachment_policy'],
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Pendiente de verificar', active: 'Activa', paused: 'Pausada', error: 'Con error', revoked: 'Revocada',
  pending: 'Pendiente', running: 'En ejecución', completed: 'Completado', partial: 'Parcial', failed: 'Falló', cancelled: 'Cancelado',
}

function attachmentResult(job: ArcGisJobRecord) {
  const value = job.result_summary?.attachments
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const summary = value as Record<string, unknown>
  return {
    succeeded: Number(summary.succeeded || 0),
    failed: Number(summary.failed || 0),
    skipped: Number(summary.skipped || 0),
  }
}

export default function ArcGisIntegrationsPage() {
  const { user } = useAuthStore()
  const [entities, setEntities] = useState<any[]>([])
  const [entityId, setEntityId] = useState(user?.entityId || '')
  const [connections, setConnections] = useState<ArcGisConnectionRecord[]>([])
  const [mappings, setMappings] = useState<ArcGisMappingRecord[]>([])
  const [jobs, setJobs] = useState<ArcGisJobRecord[]>([])
  const [forms, setForms] = useState<any[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const connectionById = useMemo(() => new Map(connections.map(item => [item.id, item])), [connections])

  const loadEntities = useCallback(async () => {
    if (!user) return
    if (user.role !== 'admin' && user.entityId) {
      const entity = await databases.getDocument(DATABASE_ID, COLLECTION_IDS.ENTITIES, user.entityId)
      setEntities([entity])
      setEntityId(user.entityId)
      return
    }
    const result = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ENTITIES, [Query.orderAsc('name'), Query.limit(500)])
    setEntities(result.documents)
    setEntityId(current => current || result.documents[0]?.$id || '')
  }, [user])

  const load = useCallback(async () => {
    if (!entityId) { setLoading(false); return }
    setLoading(true)
    setError('')
    try {
      const [integrationData, formResult] = await Promise.all([
        loadArcGisIntegrations(entityId),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORMS, [Query.equal('entity_id', entityId), Query.equal('status', 'published'), Query.limit(500)]),
      ])
      setConnections(integrationData.connections)
      setMappings(integrationData.mappings)
      setJobs(integrationData.jobs)
      setForms(formResult.documents)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar las integraciones ArcGIS.')
    } finally {
      setLoading(false)
    }
  }, [entityId])

  useEffect(() => { void loadEntities() }, [loadEntities])
  useEffect(() => { void load() }, [load])

  const saveIntegration = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user || !entityId) return
    setBusyId('new')
    setError('')
    setMessage('')
    try {
      const created = await createArcGisIntegration({
        entityId,
        ...form,
        createdBy: user.id,
      })
      setMessage('Conexión creada. Verifícala antes de ejecutar trabajos.')
      setForm(EMPTY_FORM)
      setShowForm(false)
      await load()
      if (created.connection.auth_mode === 'public') {
        await verifyArcGisIntegration(created.connection.id, created.mapping.id)
        setMessage('Servicio público verificado y listo para importar.')
        await load()
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No fue posible crear la integración.')
    } finally { setBusyId('') }
  }

  const verify = async (connection: ArcGisConnectionRecord, mapping: ArcGisMappingRecord) => {
    setBusyId(`verify:${mapping.id}`)
    setError('')
    try {
      const result = await verifyArcGisIntegration(connection.id, mapping.id)
      setMessage(`Conexión verificada: ${result.summary?.name || connection.name}.${result.summary?.hasAttachments ? ' La capa admite adjuntos.' : ''}`)
      await load()
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'No fue posible verificar ArcGIS.')
    } finally { setBusyId('') }
  }

  const run = async (mapping: ArcGisMappingRecord) => {
    setBusyId(`run:${mapping.id}`)
    setError('')
    try {
      const jobId = await enqueueArcGisJob(mapping)
      const result = await processArcGisJob(jobId)
      const attachmentText = result.attachments
        ? ` Fotos: ${result.attachments.succeeded || 0} publicadas, ${result.attachments.failed || 0} con error y ${result.attachments.skipped || 0} excluidas por política.`
        : ''
      setMessage(`Trabajo ${mapping.direction === 'import' ? 'de importación' : 'de exportación'} terminado: ${result.succeeded || 0} registros correctos, ${result.failed || 0} con error.${attachmentText}`)
      await load()
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'No fue posible ejecutar el trabajo ArcGIS.')
      await load()
    } finally { setBusyId('') }
  }

  const cancel = async (jobId: string) => {
    setBusyId(`cancel:${jobId}`)
    try {
      await cancelArcGisJob(jobId)
      setMessage('Trabajo cancelado.')
      await load()
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'No fue posible cancelar el trabajo.')
    } finally { setBusyId('') }
  }

  return (
    <PageWrapper>
      <TopBar title="Integraciones ArcGIS" subtitle="OAuth servidor, capas controladas, trabajos idempotentes y trazabilidad" actions={<Button variant="outline" className="h-11 gap-2" onClick={() => void load()} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /><span className="hidden sm:inline">Actualizar</span></Button>} />
      <div className="space-y-5 p-4 sm:p-6">
        {user?.role === 'admin' && <label className="block max-w-lg text-xs font-black uppercase tracking-wide text-slate-500">Entidad<select value={entityId} onChange={event => setEntityId(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm normal-case text-slate-900">{entities.map(item => <option key={item.$id} value={item.$id}>{item.name}</option>)}</select></label>}
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div>}

        <section className="rounded-2xl border border-slate-200 bg-[#1B3A4B] p-5 text-white shadow-sm">
          <div className="flex items-start gap-4"><ShieldCheck className="mt-1 shrink-0 text-[#8EC5FF]" /><div><h2 className="font-black">Secretos fuera del navegador</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-white/75">Control G guarda únicamente una referencia como <code className="rounded bg-white/10 px-1.5 py-1">ARCGIS_ENTIDAD_CLIENT_SECRET</code>. El Client Secret real debe configurarse con ese nombre en las variables cifradas de Vercel; nunca se escribe en Supabase, IndexedDB ni el APK.</p></div></div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5"><div><h2 className="font-black text-[#1B3A4B]">Conexiones y capas</h2><p className="mt-1 text-xs text-slate-500">Importación pública o intercambio privado mediante OAuth 2.0 de aplicación.</p></div><Button className="h-11 gap-2" onClick={() => setShowForm(value => !value)}><Plus size={16} /> Nueva integración</Button></div>
          {showForm && <form onSubmit={saveIntegration} className="grid gap-4 border-b bg-slate-50 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
            <label className="text-xs font-bold text-slate-600">Nombre<input required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="Catastro institucional" className="mt-1 h-11 w-full rounded-xl border px-3 text-sm" /></label>
            <label className="text-xs font-bold text-slate-600">Modo<select value={form.authMode} onChange={event => setForm(current => ({ ...current, authMode: event.target.value as any, direction: event.target.value === 'public' ? 'import' : current.direction, attachmentPolicy: event.target.value === 'public' ? 'none' : current.attachmentPolicy }))} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm"><option value="public">Servicio público (solo importar)</option><option value="app_credentials">OAuth de aplicación</option></select></label>
            <label className="text-xs font-bold text-slate-600">Dirección<select value={form.direction} onChange={event => { const direction = event.target.value as ArcGisMappingRecord['direction']; setForm(current => ({ ...current, direction, attachmentPolicy: direction === 'export' ? current.attachmentPolicy : 'none' })) }} disabled={form.authMode === 'public'} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm disabled:bg-slate-100"><option value="import">Importar a Control G</option><option value="export">Exportar respuestas</option></select></label>
            <label className="text-xs font-bold text-slate-600">Portal ArcGIS<input required type="url" value={form.portalUrl} onChange={event => setForm(current => ({ ...current, portalUrl: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm" /></label>
            <label className="text-xs font-bold text-slate-600 lg:col-span-2">URL de FeatureServer/MapServer<input required type="url" value={form.serviceUrl} onChange={event => setForm(current => ({ ...current, serviceUrl: event.target.value }))} placeholder="https://services.arcgis.com/.../FeatureServer/0" className="mt-1 h-11 w-full rounded-xl border px-3 text-sm" /></label>
            {form.authMode !== 'public' && <><label className="text-xs font-bold text-slate-600">Client ID<input required value={form.clientId} onChange={event => setForm(current => ({ ...current, clientId: event.target.value }))} autoComplete="off" className="mt-1 h-11 w-full rounded-xl border px-3 text-sm" /></label><label className="text-xs font-bold text-slate-600 sm:col-span-2">Referencia del Client Secret<input required pattern="ARCGIS_[A-Z0-9_]{3,56}" value={form.credentialRef} onChange={event => setForm(current => ({ ...current, credentialRef: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))} autoComplete="off" className="mt-1 h-11 w-full rounded-xl border px-3 font-mono text-sm" /></label></>}
            {form.direction === 'export' && <label className="text-xs font-bold text-slate-600">Formulario (opcional)<select value={form.formId} onChange={event => setForm(current => ({ ...current, formId: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm"><option value="">Todos los formularios</option>{forms.map(item => <option key={item.$id} value={item.$id}>{item.title}</option>)}</select></label>}
            {form.direction === 'import' && <label className="text-xs font-bold text-slate-600">Filtro ArcGIS<input value={form.filterExpression} onChange={event => setForm(current => ({ ...current, filterExpression: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border px-3 font-mono text-sm" /></label>}
            <label className="text-xs font-bold text-slate-600">Tamaño de lote<input min={1} max={2000} type="number" value={form.batchSize} onChange={event => setForm(current => ({ ...current, batchSize: Number(event.target.value) }))} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm" /></label>
            {form.direction === 'export' && <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 sm:col-span-2 lg:col-span-3"><input type="checkbox" checked={form.attachmentPolicy === 'authorized'} onChange={event => setForm(current => ({ ...current, attachmentPolicy: event.target.checked ? 'authorized' : 'none' }))} className="mt-1 h-5 w-5 shrink-0 accent-[#1B3A4B]" /><span><strong>Autorizo publicar fotografías de evidencia en ArcGIS.</strong> Control G excluye firmas, limita a tres fotos por registro, verifica entidad, tipo, tamaño y SHA-256, y usa nombres técnicos sin datos personales. La capa debe tener adjuntos habilitados.</span></label>}
            <Button disabled={busyId === 'new'} className="h-11 self-end">{busyId === 'new' && <Loader2 size={16} className="mr-2 animate-spin" />}Guardar integración</Button>
          </form>}
          <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
            {mappings.map(mapping => {
              const connection = connectionById.get(mapping.connection_id)
              if (!connection) return null
              const busy = busyId.endsWith(mapping.id)
              return <article key={mapping.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-slate-900">{connection.name}</h3><p className="mt-1 break-all text-xs text-slate-500">{mapping.service_url}{!/\/(FeatureServer|MapServer)\/\d+$/i.test(mapping.service_url) ? `/${mapping.layer_id}` : ''}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${connection.status === 'active' ? 'bg-emerald-50 text-emerald-800' : connection.status === 'error' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>{STATUS_LABELS[connection.status] || connection.status}</span></div><dl className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><div className="rounded-xl bg-slate-50 p-2"><dt className="text-slate-400">Flujo</dt><dd className="mt-1 font-black">{mapping.direction === 'import' ? 'Importar' : 'Exportar'}</dd></div><div className="rounded-xl bg-slate-50 p-2"><dt className="text-slate-400">Lote</dt><dd className="mt-1 font-black">{mapping.batch_size}</dd></div><div className="rounded-xl bg-slate-50 p-2"><dt className="text-slate-400">Auth</dt><dd className="mt-1 font-black">{connection.auth_mode === 'public' ? 'Pública' : 'OAuth'}</dd></div><div className="rounded-xl bg-slate-50 p-2"><dt className="text-slate-400">Evidencias</dt><dd className="mt-1 flex items-center gap-1 font-black"><Paperclip size={13} />{mapping.attachment_policy === 'authorized' ? 'Fotos autorizadas' : 'No publicar'}</dd></div></dl><div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" className="h-10" disabled={busy} onClick={() => void verify(connection, mapping)}>{busyId === `verify:${mapping.id}` ? <Loader2 size={15} className="mr-2 animate-spin" /> : <CheckCircle2 size={15} className="mr-2" />}Verificar</Button><Button className="h-10" disabled={busy || connection.status !== 'active'} onClick={() => void run(mapping)}>{busyId === `run:${mapping.id}` ? <Loader2 size={15} className="mr-2 animate-spin" /> : <Play size={15} className="mr-2" />}Ejecutar</Button></div></article>
            })}
            {!mappings.length && !loading && <p className="py-10 text-center text-sm text-slate-500 lg:col-span-2">Aún no hay integraciones ArcGIS configuradas.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b p-4 sm:p-5"><h2 className="flex items-center gap-2 font-black text-[#1B3A4B]"><CloudCog size={19} /> Historial de trabajos</h2><p className="mt-1 text-xs text-slate-500">Conteos, reintentos y resultados sin exponer respuestas personales.</p></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Conexión</th><th className="px-4 py-3">Flujo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Correctos / errores</th><th className="px-4 py-3">Acción</th></tr></thead><tbody className="divide-y">{jobs.map(job => { const attachments = attachmentResult(job); return <tr key={job.id}><td className="whitespace-nowrap px-4 py-3">{new Date(job.created_at).toLocaleString('es-CO')}</td><td className="px-4 py-3 font-bold">{connectionById.get(job.connection_id)?.name || job.connection_id}</td><td className="px-4 py-3">{job.direction === 'import' ? 'Importar' : 'Exportar'}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1.5">{job.status === 'completed' ? <CheckCircle2 size={15} className="text-emerald-600" /> : job.status === 'failed' ? <XCircle size={15} className="text-red-600" /> : <PauseCircle size={15} className="text-amber-600" />}{STATUS_LABELS[job.status] || job.status}</span></td><td className="px-4 py-3"><span>{job.succeeded_count || 0} / {job.failed_count || 0}</span>{attachments && <span className="mt-1 block text-xs text-slate-500">Fotos {attachments.succeeded}/{attachments.failed} · excluidas {attachments.skipped}</span>}</td><td className="px-4 py-3">{['pending','partial','failed','paused'].includes(job.status) && <button type="button" disabled={Boolean(busyId)} onClick={() => job.status === 'pending' ? void cancel(job.id) : void processArcGisJob(job.id).then(load).catch(runError => setError(runError instanceof Error ? runError.message : 'No fue posible reintentar.'))} className="text-xs font-black text-[#1B3A4B] underline">{job.status === 'pending' ? 'Cancelar' : 'Reintentar'}</button>}</td></tr> })}{!jobs.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Sin trabajos registrados.</td></tr>}</tbody></table></div></section>
      </div>
    </PageWrapper>
  )
}
