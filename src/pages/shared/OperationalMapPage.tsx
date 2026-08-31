import { useCallback, useEffect, useMemo, useState } from 'react'
import { Geolocation } from '@capacitor/geolocation'
import {
  AlertCircle,
  CheckCircle2,
  Database,
  CircleDotDashed,
  FileUp,
  Flame,
  Layers3,
  Loader2,
  LocateFixed,
  MapPinned,
  Map as MapIcon,
  RefreshCw,
  Share2,
  ShieldCheck,
  WifiOff,
  X,
} from 'lucide-react'
import { InternalMap } from '@/components/gis/InternalMap'
import { GisInteroperabilityDialog } from '@/components/gis/GisInteroperabilityDialog'
import { BottomNav, MobileTopBar } from '@/components/layout/BottomNav'
import { TopBar } from '@/components/layout/Sidebar'
import { createMapLayer, loadMapDataset } from '@/lib/gis-service'
import { COLLECTION_IDS, DATABASE_ID, databases, Query } from '@/lib/backend'
import { parseGeoJson } from '@/lib/geo'
import { calculateCoverageSummary } from '@/lib/coverage'
import { useAuthStore } from '@/stores/authStore'
import type { User } from '@/types'
import type { GeoRecord, MapDataset } from '@/types/gis'

const EMPTY_DATASET: MapDataset = {
  records: [],
  layers: [],
  isOnline: false,
  loadedFromCache: false,
  lastUpdatedAt: null,
  spatialPolicy: { privacyMode: 'aggregate', minimumGroupSize: 5, coverageTarget: 10 },
}

const SOURCE_LABELS: Record<string, string> = {
  all: 'Todas las fuentes',
  response: 'Formularios',
  activity: 'Actividades',
  family: 'Hogares',
  local: 'Pendientes locales',
}

const THEMATIC_COLORS = ['#1B3A4B', '#2F855A', '#3D7B9E', '#B7791F', '#C05640', '#6B5B95', '#218380', '#8B6F47']

function thematicColor(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  return THEMATIC_COLORS[Math.abs(hash) % THEMATIC_COLORS.length]
}

function sourceLabel(source: GeoRecord['source']) {
  return SOURCE_LABELS[source] || source
}

