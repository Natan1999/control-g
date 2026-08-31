import { useCallback, useEffect, useMemo, useState } from 'react'
import { Archive, CheckCircle2, Eye, FileKey2, Fingerprint, Loader2, PlayCircle, Plus, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { COLLECTION_IDS, DATABASE_ID, databases, governance, ID, Query } from '@/lib/backend'
import { useAuthStore } from '@/stores/authStore'

const EMPTY_POLICY = {
  dataClass: 'form_responses',
  retentionDays: 1825,
  legalBasis: 'Finalidad contractual, obligación legal y política institucional de tratamiento de datos',
  disposition: 'review',
}

const DISPOSITION_LABELS: Record<string, string> = { review: 'Revisión', anonymize: 'Anonimización', delete: 'Eliminación segura' }

export default function GovernancePage() {
  const { user } = useAuthStore()
  const [entities, setEntities] = useState<any[]>([])
  const [entityId, setEntityId] = useState(user?.entityId || '')
  const [entity, setEntity] = useState<any>(null)
  const [policies, setPolicies] = useState<any[]>([])
  const [consents, setConsents] = useState<any[]>([])
  const [evidence, setEvidence] = useState<any[]>([])
  const [accesses, setAccesses] = useState<any[]>([])
  const [retentionRuns, setRetentionRuns] = useState<any[]>([])
  const [policy, setPolicy] = useState(EMPTY_POLICY)
  const [showPolicy, setShowPolicy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [runningPolicyId, setRunningPolicyId] = useState('')
  const [executionPolicy, setExecutionPolicy] = useState<any>(null)
  const [executionConfirmation, setExecutionConfirmation] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadEntities = useCallback(async () => {
    if (!user) return
    if (user.role !== 'admin' && user.entityId) {
      const document = await databases.getDocument(DATABASE_ID, COLLECTION_IDS.ENTITIES, user.entityId)
      setEntities([document])
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
      const [entityDocument, policyResult, consentResult, evidenceResult, accessResult, runResult] = await Promise.all([
        databases.getDocument(DATABASE_ID, COLLECTION_IDS.ENTITIES, entityId),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.RETENTION_POLICIES, [Query.equal('entity_id', entityId), Query.orderDesc('effective_from'), Query.limit(500)]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.CONSENT_RECORDS, [Query.equal('entity_id', entityId), Query.limit(2000)]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.EVIDENCE_FILES, [Query.equal('entity_id', entityId), Query.limit(2000)]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.SENSITIVE_ACCESS_LOG, [Query.equal('entity_id', entityId), Query.orderDesc('created_at'), Query.limit(100)]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.RETENTION_RUNS, [Query.equal('entity_id', entityId), Query.orderDesc('created_at'), Query.limit(100)]).catch(() => ({ documents: [], total: 0 })),
      ])
      setEntity(entityDocument)
      setPolicies(policyResult.documents)
      setConsents(consentResult.documents)
      setEvidence(evidenceResult.documents)
      setAccesses(accessResult.documents)
      setRetentionRuns(runResult.documents)
      void governance.recordSensitiveAccess({
        action: 'view_governance_dashboard',
        resourceType: 'governance',
        purpose: 'Administración de privacidad, retención e integridad institucional',
        metadata: { entity_id: entityId },
      }).catch(() => {})
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar el gobierno de datos.')
    } finally {
      setLoading(false)
    }
  }, [entityId])

  useEffect(() => { void loadEntities() }, [loadEntities])
  useEffect(() => { void load() }, [load])

  const consentSummary = useMemo(() => Object.fromEntries(['granted','denied','withdrawn','expired'].map(status => [status, consents.filter(item => item.status === status).length])), [consents])
  const evidenceWithHash = evidence.filter(item => /^[0-9a-f]{64}$/i.test(item.sha256 || '')).length

  const savePolicy = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user || !entityId) return
    setSaving(true)
    setError('')
    try {
      await databases.createDocument(DATABASE_ID, COLLECTION_IDS.RETENTION_POLICIES, ID.unique(), {
        entity_id: entityId,
        data_class: policy.dataClass.trim(),
        retention_days: Number(policy.retentionDays),
        legal_basis: policy.legalBasis.trim(),
        disposition: policy.disposition,
        status: 'active',
        effective_from: new Date().toISOString().slice(0, 10),
        created_by: user.id,
      })
      setPolicy(EMPTY_POLICY)
      setShowPolicy(false)
      setMessage('Política de retención publicada y registrada en auditoría.')
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No fue posible crear la política.')
    } finally {
      setSaving(false)
    }
  }

  const toggleMfa = async () => {
    if (user?.role !== 'admin' || !entity) return
    setSaving(true)
    try {
      const enabled = !entity.require_mfa_for_privileged
      await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.ENTITIES, entityId, { require_mfa_for_privileged: enabled })
      setMessage(enabled ? 'MFA obligatorio activado. Coordina el enrolamiento antes de imponer AAL2 en RLS.' : 'MFA obligatorio desactivado en la interfaz.')
      await load()
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'No fue posible actualizar MFA.')
    } finally { setSaving(false) }
  }

  const previewRetention = async (item: any) => {
    setRunningPolicyId(item.$id)
    setError('')
    setMessage('')
    try {
      const result = await governance.runRetentionPolicy({ policyId: item.$id })
      setMessage(`Vista previa: ${result.eligible_count} registros vencidos al corte ${new Date(result.cutoff_at).toLocaleString('es-CO')}; no se modificó información.`)
      await load()
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : 'No fue posible calcular la vista previa.')
    } finally { setRunningPolicyId('') }
  }

  const executeRetention = async () => {
    if (!executionPolicy || user?.role !== 'admin') return
    setRunningPolicyId(executionPolicy.$id)
    setError('')
    setMessage('')
    try {
      const result = await governance.runRetentionPolicy({
        policyId: executionPolicy.$id,
        execute: true,
        confirmation: executionConfirmation,
      })
      setMessage(result.status === 'requires_manual_workflow'
        ? `Se registró la ejecución, pero ${result.eligible_count} elementos requieren purga coordinada de archivos o revisión legal.`
        : `Ejecución auditada: ${result.affected_count} de ${result.eligible_count} registros procesados (${result.status}).`)
      setExecutionPolicy(null)
      setExecutionConfirmation('')
      await load()
    } catch (executionError) {
      setError(executionError instanceof Error ? executionError.message : 'No fue posible ejecutar la política.')
    } finally { setRunningPolicyId('') }
  }

  return (
    <PageWrapper>
      <TopBar title="Gobierno de datos" subtitle="Privacidad, consentimiento, retención, MFA e integridad de evidencias" actions={<Button variant="outline" className="h-11 gap-2" onClick={() => void load()} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /><span className="hidden sm:inline">Actualizar</span></Button>} />
      <div className="space-y-5 p-4 sm:p-6">
        {user?.role === 'admin' && <label className="block max-w-lg text-xs font-black uppercase tracking-wide text-slate-500">Entidad<select value={entityId} onChange={event => setEntityId(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm normal-case text-slate-900">{entities.map(item => <option key={item.$id} value={item.$id}>{item.name}</option>)}</select></label>}
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div>}

        {loading ? <div className="grid min-h-72 place-items-center rounded-2xl border bg-white"><Loader2 className="animate-spin text-slate-500" /></div> : <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores de gobierno de datos">
            {[
              { label: 'Consentimientos vigentes', value: consentSummary.granted || 0, icon: CheckCircle2 },
              { label: 'Evidencias con SHA-256', value: `${evidenceWithHash}/${evidence.length}`, icon: Fingerprint },
              { label: 'Políticas activas', value: policies.filter(item => item.status === 'active').length, icon: Archive },
              { label: 'Accesos trazados', value: accesses.length, icon: FileKey2 },
            ].map(item => <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><item.icon size={19} className="text-[#3D7B9E]" /><p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-500">{item.label}</p><p className="mt-2 text-3xl font-black text-[#1B3A4B]">{item.value}</p></article>)}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 font-black text-[#1B3A4B]"><ShieldCheck size={19} /> Autenticación reforzada</h2><p className="mt-2 text-sm leading-6 text-slate-600">MFA para administración, coordinación y apoyo de {entity?.name || 'la entidad'}.</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${entity?.require_mfa_for_privileged ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{entity?.require_mfa_for_privileged ? 'Activado' : 'Opcional'}</span></div>
              {user?.role === 'admin' && <Button className="mt-5 h-11" variant="outline" onClick={() => void toggleMfa()} disabled={saving}>{entity?.require_mfa_for_privileged ? 'Dejar MFA opcional' : 'Exigir MFA'}</Button>}
              <p className="mt-4 text-xs leading-5 text-amber-800">La imposición AAL2 en RLS requiere una ventana de cambio y al menos dos administradores enrolados.</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-black text-[#1B3A4B]">Estados de consentimiento</h2>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">{[['Otorgado','granted'],['Denegado','denied'],['Retirado','withdrawn'],['Vencido','expired']].map(([label,status]) => <div key={status} className="rounded-xl bg-slate-50 p-3"><dt className="text-xs font-bold text-slate-500">{label}</dt><dd className="mt-1 text-xl font-black text-slate-900">{consentSummary[status] || 0}</dd></div>)}</dl>
            </article>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5"><div><h2 className="font-black text-[#1B3A4B]">Retención y disposición</h2><p className="mt-1 text-xs text-slate-500">Cada clase de datos debe tener finalidad, plazo y disposición autorizada.</p></div><Button className="h-11 gap-2" onClick={() => setShowPolicy(value => !value)}><Plus size={16} /> Nueva política</Button></div>
            {showPolicy && <form onSubmit={savePolicy} className="grid gap-3 border-b bg-slate-50 p-4 sm:grid-cols-2 sm:p-5"><label className="text-xs font-bold text-slate-600">Clase de datos<select required value={policy.dataClass} onChange={event => setPolicy(current => ({ ...current, dataClass: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm"><option value="form_responses">Respuestas de formularios</option><option value="evidence_files">Evidencias y archivos</option><option value="consent_records">Consentimientos</option><option value="sensitive_access_log">Bitácora de accesos sensibles</option><option value="indicator_snapshots">Snapshots de indicadores</option><option value="report_runs">Ejecuciones de informes</option></select></label><label className="text-xs font-bold text-slate-600">Retención en días<input required min={0} type="number" value={policy.retentionDays} onChange={event => setPolicy(current => ({ ...current, retentionDays: Number(event.target.value) }))} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm" /></label><label className="text-xs font-bold text-slate-600 sm:col-span-2">Base legal o contractual<textarea required value={policy.legalBasis} onChange={event => setPolicy(current => ({ ...current, legalBasis: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border p-3 text-sm" /></label><label className="text-xs font-bold text-slate-600">Disposición<select value={policy.disposition} onChange={event => setPolicy(current => ({ ...current, disposition: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm"><option value="review">Revisar al vencimiento</option><option value="anonymize">Anonimizar</option><option value="delete">Eliminar de forma segura</option></select></label><Button disabled={saving} className="h-11 self-end">{saving && <Loader2 size={16} className="mr-2 animate-spin" />}Publicar política</Button></form>}
            {executionPolicy && <div className="border-b border-rose-200 bg-rose-50 p-4 sm:p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="font-black text-rose-950">Ejecución controlada</h3><p className="mt-1 text-xs leading-5 text-rose-800">Se procesará la política {executionPolicy.$id}. Primero usa “Vista previa”. Para confirmar escribe exactamente <strong>RETENTION:{executionPolicy.$id}</strong>.</p></div><button type="button" className="rounded-lg p-2 text-rose-800" aria-label="Cancelar ejecución" onClick={() => { setExecutionPolicy(null); setExecutionConfirmation('') }}><X size={18} /></button></div><input value={executionConfirmation} onChange={event => setExecutionConfirmation(event.target.value)} autoComplete="off" className="mt-3 h-11 w-full rounded-xl border border-rose-200 bg-white px-3 text-sm" placeholder={`RETENTION:${executionPolicy.$id}`} /><Button variant="destructive" disabled={runningPolicyId === executionPolicy.$id || executionConfirmation !== `RETENTION:${executionPolicy.$id}`} onClick={() => void executeRetention()} className="mt-3 h-11 w-full gap-2"><PlayCircle size={16} /> Ejecutar disposición auditada</Button></div>}
            <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Clase</th><th className="px-4 py-3">Plazo</th><th className="px-4 py-3">Disposición</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Base</th><th className="px-4 py-3">Acciones</th></tr></thead><tbody className="divide-y">{policies.map(item => <tr key={item.$id}><td className="px-4 py-3 font-bold">{item.data_class}</td><td className="px-4 py-3">{item.retention_days} días</td><td className="px-4 py-3">{DISPOSITION_LABELS[item.disposition] || item.disposition}</td><td className="px-4 py-3">{item.status}</td><td className="max-w-md px-4 py-3 text-slate-600">{item.legal_basis}</td><td className="whitespace-nowrap px-4 py-3"><div className="flex gap-2"><Button variant="outline" className="h-9 gap-1 px-3 text-xs" disabled={runningPolicyId === item.$id} onClick={() => void previewRetention(item)}>{runningPolicyId === item.$id ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />} Vista previa</Button>{user?.role === 'admin' && item.status === 'active' && <Button variant="outline" className="h-9 gap-1 border-rose-200 px-3 text-xs text-rose-800" onClick={() => { setExecutionPolicy(item); setExecutionConfirmation('') }}><PlayCircle size={14} /> Ejecutar</Button>}</div></td></tr>)}{!policies.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Aún no hay políticas publicadas.</td></tr>}</tbody></table></div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b p-4 sm:p-5"><h2 className="font-black text-[#1B3A4B]">Ejecuciones de retención</h2><p className="mt-1 text-xs text-slate-500">Vistas previas y ejecuciones con corte, elegibles, afectados y resultado auditable.</p></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Modo</th><th className="px-4 py-3">Acción</th><th className="px-4 py-3">Elegibles</th><th className="px-4 py-3">Afectados</th><th className="px-4 py-3">Resultado</th></tr></thead><tbody className="divide-y">{retentionRuns.slice(0, 25).map(item => <tr key={item.$id}><td className="whitespace-nowrap px-4 py-3">{new Date(item.created_at).toLocaleString('es-CO')}</td><td className="px-4 py-3 font-bold">{item.execution_mode === 'preview' ? 'Vista previa' : 'Ejecución'}</td><td className="px-4 py-3">{DISPOSITION_LABELS[item.action] || item.action}</td><td className="px-4 py-3">{item.eligible_count}</td><td className="px-4 py-3">{item.affected_count}</td><td className="px-4 py-3">{item.status}</td></tr>)}{!retentionRuns.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Aún no hay ejecuciones registradas.</td></tr>}</tbody></table></div></section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b p-4 sm:p-5"><h2 className="font-black text-[#1B3A4B]">Accesos sensibles recientes</h2><p className="mt-1 text-xs text-slate-500">Finalidad declarada para informes y operaciones institucionales.</p></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Acción</th><th className="px-4 py-3">Recurso</th><th className="px-4 py-3">Finalidad</th></tr></thead><tbody className="divide-y">{accesses.slice(0, 25).map(item => <tr key={item.$id}><td className="whitespace-nowrap px-4 py-3">{new Date(item.created_at).toLocaleString('es-CO')}</td><td className="px-4 py-3 font-bold">{item.action}</td><td className="px-4 py-3">{item.resource_type}</td><td className="px-4 py-3 text-slate-600">{item.purpose}</td></tr>)}</tbody></table></div></section>
        </>}
      </div>
    </PageWrapper>
  )
}
