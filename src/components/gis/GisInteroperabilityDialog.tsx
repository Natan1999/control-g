import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Database, Download, ExternalLink, FileArchive, FileJson, FileSpreadsheet, FileText, Loader2, UploadCloud, X } from 'lucide-react'
import { createMapLayer } from '@/lib/gis-service'
import {
  downloadGeoJson,
  downloadGeoPackage,
  downloadPointShapefile,
  downloadTerritorialPdf,
  downloadWgs84Csv,
  fetchArcGisLayer,
  publishRecordsToArcGis,
} from '@/lib/gis-interop'
import type { User } from '@/types'
import type { GeoRecord, MapLayer } from '@/types/gis'

interface GisInteroperabilityDialogProps {
  user: User
  records: GeoRecord[]
  layers: MapLayer[]
  onClose: () => void
  onLayerImported: () => Promise<void>
}

export function GisInteroperabilityDialog({ user, records, layers, onClose, onLayerImported }: GisInteroperabilityDialogProps) {
  const [serviceUrl, setServiceUrl] = useState('')
  const [token, setToken] = useState('')
  const [layerName, setLayerName] = useState('Capa ArcGIS')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState<'import' | 'publish' | null>(null)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingGeoPackage, setExportingGeoPackage] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const canManage = Boolean(user.entityId && (user.role === 'admin' || user.role === 'coordinator'))

  useEffect(() => {
    closeButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function clearMessages() {
    setError('')
    setSuccess('')
  }

  function runExport(action: () => void) {
    clearMessages()
    try {
      if (!records.length) throw new Error('No hay puntos visibles para exportar.')
      action()
      setSuccess(`Exportación preparada con ${records.length} puntos visibles.`)
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'No fue posible generar la exportación.')
    }
  }

  async function exportPdf() {
    clearMessages()
    setExportingPdf(true)
    try {
      await downloadTerritorialPdf(records, layers)
      setSuccess(`Informe territorial generado con ${records.length} puntos visibles.`)
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'No fue posible generar el informe territorial.')
    } finally {
      setExportingPdf(false)
    }
  }

  async function exportGeoPackage() {
    clearMessages()
    setExportingGeoPackage(true)
    try {
      await downloadGeoPackage(records)
      setSuccess(`GeoPackage OGC generado con ${records.length} puntos visibles.`)
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'No fue posible generar el GeoPackage.')
    } finally {
      setExportingGeoPackage(false)
    }
  }

  async function importLayer() {
    if (!canManage) return
    clearMessages()
    setBusy('import')
    try {
      const geojson = await fetchArcGisLayer(serviceUrl, token)
      await createMapLayer(user, {
        name: layerName,
        color: '#3D7B9E',
        geojson,
        source: 'ArcGIS REST Feature Service',
        sourceUrl: serviceUrl,
      })
      await onLayerImported()
      setSuccess('La capa de ArcGIS quedó guardada en Supabase y en el paquete offline del mapa.')
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'No fue posible importar la capa de ArcGIS.')
    } finally {
      setBusy(null)
    }
  }

  async function publishLayer() {
    if (!canManage || !confirmed) return
    clearMessages()
    setBusy('publish')
    try {
      const result = await publishRecordsToArcGis(serviceUrl, token, records)
      setSuccess(`${result.added} puntos enviados a ArcGIS${result.failed ? `; ${result.failed} no pudieron agregarse` : ''}.`)
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'No fue posible publicar los puntos en ArcGIS.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-6" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="gis-interoperability-title"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto bg-white shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-slate-200 bg-white px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#3D7B9E]">Interoperabilidad WGS84</p>
            <h2 id="gis-interoperability-title" className="mt-1 text-xl font-black text-slate-950">Exportar o conectar con ArcGIS</h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">Solo se comparten metadatos operativos y coordenadas; las respuestas personales no salen por este flujo.</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="flex h-12 w-12 shrink-0 items-center justify-center text-slate-500" aria-label="Cerrar interoperabilidad GIS"><X size={21} /></button>
        </header>

        <div className="space-y-7 p-5 sm:p-7">
          {error && <div role="alert" className="flex gap-3 border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800"><AlertCircle size={18} className="mt-0.5 shrink-0" />{error}</div>}
          {success && <div role="status" className="flex gap-3 border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"><CheckCircle2 size={18} className="mt-0.5 shrink-0" />{success}</div>}

          <section aria-labelledby="gis-export-title">
            <div className="flex items-end justify-between gap-4">
              <div><h3 id="gis-export-title" className="font-black text-slate-900">Descarga institucional</h3><p className="mt-1 text-sm text-slate-500">Se exportarán los {records.length} puntos que resultan de los filtros actuales.</p></div>
              <Download size={20} className="text-[#3D7B9E]" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <button type="button" onClick={() => runExport(() => downloadGeoJson(records))} className="flex min-h-20 items-center gap-3 border border-slate-200 px-4 text-left text-sm font-black text-slate-800 hover:border-[#3D7B9E]">
                <FileJson size={24} className="shrink-0 text-[#3D7B9E]" /><span>GeoJSON<br /><small className="font-medium text-slate-500">QGIS y ArcGIS</small></span>
              </button>
              <button type="button" onClick={() => runExport(() => downloadPointShapefile(records))} className="flex min-h-20 items-center gap-3 border border-slate-200 px-4 text-left text-sm font-black text-slate-800 hover:border-[#3D7B9E]">
                <FileArchive size={24} className="shrink-0 text-[#3D7B9E]" /><span>Shapefile ZIP<br /><small className="font-medium text-slate-500">SHP + SHX + DBF + PRJ</small></span>
              </button>
              <button type="button" onClick={() => runExport(() => downloadWgs84Csv(records))} className="flex min-h-20 items-center gap-3 border border-slate-200 px-4 text-left text-sm font-black text-slate-800 hover:border-[#3D7B9E]">
                <FileSpreadsheet size={24} className="shrink-0 text-[#3D7B9E]" /><span>CSV WGS84<br /><small className="font-medium text-slate-500">Excel y Power BI</small></span>
              </button>
              <button type="button" disabled={exportingPdf} onClick={() => void exportPdf()} className="flex min-h-20 items-center gap-3 border border-slate-200 px-4 text-left text-sm font-black text-slate-800 hover:border-[#3D7B9E] disabled:opacity-50">
                {exportingPdf ? <Loader2 size={24} className="shrink-0 animate-spin text-[#3D7B9E]" /> : <FileText size={24} className="shrink-0 text-[#3D7B9E]" />}<span>Informe PDF<br /><small className="font-medium text-slate-500">Mapa y resumen</small></span>
              </button>
              <button type="button" disabled={exportingGeoPackage} onClick={() => void exportGeoPackage()} className="flex min-h-20 items-center gap-3 border border-slate-200 px-4 text-left text-sm font-black text-slate-800 hover:border-[#3D7B9E] disabled:opacity-50">
                {exportingGeoPackage ? <Loader2 size={24} className="shrink-0 animate-spin text-[#3D7B9E]" /> : <Database size={24} className="shrink-0 text-[#3D7B9E]" />}<span>GeoPackage<br /><small className="font-medium text-slate-500">QGIS y ArcGIS Pro</small></span>
              </button>
            </div>
          </section>

          <section aria-labelledby="arcgis-connection-title" className="border-t border-slate-200 pt-7">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center bg-[#E9F1F3] text-[#1B3A4B]"><ExternalLink size={19} /></div><div><h3 id="arcgis-connection-title" className="font-black text-slate-900">ArcGIS REST Feature Service</h3><p className="text-sm text-slate-500">Importación y publicación directa sobre una capa de puntos.</p></div></div>

            {!canManage && <p className="mt-4 border-l-4 border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">La conexión de capas requiere rol de administración o coordinación y una entidad activa.</p>}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2 text-sm font-black text-slate-800">URL de la capa ArcGIS
                <input value={serviceUrl} onChange={event => setServiceUrl(event.target.value)} placeholder="https://services.arcgis.com/.../FeatureServer/0" inputMode="url" className="mt-2 min-h-12 w-full border border-slate-300 px-4 font-medium outline-none focus:border-[#1B3A4B]" />
              </label>
              <label className="text-sm font-black text-slate-800">Nombre en Control G
                <input value={layerName} onChange={event => setLayerName(event.target.value)} className="mt-2 min-h-12 w-full border border-slate-300 px-4 font-medium outline-none focus:border-[#1B3A4B]" />
              </label>
              <label className="text-sm font-black text-slate-800">Token temporal de ArcGIS
                <input type="password" value={token} onChange={event => setToken(event.target.value)} autoComplete="off" placeholder="Opcional al importar; obligatorio al publicar" className="mt-2 min-h-12 w-full border border-slate-300 px-4 font-medium outline-none focus:border-[#1B3A4B]" />
              </label>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">El token permanece solamente en esta ventana y no se guarda en Supabase, IndexedDB ni el navegador.</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button type="button" disabled={!canManage || !serviceUrl || !layerName.trim() || busy !== null} onClick={() => void importLayer()} className="flex min-h-12 items-center justify-center gap-2 bg-[#E9F1F3] px-4 text-sm font-black text-[#1B3A4B] disabled:opacity-50">
                {busy === 'import' ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} Importar a Control G
              </button>
              <button type="button" disabled={!canManage || !serviceUrl || !token.trim() || !confirmed || !records.length || busy !== null} onClick={() => void publishLayer()} className="flex min-h-12 items-center justify-center gap-2 bg-[#1B3A4B] px-4 text-sm font-black text-white disabled:opacity-50">
                {busy === 'publish' ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />} Publicar puntos visibles
              </button>
            </div>
            <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-slate-700">
              <input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#1B3A4B]" />
              Confirmo que la capa de destino pertenece a mi organización y está autorizada para recibir estos metadatos geográficos.
            </label>
          </section>
        </div>
      </section>
    </div>
  )
}