function MapContent() {
  const { user } = useAuthStore()
  const [dataset, setDataset] = useState<MapDataset>(EMPTY_DATASET)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [mode, setMode] = useState<'points' | 'clusters' | 'heat' | 'choropleth'>('clusters')
  const [selected, setSelected] = useState<GeoRecord | null>(null)
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set())
  const [showLayerForm, setShowLayerForm] = useState(false)
  const [layerName, setLayerName] = useState('')
  const [layerColor, setLayerColor] = useState('#3D7B9E')
  const [layerFile, setLayerFile] = useState<File | null>(null)
  const [savingLayer, setSavingLayer] = useState(false)
  const [currentPosition, setCurrentPosition] = useState<GeoRecord | null>(null)
  const [dimensionKey, setDimensionKey] = useState('')
  const [showInteroperability, setShowInteroperability] = useState(false)
  const [entities, setEntities] = useState<any[]>([])
  const [selectedEntityId, setSelectedEntityId] = useState(() => user?.entityId || (typeof localStorage === 'undefined' ? '' : localStorage.getItem('cg_admin_map_entity') || ''))
  const scopedUser = useMemo<User | null>(() => {
    if (!user) return null
    if (user.role !== 'admin') return user
    return selectedEntityId ? { ...user, entityId: selectedEntityId } : null
  }, [selectedEntityId, user])

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    void databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ENTITIES, [
      Query.equal('status', 'active'), Query.orderAsc('name'), Query.limit(500),
    ]).then(result => {
      setEntities(result.documents)
      if (!result.documents.some((entity: any) => entity.$id === selectedEntityId)) {
        const next = result.documents[0]?.$id || ''
        setSelectedEntityId(next)
        if (next) localStorage.setItem('cg_admin_map_entity', next)
      }
    }).catch(() => setError('No fue posible cargar las entidades disponibles para el mapa.'))
  }, [selectedEntityId, user])

  const load = useCallback(async () => {
    if (!scopedUser) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await loadMapDataset(scopedUser)
      setDataset(result)
      setVisibleLayers(new Set(result.layers.filter(layer => layer.visibleDefault).map(layer => layer.id)))
    } catch (loadError) {
      console.error('Error loading internal map:', loadError)
      setError('No fue posible cargar el mapa ni existe una copia local disponible en este dispositivo.')
    } finally {
      setLoading(false)
    }
  }, [scopedUser])

  useEffect(() => { void load() }, [load])

  const statuses = useMemo(() => Array.from(new Set(dataset.records.map(record => record.status))).sort(), [dataset.records])
  const filteredRecords = useMemo(() => {
    const records = currentPosition ? [currentPosition, ...dataset.records] : dataset.records
    return records.filter(record => {
      if (sourceFilter !== 'all' && record.source !== sourceFilter) return false
      return statusFilter === 'all' || record.status === statusFilter
    })
  }, [currentPosition, dataset.records, sourceFilter, statusFilter])
  const filteredLayers = useMemo(
    () => dataset.layers.filter(layer => visibleLayers.has(layer.id)),
    [dataset.layers, visibleLayers],
  )
  const dimensionOptions = useMemo(() => {
    const options = new Map<string, { label: string; count: number }>()
    for (const record of dataset.records) {
      for (const [id, dimension] of Object.entries(record.dimensions || {})) {
        const current = options.get(id)
        options.set(id, { label: dimension.label, count: (current?.count || 0) + 1 })
      }
    }
    return Array.from(options, ([id, option]) => ({ id, ...option })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  }, [dataset.records])
  const thematicLegend = useMemo(() => {
    if (!dimensionKey) return []
    const values = new Map<string, number>()
    for (const record of filteredRecords) {
      const value = record.dimensions?.[dimensionKey]?.value
      if (value === null || value === undefined || value === '') continue
      const key = String(value)
      values.set(key, (values.get(key) || 0) + 1)
    }
    return Array.from(values, ([value, count]) => ({ value, count, color: thematicColor(value) }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
  }, [dimensionKey, filteredRecords])
  const recordColors = useMemo(() => {
    if (!dimensionKey) return {}
    return Object.fromEntries(filteredRecords.flatMap(record => {
      const value = record.dimensions?.[dimensionKey]?.value
      return value === null || value === undefined || value === '' ? [] : [[record.id, thematicColor(String(value))]]
    }))
  }, [dimensionKey, filteredRecords])
  const pendingCount = dataset.records.filter(record => record.isPending).length
  const institutionalLayerCount = dataset.layers.filter(layer => !layer.id.startsWith('base:')).length
  const coverage = useMemo(() => calculateCoverageSummary(
    filteredRecords,
    filteredLayers,
    dataset.spatialPolicy.minimumGroupSize,
    dataset.spatialPolicy.coverageTarget,
  ), [dataset.spatialPolicy.coverageTarget, dataset.spatialPolicy.minimumGroupSize, filteredLayers, filteredRecords])
  const canCreateLayer = Boolean(scopedUser?.entityId && (scopedUser.role === 'admin' || scopedUser.role === 'coordinator'))

  function toggleLayer(layerId: string) {
    setVisibleLayers(current => {
      const next = new Set(current)
      if (next.has(layerId)) next.delete(layerId)
      else next.add(layerId)
      return next
    })
  }

  async function locateDevice() {
    if (!scopedUser) return
    setError('')
    try {
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 12_000 })
      const record: GeoRecord = {
        id: 'device-current-position',
        entityId: scopedUser.entityId || 'device',
        professionalId: scopedUser.id,
        source: 'local',
        status: 'ubicación actual',
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        capturedAt: new Date(position.timestamp).toISOString(),
        label: 'Mi ubicación actual',
        isPending: false,
      }
      setCurrentPosition(record)
      setSelected(record)
      setMode('points')
      setSourceFilter('all')
    } catch (locationError) {
      console.error('Error locating device:', locationError)
      setError('No se pudo obtener la ubicación. Verifica el permiso GPS del dispositivo.')
    }
  }

  async function saveLayer(event: React.FormEvent) {
    event.preventDefault()
    if (!scopedUser || !layerFile || !layerName.trim()) return
    if (layerFile.size > 6 * 1024 * 1024) {
      setError('La capa supera 6 MB. Simplifica el GeoJSON antes de cargarlo.')
      return
    }
    setSavingLayer(true)
    setError('')
    try {
      const geojson = parseGeoJson(await layerFile.text())
      await createMapLayer(scopedUser, { name: layerName, color: layerColor, geojson })
      setShowLayerForm(false)
      setLayerName('')
      setLayerFile(null)
      await load()
    } catch (saveError) {
      console.error('Error creating map layer:', saveError)
      setError(saveError instanceof Error ? saveError.message : 'No fue posible guardar la capa territorial.')
    } finally {
      setSavingLayer(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-4 sm:p-6 lg:p-8">
      <h1 className="sr-only">Mapa territorial operativo de Control G</h1>
      {user?.role === 'admin' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex sm:items-end sm:justify-between sm:gap-5">
          <div><h2 className="font-black text-[#1B3A4B]">Alcance multiempresa</h2><p className="mt-1 text-sm leading-6 text-slate-500">Selecciona una entidad para evitar mezclar capturas, políticas y catálogos territoriales entre clientes.</p></div>
          <label className="mt-3 block min-w-0 text-xs font-black uppercase tracking-wide text-slate-500 sm:mt-0 sm:w-96">Entidad visible
            <select value={selectedEntityId} onChange={event => {
              const next = event.target.value
              setSelectedEntityId(next)
              localStorage.setItem('cg_admin_map_entity', next)
              setSelected(null)
              setCurrentPosition(null)
            }} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-900">
              {!entities.length && <option value="">No hay entidades activas</option>}
              {entities.map((entity: any) => <option key={entity.$id} value={entity.$id}>{entity.name} · {entity.country_code || 'CO'}</option>)}
            </select>
          </label>
        </section>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Puntos con GPS', value: dataset.records.length, icon: MapPinned, color: '#1B3A4B' },
          { label: 'Pendientes offline', value: pendingCount, icon: WifiOff, color: '#B7791F' },
          { label: 'Capas territoriales', value: institutionalLayerCount, icon: Layers3, color: '#3D7B9E' },
          { label: 'Zonas con meta', value: coverage.totalZones ? `${coverage.zonesMeetingTarget}/${coverage.totalZones}` : '—', icon: ShieldCheck, color: '#2F855A' },
        ].map(item => (
          <div key={item.label} className="border-l-4 bg-white p-4 shadow-sm" style={{ borderColor: item.color }}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
              <item.icon size={18} style={{ color: item.color }} />
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900">{loading ? '—' : item.value}</p>
          </div>
        ))}
      </div>

      <div className={`flex items-start gap-3 border px-4 py-3 text-sm ${dataset.loadedFromCache ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
        {dataset.loadedFromCache ? <WifiOff className="mt-0.5 shrink-0" size={18} /> : <CheckCircle2 className="mt-0.5 shrink-0" size={18} />}
        <div>
          <p className="font-black">{dataset.loadedFromCache ? 'Mapa disponible desde la memoria del dispositivo' : 'Mapa actualizado desde Supabase'}</p>
          <p className="mt-0.5 text-xs leading-5 opacity-80">
            Los puntos y límites vectoriales permanecen visibles sin internet. No se muestran respuestas personales dentro del mapa.
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          <AlertCircle className="mt-0.5 shrink-0" size={18} /> {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[270px_minmax(0,1fr)_300px]">
        <aside className="space-y-5 bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Visualización</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" aria-pressed={mode === 'points'} onClick={() => setMode('points')} className={`min-h-12 border px-3 text-xs font-black ${mode === 'points' ? 'border-[#1B3A4B] bg-[#1B3A4B] text-white' : 'border-slate-200 text-slate-700'}`}>
                Puntos
              </button>
              <button type="button" aria-pressed={mode === 'clusters'} onClick={() => setMode('clusters')} className={`flex min-h-12 items-center justify-center gap-1 border px-2 text-xs font-black ${mode === 'clusters' ? 'border-[#1B3A4B] bg-[#1B3A4B] text-white' : 'border-slate-200 text-slate-700'}`}>
                <CircleDotDashed size={15} /> Grupos
              </button>
              <button type="button" aria-pressed={mode === 'heat'} onClick={() => setMode('heat')} className={`flex min-h-12 items-center justify-center gap-2 border px-3 text-xs font-black ${mode === 'heat' ? 'border-[#1B3A4B] bg-[#1B3A4B] text-white' : 'border-slate-200 text-slate-700'}`}>
                <Flame size={15} /> Calor
              </button>
              <button type="button" aria-pressed={mode === 'choropleth'} onClick={() => setMode('choropleth')} className={`flex min-h-12 items-center justify-center gap-2 border px-3 text-xs font-black ${mode === 'choropleth' ? 'border-[#1B3A4B] bg-[#1B3A4B] text-white' : 'border-slate-200 text-slate-700'}`}>
                <MapIcon size={15} /> Cobertura
              </button>
            </div>
            {mode === 'choropleth' && <div className="mt-2 space-y-1 text-xs leading-5 text-slate-500"><p>La intensidad se compara contra la meta de {dataset.spatialPolicy.coverageTarget} capturas por zona.</p><p>{coverage.protectedZones} zonas con grupos menores de {dataset.spatialPolicy.minimumGroupSize} están suprimidas; {coverage.uncoveredZones} no tienen registros.</p></div>}
          </div>

          <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Fuente
            <select value={sourceFilter} onChange={event => setSourceFilter(event.target.value)} className="mt-2 min-h-12 w-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800">
              {Object.entries(SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Colorear por variable
            <select value={dimensionKey} onChange={event => { setDimensionKey(event.target.value); setMode('points') }} className="mt-2 min-h-12 w-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800">
              <option value="">Sin clasificación temática</option>
              {dimensionOptions.map(option => <option key={option.id} value={option.id}>{option.label} ({option.count})</option>)}
            </select>
          </label>

          {dimensionKey && (
            <div aria-label="Leyenda del mapa temático">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Leyenda temática</p>
              <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1">
                {thematicLegend.length ? thematicLegend.map(item => (
                  <div key={item.value} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="min-w-0 flex-1 truncate" title={item.value}>{item.value}</span>
                    <span className="text-slate-400">{item.count}</span>
                  </div>
                )) : <p className="text-xs leading-5 text-slate-500">Los registros visibles no tienen valor para esta variable.</p>}
              </div>
            </div>
          )}

          <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Estado
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="mt-2 min-h-12 w-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800">
              <option value="all">Todos los estados</option>
              {statuses.map(status => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>

          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Capas</p>
              {canCreateLayer && (
                <button type="button" onClick={() => setShowLayerForm(true)} className="flex min-h-11 items-center gap-1 text-xs font-black text-[#1B3A4B]">
                  <FileUp size={15} /> Cargar
                </button>
              )}
            </div>
            <div className="mt-2 space-y-1">
              {dataset.layers.length === 0 ? (
                <p className="py-3 text-xs leading-5 text-slate-500">No hay límites GeoJSON cargados para esta entidad.</p>
              ) : dataset.layers.map(layer => (
                <label key={layer.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={visibleLayers.has(layer.id)} onChange={() => toggleLayer(layer.id)} className="h-5 w-5 accent-[#1B3A4B]" />
                  <span className="h-3 w-3 shrink-0" style={{ background: layer.color }} />
                  <span className="truncate">{layer.name}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="button" onClick={locateDevice} className="flex min-h-12 w-full items-center justify-center gap-2 bg-[#E9F1F3] px-4 text-sm font-black text-[#1B3A4B]">
            <LocateFixed size={18} /> Mi ubicación
          </button>
          <button type="button" onClick={() => setShowInteroperability(true)} className="flex min-h-12 w-full items-center justify-center gap-2 border border-[#1B3A4B] px-4 text-sm font-black text-[#1B3A4B]">
            <Share2 size={18} /> Exportar / ArcGIS
          </button>
        </aside>

        <section className="min-w-0 overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 px-4">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-black text-slate-900">Mapa operativo interno</h2>
              <p className="text-xs text-slate-500">{filteredRecords.length} puntos visibles</p>
            </div>
            <button type="button" onClick={() => void load()} disabled={loading} className="flex h-12 w-12 items-center justify-center text-[#1B3A4B] disabled:opacity-50" aria-label="Actualizar mapa">
              {loading ? <Loader2 size={19} className="animate-spin" /> : <RefreshCw size={19} />}
            </button>
          </div>
          <InternalMap records={filteredRecords} layers={filteredLayers} mode={mode} selectedId={selected?.id || null} onSelect={setSelected} recordColors={recordColors} minimumGroupSize={dataset.spatialPolicy.minimumGroupSize} coverageTarget={dataset.spatialPolicy.coverageTarget} />
        </section>

        <aside className="bg-[#153646] p-5 text-white shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/60">Detalle territorial</p>
            {selected && <button type="button" onClick={() => setSelected(null)} className="flex h-11 w-11 items-center justify-center text-white/70" aria-label="Cerrar detalle"><X size={18} /></button>}
          </div>
          {selected ? (
            <div className="mt-6 space-y-5">
              <div>
                <p className="text-xl font-black leading-tight">{selected.label}</p>
                <p className="mt-2 inline-flex bg-white/10 px-2.5 py-1 text-xs font-bold text-white/80">{sourceLabel(selected.source)}</p>
              </div>
              <dl className="space-y-4 text-sm">
                <div><dt className="text-xs font-bold uppercase text-white/50">Estado</dt><dd className="mt-1 font-semibold">{selected.status}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-white/50">Fecha de captura</dt><dd className="mt-1 font-semibold">{new Date(selected.capturedAt).toLocaleString('es-CO')}</dd></div>
                <div><dt className="text-xs font-bold uppercase text-white/50">Coordenadas</dt><dd className="mt-1 font-mono text-xs">{selected.latitude.toFixed(6)}, {selected.longitude.toFixed(6)}</dd></div>
                {selected.formId && <div><dt className="text-xs font-bold uppercase text-white/50">Formulario</dt><dd className="mt-1 break-all font-semibold">{selected.formId}</dd></div>}
                {dimensionKey && selected.dimensions?.[dimensionKey] && <div><dt className="text-xs font-bold uppercase text-white/50">{selected.dimensions[dimensionKey].label}</dt><dd className="mt-1 font-semibold">{String(selected.dimensions[dimensionKey].value)}</dd></div>}
              </dl>
              {selected.isPending && (
                <div className="border-l-4 border-amber-400 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
                  Este punto está protegido en el dispositivo y subirá automáticamente al recuperar internet.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-10 text-center">
              <Database size={34} className="mx-auto text-white/30" />
              <p className="mt-4 font-black">Selecciona un punto</p>
              <p className="mt-2 text-sm leading-6 text-white/60">Consulta el origen, estado y momento de captura sin exponer las respuestas del formulario.</p>
            </div>
          )}
        </aside>
      </div>

      {showLayerForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-6" onMouseDown={event => {
          if (event.target === event.currentTarget) setShowLayerForm(false)
        }}>
          <form onSubmit={saveLayer} role="dialog" aria-modal="true" aria-labelledby="new-layer-title" className="w-full max-w-lg bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="new-layer-title" className="text-xl font-black text-slate-900">Nueva capa territorial</h2><p className="mt-1 text-sm text-slate-500">Carga límites, rutas o puntos en formato GeoJSON.</p></div>
              <button type="button" onClick={() => setShowLayerForm(false)} className="flex h-12 w-12 items-center justify-center text-slate-500" aria-label="Cerrar"><X size={20} /></button>
            </div>
            <div className="mt-6 space-y-5">
              <label className="block text-sm font-black text-slate-800">Nombre de la capa<input required value={layerName} onChange={event => setLayerName(event.target.value)} className="mt-2 min-h-12 w-full border border-slate-300 px-4 font-medium outline-none focus:border-[#1B3A4B]" placeholder="Límites de municipios" /></label>
              <label className="block text-sm font-black text-slate-800">Archivo GeoJSON<input required type="file" accept=".geojson,.json,application/geo+json,application/json" onChange={event => setLayerFile(event.target.files?.[0] || null)} className="mt-2 block min-h-12 w-full border border-dashed border-slate-300 p-3 text-sm font-medium" /></label>
              <label className="flex items-center justify-between gap-4 text-sm font-black text-slate-800">Color de la capa<input type="color" value={layerColor} onChange={event => setLayerColor(event.target.value)} className="h-12 w-20 cursor-pointer border border-slate-300 bg-white p-1" /></label>
            </div>
            <button type="submit" disabled={savingLayer || !layerFile || !layerName.trim()} className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 bg-[#1B3A4B] px-5 text-sm font-black text-white disabled:opacity-50">
              {savingLayer ? <Loader2 size={18} className="animate-spin" /> : <FileUp size={18} />} Guardar capa en Supabase
            </button>
          </form>
        </div>
      )}

      {showInteroperability && scopedUser && (
        <GisInteroperabilityDialog
          user={scopedUser}
          records={filteredRecords.filter(record => record.id !== 'device-current-position')}
          layers={filteredLayers}
          onClose={() => setShowInteroperability(false)}
          onLayerImported={load}
        />
      )}
    </div>
  )
}

export default function OperationalMapPage() {
  const { user } = useAuthStore()
  const isField = user?.role === 'professional'

  if (isField) {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        <MobileTopBar title="Mapa de campo" />
        <MapContent />
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar title="Mapa territorial" subtitle="Capturas GPS, capas institucionales y operación offline" />
      <MapContent />
    </div>
  )
}
