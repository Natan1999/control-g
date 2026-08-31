import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileCheck2,
  FileUp,
  Globe2,
  History,
  Loader2,
  MapPinned,
  ShieldCheck,
} from 'lucide-react'
import { PageWrapper } from '@/components/shared'
import { TopBar } from '@/components/layout/Sidebar'
import { LATAM_COUNTRIES, countryName } from '@/config/countries'
import {
  buildJurisdictionRecords,
  countJurisdictions,
  guessCatalogProperty,
  inspectCatalogFile,
  loadCountryCatalogs,
  runJurisdictionImport,
  type CatalogInspection,
  type CatalogMapping,
  type CountryProfileRecord,
  type JurisdictionImportResult,
  type JurisdictionImportRun,
} from '@/lib/jurisdiction-catalog'

const INITIAL_MAPPING: CatalogMapping = {
  codeProperty: '',
  nameProperty: '',
  parentCodeProperty: '',
  parentLevelProperty: '',
  levelProperty: '',
  localTypeProperty: '',
  defaultLevel: 1,
  parentLevel: 0,
  defaultLocalType: 'municipio',
}

function errorMessage(error: unknown) {
  if (!(error instanceof Error)) return 'No fue posible completar la operación.'
  return error.message.replace(/^.*?message[:=]\s*/i, '').slice(0, 500)
}

