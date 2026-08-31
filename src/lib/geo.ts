import type {
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  GeoJsonGeometry,
  GeoJsonPosition,
  SupportedGeoJson,
} from '@/types/gis'

const HEX_COLOR = /^#[0-9a-f]{6}$/i
const SUPPORTED_GEOMETRIES = new Set([
  'Point',
  'MultiPoint',
  'LineString',
  'MultiLineString',
  'Polygon',
  'MultiPolygon',
])

export function isCoordinate(value: unknown): value is GeoJsonPosition {
  return Array.isArray(value)
    && value.length >= 2
    && Number.isFinite(Number(value[0]))
    && Number.isFinite(Number(value[1]))
    && Number(value[0]) >= -180
    && Number(value[0]) <= 180
    && Number(value[1]) >= -90
    && Number(value[1]) <= 90
}

export function validLatitude(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= -90 && number <= 90 ? number : null
}

export function validLongitude(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= -180 && number <= 180 ? number : null
}

export function extractAnswerCoordinates(answers: Record<string, unknown>) {
  const metadata = answers._metadata as Record<string, unknown> | undefined
  const metadataLatitude = validLatitude(metadata?.lat ?? metadata?.latitude)
  const metadataLongitude = validLongitude(metadata?.lng ?? metadata?.longitude)
  if (metadataLatitude !== null && metadataLongitude !== null) {
    return { latitude: metadataLatitude, longitude: metadataLongitude }
  }

  for (const value of Object.values(answers)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const gps = value as Record<string, unknown>
    const latitude = validLatitude(gps.latitude ?? gps.lat)
    const longitude = validLongitude(gps.longitude ?? gps.lng)
    if (latitude !== null && longitude !== null) return { latitude, longitude }
  }

  return null
}

export function normalizeColor(color: unknown, fallback = '#3D7B9E') {
  return typeof color === 'string' && HEX_COLOR.test(color) ? color : fallback
}

function isGeometry(value: unknown): value is GeoJsonGeometry {
  if (!value || typeof value !== 'object') return false
  const geometry = value as Record<string, unknown>
  return typeof geometry.type === 'string'
    && SUPPORTED_GEOMETRIES.has(geometry.type)
    && Array.isArray(geometry.coordinates)
}

function isFeature(value: unknown): value is GeoJsonFeature {
  if (!value || typeof value !== 'object') return false
  const feature = value as Record<string, unknown>
  return feature.type === 'Feature' && (feature.geometry === null || isGeometry(feature.geometry))
}

function isFeatureCollection(value: unknown): value is GeoJsonFeatureCollection {
  if (!value || typeof value !== 'object') return false
  const collection = value as Record<string, unknown>
  return collection.type === 'FeatureCollection'
    && Array.isArray(collection.features)
    && collection.features.every(isFeature)
}

export function parseGeoJson(value: unknown): SupportedGeoJson {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value
  if (isFeatureCollection(parsed) || isFeature(parsed) || isGeometry(parsed)) return parsed
  throw new Error('El archivo no contiene GeoJSON compatible (FeatureCollection, Feature o Geometry).')
}

function collectNestedCoordinates(value: unknown, result: GeoJsonPosition[]) {
  if (isCoordinate(value)) {
    result.push([Number(value[0]), Number(value[1])])
    return
  }
  if (!Array.isArray(value)) return
  for (const item of value) collectNestedCoordinates(item, result)
}

export function geoJsonGeometries(geojson: SupportedGeoJson): GeoJsonGeometry[] {
  if (geojson.type === 'FeatureCollection') {
    return geojson.features.flatMap(feature => feature.geometry ? [feature.geometry] : [])
  }
  if (geojson.type === 'Feature') return geojson.geometry ? [geojson.geometry] : []
  return [geojson]
}

export function geoJsonCoordinates(geojson: SupportedGeoJson): GeoJsonPosition[] {
  const coordinates: GeoJsonPosition[] = []
  for (const geometry of geoJsonGeometries(geojson)) {
    collectNestedCoordinates(geometry.coordinates, coordinates)
  }
  return coordinates
}
