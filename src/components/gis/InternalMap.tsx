import { useEffect, useMemo, useRef, useState } from 'react'
import { Crosshair, LocateFixed, Minus, Plus, RotateCcw } from 'lucide-react'
import { geoJsonCoordinates, geoJsonFeatures, pointInGeoJsonGeometry } from '@/lib/geo'
import { isCoverageBoundaryLayer } from '@/lib/coverage'
import { fitMap } from '@/lib/map-viewport'
import type { GeoJsonGeometry, GeoJsonPosition, GeoRecord, MapLayer, MapRouteOverlay } from '@/types/gis'

interface InternalMapProps {
  records: GeoRecord[]
  layers: MapLayer[]
  mode: 'points' | 'clusters' | 'heat' | 'choropleth'
  selectedId: string | null
  onSelect: (record: GeoRecord | null) => void
  recordColors?: Record<string, string>
  minimumGroupSize?: number
  coverageTarget?: number
  route?: MapRouteOverlay | null
  expanded?: boolean
}

interface Projection {
  point: (coordinate: GeoJsonPosition) => [number, number]
}

function linePath(coordinates: GeoJsonPosition[], projection: Projection, close = false) {
  const path = coordinates.map((coordinate, index) => {
    const [x, y] = projection.point(coordinate)
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ')
  return close ? `${path} Z` : path
}

function geometryPaths(geometry: GeoJsonGeometry, projection: Projection): string[] {
  const coordinates = geometry.coordinates as any
  if (geometry.type === 'LineString') return [linePath(coordinates, projection)]
  if (geometry.type === 'MultiLineString') return coordinates.map((line: GeoJsonPosition[]) => linePath(line, projection)) as string[]
  if (geometry.type === 'Polygon') return [coordinates.map((ring: GeoJsonPosition[]) => linePath(ring, projection, true)).join(' ')]
  if (geometry.type === 'MultiPolygon') {
    return coordinates.map((polygon: GeoJsonPosition[][]) => polygon.map(ring => linePath(ring, projection, true)).join(' ')) as string[]
  }
  return []
}

function geometryPoints(geometry: GeoJsonGeometry): GeoJsonPosition[] {
  if (geometry.type === 'Point') return [geometry.coordinates as GeoJsonPosition]
  if (geometry.type === 'MultiPoint') return geometry.coordinates as GeoJsonPosition[]
  return []
}

export function InternalMap({ records, layers, mode, selectedId, onSelect, recordColors = {}, minimumGroupSize = 5, coverageTarget = 10, route = null, expanded = false }: InternalMapProps) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [size, setSize] = useState({ width: 1000, height: 640 })
  const [extent, setExtent] = useState<'operation' | 'all'>('operation')
  const MAP_WIDTH = size.width, MAP_HEIGHT = size.height
  useEffect(() => {
    if (!svgRef.current) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width && entry.contentRect.height) setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(svgRef.current)
    return () => observer.disconnect()
  }, [records.length, layers.length])

  const projection = useMemo(() => {
    const coordinates: GeoJsonPosition[] = records.map(record => [record.longitude, record.latitude])
    if (extent === 'all' || !coordinates.length) {
      const operational = layers.filter(layer => !layer.id.startsWith('base:'))
      for (const layer of extent === 'all' || !operational.length ? layers : operational) coordinates.push(...geoJsonCoordinates(layer.geojson))
    }
    if (route) coordinates.push(...route.coordinates)
    return fitMap(coordinates, MAP_WIDTH, MAP_HEIGHT)
  }, [layers, records, route, extent, MAP_WIDTH, MAP_HEIGHT])

  const clusters = useMemo(() => {
    if (!projection) return []
    const gridSize = 62 / zoom
    const grouped = new Map<string, { records: GeoRecord[]; x: number; y: number }>()
    for (const record of records) {
      const [x, y] = projection.point([record.longitude, record.latitude])
      const key = `${Math.floor(x / gridSize)}:${Math.floor(y / gridSize)}`
      const cluster = grouped.get(key) || { records: [], x: 0, y: 0 }
      cluster.records.push(record)
      cluster.x += x
      cluster.y += y
      grouped.set(key, cluster)
    }
    return Array.from(grouped.values(), cluster => ({
      records: cluster.records,
      x: cluster.x / cluster.records.length,
      y: cluster.y / cluster.records.length,
    }))
  }, [projection, records, zoom])

  const choropleth = useMemo(() => {
    if (mode !== 'choropleth') return new Map<string, { counts: number[]; maximum: number }>()
    return new Map(layers.map(layer => {
      const counts = isCoverageBoundaryLayer(layer) ? geoJsonFeatures(layer.geojson).map(feature => {
        if (!feature.geometry || !feature.geometry.type.includes('Polygon')) return 0
        return records.filter(record => pointInGeoJsonGeometry([record.longitude, record.latitude], feature.geometry!)).length
      }) : []
      return [layer.id, { counts, maximum: Math.max(0, ...counts) }]
    }))
  }, [layers, mode, records])

  // Layer visibility and map modes preserve the current zoom and position.

  function resetView() {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  function startDrag(event: React.PointerEvent<SVGSVGElement>) {
    if ((event.target as Element).closest('[data-map-point]')) return
    drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveDrag(event: React.PointerEvent<SVGSVGElement>) {
    if (!drag.current || !svgRef.current) return
    const width = svgRef.current.getBoundingClientRect().width || MAP_WIDTH
    const ratio = MAP_WIDTH / width
    setPan({
      x: drag.current.panX + (event.clientX - drag.current.x) * ratio,
      y: drag.current.panY + (event.clientY - drag.current.y) * ratio,
    })
  }

  function stopDrag(event: React.PointerEvent<SVGSVGElement>) {
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  if (!projection) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center bg-[#EAF1F2] px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#1B3A4B] shadow-sm">
          <LocateFixed size={28} />
        </div>
        <h3 className="mt-5 text-lg font-black text-slate-900">Aún no hay coordenadas para dibujar</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
          Las capturas con GPS y las capas GeoJSON aparecerán aquí, incluso cuando el dispositivo quede sin conexión.
        </p>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden bg-[#EAF1F2] ${expanded ? 'h-full min-h-[360px] flex-1' : ''}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        role="img"
        aria-label={`Mapa interno con ${records.length} registros georreferenciados`}
        className={`${expanded ? 'h-full min-h-[360px]' : 'h-[60vh] min-h-[460px] sm:h-[650px]'} w-full cursor-grab select-none touch-none active:cursor-grabbing`}
        tabIndex={0}
        onKeyDown={event => {
          if (event.key === '+' || event.key === '=') setZoom(value => Math.min(32, value * 1.4))
          if (event.key === '-') setZoom(value => Math.max(0.5, value / 1.4))
          if (event.key.startsWith('Arrow')) {
            event.preventDefault()
            setPan(value => ({ x: value.x + (event.key === 'ArrowLeft' ? 45 : event.key === 'ArrowRight' ? -45 : 0), y: value.y + (event.key === 'ArrowUp' ? 45 : event.key === 'ArrowDown' ? -45 : 0) }))
          }
        }}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
      >
        <defs>
          <pattern id="control-g-map-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#BFD0D3" strokeWidth="1" opacity="0.55" />
          </pattern>
          <radialGradient id="control-g-heat" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#f97316" stopOpacity="0.7" />
            <stop offset="65%" stopColor="#facc15" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#F2A83B" stopOpacity="0" />
          </radialGradient>
          <clipPath id="control-g-map-clip"><rect width={MAP_WIDTH} height={MAP_HEIGHT} rx="18" /></clipPath>
        </defs>
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#EAF1F2" />
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#control-g-map-grid)" />
        <g clipPath="url(#control-g-map-clip)"><g
          transform={`translate(${pan.x} ${pan.y}) translate(${MAP_WIDTH / 2} ${MAP_HEIGHT / 2}) scale(${zoom}) translate(${-MAP_WIDTH / 2} ${-MAP_HEIGHT / 2})`}
        >
          {layers.map(layer => (
            <g key={layer.id} aria-label={`Capa ${layer.name}`}>
              {geoJsonFeatures(layer.geojson).flatMap((feature, geometryIndex) => {
                if (!feature.geometry) return []
                const geometry = feature.geometry
                const coverageLayer = isCoverageBoundaryLayer(layer)
                const polygonCount = choropleth.get(layer.id)?.counts[geometryIndex] || 0
                const featureName = String(feature.properties?.MPIO_CNMBRE || feature.properties?.name || feature.properties?.NAME || `Zona ${geometryIndex + 1}`)
                const protectedGroup = polygonCount > 0 && polygonCount < minimumGroupSize
                const polygonOpacity = mode === 'choropleth' && coverageLayer
                  ? protectedGroup ? 0.12 : polygonCount > 0 ? 0.2 + (Math.min(polygonCount, coverageTarget) / Math.max(1, coverageTarget)) * 0.65 : 0.05
                  : layer.opacity
                return [
                ...geometryPaths(geometry, projection).map((path, pathIndex) => (
                  <path
                    key={`${layer.id}:path:${geometryIndex}:${pathIndex}`}
                    d={path}
                    fill={geometry.type.includes('Polygon') ? layer.color : 'none'}
                    fillOpacity={geometry.type.includes('Polygon') ? polygonOpacity : 0}
                    stroke={layer.color}
                    strokeOpacity={Math.min(1, layer.opacity * 2)}
                    strokeWidth={Math.max(1.5, 2.4 / zoom)}
                    vectorEffect="non-scaling-stroke"
                    fillRule="evenodd"
                  ><title>{mode === 'choropleth' && coverageLayer ? protectedGroup ? `${featureName}: grupo protegido (menos de ${minimumGroupSize})` : `${featureName}: ${polygonCount} capturas${polygonCount >= coverageTarget ? ' · meta cumplida' : ''}` : featureName}</title></path>
                )),
                ...(geometry.type === 'Polygon' && !layer.id.startsWith('base:') && geoJsonFeatures(layer.geojson).length <= 40 ? (() => {
                  const ring = (geometry.coordinates as GeoJsonPosition[][])[0]
                  if (!ring?.length) return []
                  const coords = ring.slice(0, -1)
                  const center: GeoJsonPosition = [coords.reduce((sum, p) => sum + p[0], 0) / coords.length, coords.reduce((sum, p) => sum + p[1], 0) / coords.length]
                  const [x, y] = projection.point(center)
                  return [<text key={`${layer.id}:label:${geometryIndex}`} x={x} y={y} dy={-12 / zoom} textAnchor="middle" fontSize={12 / zoom} fontWeight="700" fill="#234453" stroke="white" strokeWidth={3 / zoom} paintOrder="stroke" pointerEvents="none">{featureName}</text>]
                })() : []),
                ...geometryPoints(geometry).map((coordinate, pointIndex) => {
                  const [x, y] = projection.point(coordinate)
                  return <circle key={`${layer.id}:point:${geometryIndex}:${pointIndex}`} cx={x} cy={y} r={6 / zoom} fill={layer.color} opacity={layer.opacity}><title>{String(feature.properties?.name || layer.name)}</title></circle>
                }),
                ]
              })}
            </g>
          ))}

          {mode === 'heat' && clusters.filter(cluster => cluster.records.length >= minimumGroupSize).map((cluster, index) => {
            return <circle key={`heat:${index}`} cx={cluster.x} cy={cluster.y} r={(35 + Math.min(50, cluster.records.length * 2)) / zoom} opacity={Math.min(1, 0.35 + cluster.records.length / 30)} fill="url(#control-g-heat)" />
          })}

          {route && route.coordinates.length >= 2 && (
            <g aria-label={`Ruta de campo con ${route.stops.length} paradas`}>
              <path
                d={linePath(route.coordinates, projection)}
                fill="none"
                stroke="#E6533C"
                strokeWidth={5 / zoom}
                strokeDasharray={`${12 / zoom} ${7 / zoom}`}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.9}
              />
              {route.stops.map(stop => {
                const [x, y] = projection.point(stop.coordinate)
                return (
                  <g key={`route-stop:${stop.id}`} aria-label={`Parada ${stop.order}`}>
                    <circle cx={x} cy={y} r={12 / zoom} fill="#E6533C" stroke="white" strokeWidth={3 / zoom} />
                    <text x={x} y={y} dy="0.34em" textAnchor="middle" fill="white" fontSize={Math.max(8, 10 / zoom)} fontWeight="900">{stop.order}</text>
                  </g>
                )
              })}
            </g>
          )}

          {mode === 'points' && records.map(record => {
            const [x, y] = projection.point([record.longitude, record.latitude])
            const isSelected = record.id === selectedId
            return (
              <g
                key={record.id}
                data-map-point
                role="button"
                tabIndex={0}
                aria-label={`${record.label}, ${record.status}`}
                onClick={() => onSelect(record)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(record)
                  }
                }}
                className="cursor-pointer outline-none"
              >
                {isSelected && <circle cx={x} cy={y} r={17 / zoom} fill="#1B3A4B" opacity="0.16" />}
                <circle
                  cx={x}
                  cy={y}
                  r={(isSelected ? 9 : 7) / zoom}
                  fill={recordColors[record.id] || (record.isPending ? '#E39A23' : record.source === 'activity' ? '#2F855A' : '#1B3A4B')}
                  stroke="white"
                  strokeWidth={3 / zoom}
                />
              </g>
            )
          })}

          {mode === 'clusters' && clusters.map((cluster, index) => {
            const singleRecord = cluster.records.length === 1 ? cluster.records[0] : null
            const selected = singleRecord?.id === selectedId
            const activate = () => {
              if (singleRecord || zoom >= 32) onSelect(singleRecord || cluster.records[0])
              else {
                onSelect(null)
                const nextZoom = Math.min(32, zoom * 1.8)
                setPan({ x: (MAP_WIDTH / 2 - cluster.x) * nextZoom, y: (MAP_HEIGHT / 2 - cluster.y) * nextZoom })
                setZoom(nextZoom)
              }
            }
            return (
              <g key={`cluster:${index}:${cluster.records.map(record => record.id).join(':')}`} data-map-point role="button" tabIndex={0} aria-label={singleRecord ? singleRecord.label : `Grupo de ${cluster.records.length} puntos; activar para acercar`} onClick={activate} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate() } }} className="cursor-pointer outline-none">
                {selected && <circle cx={cluster.x} cy={cluster.y} r={18 / zoom} fill="#1B3A4B" opacity="0.16" />}
                <circle cx={cluster.x} cy={cluster.y} r={(singleRecord ? 8 : Math.min(18, 10 + Math.log2(cluster.records.length) * 2)) / zoom} fill={singleRecord ? (recordColors[singleRecord.id] || '#1B3A4B') : '#3D7B9E'} stroke="white" strokeWidth={3 / zoom} />
                {!singleRecord && <text x={cluster.x} y={cluster.y} dy="0.35em" textAnchor="middle" fill="white" fontSize={Math.max(9, 12 / zoom)} fontWeight="900">{cluster.records.length}</text>}
              </g>
            )
          })}
        </g></g>
      </svg>

      <div className="absolute right-3 top-3 flex flex-col gap-2" aria-label="Controles del mapa">
        <button type="button" onClick={() => setZoom(value => Math.min(32, value * 1.4))} className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-md" aria-label="Acercar mapa">
          <Plus size={20} />
        </button>
        <button type="button" onClick={() => setZoom(value => Math.max(0.5, value / 1.4))} className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-md" aria-label="Alejar mapa">
          <Minus size={20} />
        </button>
        <button type="button" onClick={resetView} className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-md" aria-label="Restablecer mapa">
          <RotateCcw size={18} />
        </button>
      </div>

      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-[11px] font-bold text-slate-600 shadow-md">
        <Crosshair size={14} className="text-[#1B3A4B]" /> WGS84 · Sin conexión
        <span className="border-t-2 border-slate-600 pt-1" style={{ width: 70 }}>{Math.round(projection.metersPerPixel * 70 / zoom)} m aprox.</span>
      </div>
      <button type="button" className="absolute left-3 top-3 min-h-11 rounded-xl border border-slate-200 bg-white/95 px-3 text-xs font-bold shadow" onClick={() => { setExtent(value => value === 'all' ? 'operation' : 'all'); resetView() }}>{extent === 'operation' ? 'Ver territorio completo' : 'Centrar operación'}</button>
      {mode === 'heat' && <div className="absolute bottom-16 left-3 rounded-xl bg-white/95 p-3 text-xs shadow"><div className="h-2 w-32 rounded-full bg-gradient-to-r from-amber-200 via-orange-400 to-red-600" /><p className="mt-1">Menor → mayor concentración</p><p className="mt-1 text-[10px] text-slate-500">Grupos de {minimumGroupSize}+ registros</p></div>}
    </div>
  )
}
