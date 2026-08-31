import { geoJsonFeatures, pointInGeoJsonGeometry } from '@/lib/geo'
import type { GeoRecord, MapLayer } from '@/types/gis'

export interface CoverageSummary {
  totalZones: number
  zonesWithData: number
  zonesMeetingTarget: number
  protectedZones: number
  uncoveredZones: number
  completionPercent: number
}

export function isCoverageBoundaryLayer(layer: MapLayer) {
  return !layer.id.startsWith('control-g:spatial:')
    && layer.id !== 'local:field-geometries'
    && layer.layerType !== 'lines'
    && layer.layerType !== 'points'
}

export function calculateCoverageSummary(
  records: GeoRecord[],
  layers: MapLayer[],
  minimumGroupSize: number,
  coverageTarget: number,
): CoverageSummary {
  const counts = layers.filter(isCoverageBoundaryLayer).flatMap(layer => geoJsonFeatures(layer.geojson).flatMap(feature => {
    if (!feature.geometry || !feature.geometry.type.includes('Polygon')) return []
    return [records.filter(record => pointInGeoJsonGeometry([record.longitude, record.latitude], feature.geometry!)).length]
  }))
  const totalZones = counts.length
  const zonesWithData = counts.filter(count => count > 0).length
  const zonesMeetingTarget = counts.filter(count => count >= coverageTarget).length
  const protectedZones = counts.filter(count => count > 0 && count < minimumGroupSize).length
  const uncoveredZones = counts.filter(count => count === 0).length
  return {
    totalZones,
    zonesWithData,
    zonesMeetingTarget,
    protectedZones,
    uncoveredZones,
    completionPercent: totalZones ? Math.round((zonesMeetingTarget / totalZones) * 100) : 0,
  }
}