function PropertySelect({ label, value, names, optional, onChange }: {
  label: string
  value: string
  names: string[]
  optional?: boolean
  onChange: (value: string) => void
}) {
  return (
    <label className="text-xs font-black text-slate-700">
      {label}
      <select value={value} onChange={event => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium">
        <option value="">{optional ? 'No usar' : 'Selecciona una propiedad'}</option>
        {names.map(name => <option key={name} value={name}>{name}</option>)}
      </select>
    </label>
  )
}

export default function CountryCatalogPage() {
  const [profiles, setProfiles] = useState<CountryProfileRecord[]>([])
  const [runs, setRuns] = useState<JurisdictionImportRun[]>([])
  const [countryCode, setCountryCode] = useState('CO')
  const [catalogCount, setCatalogCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<'file' | 'preview' | 'publish' | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [inspection, setInspection] = useState<CatalogInspection | null>(null)
  const [mapping, setMapping] = useState<CatalogMapping>(INITIAL_MAPPING)
  const [sourceName, setSourceName] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceVersion, setSourceVersion] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10))
  const [assignActiveEntities, setAssignActiveEntities] = useState(false)
  const [preview, setPreview] = useState<JurisdictionImportResult | null>(null)
  const [previewSignature, setPreviewSignature] = useState('')
  const [confirmation, setConfirmation] = useState('')

  const activeProfile = useMemo(
    () => profiles.find(profile => profile.country_code === countryCode && profile.status === 'active'),
    [countryCode, profiles],
  )
  const countryRuns = useMemo(() => runs.filter(run => run.country_code === countryCode), [countryCode, runs])
  const expectedConfirmation = preview?.next_version ? `PUBLICAR ${countryCode} V${preview.next_version}` : ''

  const signature = useMemo(() => JSON.stringify({
    countryCode,
    file: inspection?.filename,
    featureCount: inspection?.featureCount,
    mapping,
    sourceName,
    sourceUrl,
    sourceVersion,
    effectiveFrom,
    assignActiveEntities,
  }), [assignActiveEntities, countryCode, effectiveFrom, inspection, mapping, sourceName, sourceUrl, sourceVersion])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await loadCountryCatalogs()
      setProfiles(result.profiles)
      setRuns(result.runs)
    } catch (loadError) {
      setError(errorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!activeProfile) return setCatalogCount(0)
    void countJurisdictions(activeProfile.id).then(setCatalogCount).catch(() => setCatalogCount(0))
    const defaultType = activeProfile.administrative_levels?.[1] || 'municipio'
    setMapping(current => ({ ...current, defaultLocalType: defaultType }))
  }, [activeProfile])

  function invalidatePreview() {
    setPreview(null)
    setPreviewSignature('')
    setConfirmation('')
    setSuccess('')
  }

  function updateMapping(updates: Partial<CatalogMapping>) {
    invalidatePreview()
    setMapping(current => ({ ...current, ...updates }))
  }

  async function selectFile(file?: File) {
    invalidatePreview()
    setInspection(null)
    if (!file) return
    setBusy('file')
    setError('')
    try {
      const result = await inspectCatalogFile(file)
      setInspection(result)
      setMapping(current => ({
        ...current,
        codeProperty: guessCatalogProperty(result.propertyNames, 'code'),
        nameProperty: guessCatalogProperty(result.propertyNames, 'name'),
        parentCodeProperty: guessCatalogProperty(result.propertyNames, 'parent'),
        levelProperty: guessCatalogProperty(result.propertyNames, 'level'),
        localTypeProperty: guessCatalogProperty(result.propertyNames, 'type'),
      }))
    } catch (fileError) {
      setError(errorMessage(fileError))
    } finally {
      setBusy(null)
    }
  }

  function normalizedRecords() {
    if (!inspection) throw new Error('Selecciona un archivo GeoJSON oficial.')
    if (!sourceName.trim() || !sourceVersion.trim()) throw new Error('Indica la entidad fuente y la versión oficial del catálogo.')
    return buildJurisdictionRecords(inspection, mapping)
  }

  async function runPreview() {
    setBusy('preview')
    setError('')
    setSuccess('')
    try {
      const records = normalizedRecords()
      const result = await runJurisdictionImport({
        countryCode,
        sourceName: sourceName.trim(),
        sourceUrl,
        sourceVersion: sourceVersion.trim(),
        effectiveFrom,
        records,
        publish: false,
        assignActiveEntities,
      })
      setPreview(result)
      setPreviewSignature(signature)
      setSuccess(`Prevalidación aprobada: ${result.feature_count.toLocaleString('es-CO')} territorios para la versión ${result.next_version}.`)
    } catch (previewError) {
      setError(errorMessage(previewError))
    } finally {
      setBusy(null)
    }
  }

  async function publish() {
    if (!preview || previewSignature !== signature) {
      setError('La configuración cambió después de la prevalidación. Ejecuta la vista previa nuevamente.')
      return
    }
    if (confirmation !== expectedConfirmation) {
      setError(`Escribe exactamente “${expectedConfirmation}” para publicar.`)
      return
    }
    setBusy('publish')
    setError('')
    setSuccess('')
    try {
      const result = await runJurisdictionImport({
        countryCode,
        sourceName: sourceName.trim(),
        sourceUrl,
        sourceVersion: sourceVersion.trim(),
        effectiveFrom,
        records: normalizedRecords(),
        publish: true,
        assignActiveEntities,
      })
      setSuccess(`Versión ${result.published_version} publicada con ${result.catalog_count?.toLocaleString('es-CO')} territorios. ${result.assigned_entities || 0} entidades activas actualizadas.`)
      setPreview(null)
      setPreviewSignature('')
      setConfirmation('')
      setInspection(null)
      await load()
    } catch (publishError) {
      setError(errorMessage(publishError))
    } finally {
      setBusy(null)
    }
  }

  return (
    <PageWrapper className="min-h-screen bg-slate-50">
      <TopBar title="Catálogos territoriales" subtitle="Versiona divisiones administrativas oficiales para cualquier operación LATAM" />
      <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Globe2 className="text-[#1B3A4B]" aria-hidden="true" />
            <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-400">País activo</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{countryName(countryCode)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Database className="text-[#1B3A4B]" aria-hidden="true" />
            <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-400">Versión vigente</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{activeProfile ? `v${activeProfile.version}` : 'Sin perfil'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <MapPinned className="text-[#1B3A4B]" aria-hidden="true" />
            <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-400">Territorios activos</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{catalogCount.toLocaleString('es-CO')}</p>
          </div>
        </section>

        {(error || success) && (
          <div role={error ? 'alert' : 'status'} aria-live="polite" className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${error ? 'border-red-200 bg-red-50 text-red-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
            {error ? <AlertTriangle size={20} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={20} className="mt-0.5 shrink-0" />}
            <p>{error || success}</p>
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-[#1B3A4B]"><FileUp size={20} /> Importar una versión oficial</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">El sistema valida el GeoJSON, conserva la versión anterior, fusiona el catálogo vigente y solo publica después de una confirmación explícita. La importación requiere conexión; el mapa resultante queda cacheado para trabajo offline.</p>
          </div>

          <div className="grid gap-5 p-5 lg:grid-cols-2">
            <div className="space-y-4">
              <label className="block text-xs font-black text-slate-700">País
                <select value={countryCode} onChange={event => { invalidatePreview(); setCountryCode(event.target.value) }} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold">
                  {LATAM_COUNTRIES.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-black text-slate-700">Entidad fuente oficial
                  <input value={sourceName} onChange={event => { invalidatePreview(); setSourceName(event.target.value) }} placeholder="Ej. Instituto geográfico nacional" className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm" />
                </label>
                <label className="text-xs font-black text-slate-700">Versión o fecha de corte
                  <input value={sourceVersion} onChange={event => { invalidatePreview(); setSourceVersion(event.target.value) }} placeholder="2026.1" className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm" />
                </label>
              </div>
              <label className="block text-xs font-black text-slate-700">URL pública de la fuente (HTTPS)
                <input type="url" value={sourceUrl} onChange={event => { invalidatePreview(); setSourceUrl(event.target.value) }} placeholder="https://datos.gob..." className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm" />
              </label>
              <label className="block text-xs font-black text-slate-700">Vigente desde
                <input type="date" value={effectiveFrom} onChange={event => { invalidatePreview(); setEffectiveFrom(event.target.value) }} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm" />
              </label>
              <label className="flex min-h-24 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center focus-within:border-[#1B3A4B]">
                <input type="file" accept=".geojson,.json,application/geo+json,application/json" onChange={event => void selectFile(event.target.files?.[0])} className="sr-only" />
                <span><FileUp className="mx-auto text-slate-500" /><span className="mt-2 block text-sm font-black text-slate-800">Seleccionar GeoJSON oficial</span><span className="mt-1 block text-xs text-slate-500">Polygon/MultiPolygon · máximo 10.000 registros y 12 MiB</span></span>
              </label>
              {busy === 'file' && <p className="flex items-center gap-2 text-sm text-slate-600"><Loader2 size={16} className="animate-spin" /> Analizando archivo…</p>}
              {inspection && <div className="rounded-xl bg-[#E9F1F3] p-4 text-sm text-[#1B3A4B]"><p className="font-black">{inspection.filename}</p><p className="mt-1">{inspection.featureCount.toLocaleString('es-CO')} geometrías · {inspection.geometryTypes.join(', ')}</p></div>}
            </div>

            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-black text-slate-900"><FileCheck2 size={19} /> Correspondencia de atributos</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <PropertySelect label="Código oficial *" value={mapping.codeProperty} names={inspection?.propertyNames || []} onChange={value => updateMapping({ codeProperty: value })} />
                <PropertySelect label="Nombre oficial *" value={mapping.nameProperty} names={inspection?.propertyNames || []} onChange={value => updateMapping({ nameProperty: value })} />
                <PropertySelect optional label="Código padre" value={mapping.parentCodeProperty || ''} names={inspection?.propertyNames || []} onChange={value => updateMapping({ parentCodeProperty: value })} />
                <PropertySelect optional label="Nivel por registro" value={mapping.levelProperty || ''} names={inspection?.propertyNames || []} onChange={value => updateMapping({ levelProperty: value })} />
                <PropertySelect optional label="Nivel padre por registro" value={mapping.parentLevelProperty || ''} names={inspection?.propertyNames || []} onChange={value => updateMapping({ parentLevelProperty: value })} />
                <PropertySelect optional label="Tipo por registro" value={mapping.localTypeProperty || ''} names={inspection?.propertyNames || []} onChange={value => updateMapping({ localTypeProperty: value })} />
                <label className="text-xs font-black text-slate-700">Nivel predeterminado
                  <input type="number" min={0} max={8} value={mapping.defaultLevel} onChange={event => updateMapping({ defaultLevel: Number(event.target.value) })} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" />
                </label>
                <label className="text-xs font-black text-slate-700">Nivel padre predeterminado
                  <input type="number" min={0} max={8} value={mapping.parentLevel} onChange={event => updateMapping({ parentLevel: Number(event.target.value) })} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" />
                </label>
                <label className="text-xs font-black text-slate-700 sm:col-span-2">Tipo territorial predeterminado
                  <input value={mapping.defaultLocalType} onChange={event => updateMapping({ defaultLocalType: event.target.value })} placeholder="municipio, distrito, comuna…" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" />
                </label>
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                <input type="checkbox" checked={assignActiveEntities} onChange={event => { invalidatePreview(); setAssignActiveEntities(event.target.checked) }} className="mt-1 h-5 w-5 shrink-0 accent-[#1B3A4B]" />
                <span><strong>Actualizar entidades activas de {countryName(countryCode)}.</strong> Si no se marca, las operaciones actuales conservan su versión territorial fijada y solo las nuevas usarán el catálogo publicado.</span>
              </label>
              <button type="button" disabled={!inspection || Boolean(busy)} onClick={() => void runPreview()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1B3A4B] px-5 text-sm font-black text-white disabled:opacity-50">
                {busy === 'preview' ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />} Prevalidar sin publicar
              </button>
            </div>
          </div>

          {preview && (
            <div className="border-t border-slate-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" /><div><h3 className="font-black text-emerald-950">Catálogo listo para publicación</h3><p className="mt-1 text-sm leading-6 text-emerald-900">Entrada SHA-256 <code className="break-all text-xs">{preview.input_sha256}</code>. Se creará la versión {preview.next_version}; la versión {preview.base_version} seguirá disponible como historial.</p></div></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <label className="text-xs font-black text-emerald-950">Escribe {expectedConfirmation}
                  <input value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" className="mt-1 min-h-12 w-full rounded-xl border border-emerald-300 bg-white px-3 text-sm font-bold" />
                </label>
                <button type="button" disabled={busy !== null || confirmation !== expectedConfirmation} onClick={() => void publish()} className="min-h-12 self-end rounded-xl bg-emerald-800 px-6 text-sm font-black text-white disabled:opacity-50">
                  {busy === 'publish' ? 'Publicando…' : 'Publicar versión'}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5"><h2 className="flex items-center gap-2 font-black text-[#1B3A4B]"><History size={19} /> Historial auditable · {countryName(countryCode)}</h2></div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Fuente</th><th className="px-4 py-3">Versión</th><th className="px-4 py-3">Registros</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Huella</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {countryRuns.map(run => <tr key={run.id}><td className="whitespace-nowrap px-4 py-3">{new Date(run.created_at).toLocaleString('es-CO')}</td><td className="px-4 py-3 font-bold">{run.source_name}</td><td className="px-4 py-3">{run.source_version}</td><td className="px-4 py-3">{run.feature_count.toLocaleString('es-CO')}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${run.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>{run.status === 'published' ? 'Publicado' : 'Previsualizado'}</span></td><td className="px-4 py-3 font-mono text-xs">{run.input_sha256.slice(0, 12)}…</td></tr>)}
                {!countryRuns.length && !loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No hay importaciones registradas para este país.</td></tr>}
                {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500"><Loader2 size={18} className="mx-auto animate-spin" /><span className="mt-2 block">Cargando historial…</span></td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm leading-6 text-sky-950">
          <h2 className="flex items-center gap-2 font-black"><ShieldCheck size={18} /> Gobierno del catálogo</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5"><li>Solo el superadministrador puede publicar.</li><li>La versión anterior se retira, pero nunca se elimina.</li><li>Los registros actuales quedan fijados a su perfil salvo actualización explícita.</li><li>El mapa consulta únicamente territorios de la versión asignada a cada entidad y los conserva en IndexedDB.</li></ul>
        </aside>
      </div>
    </PageWrapper>
  )
}
