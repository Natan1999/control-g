import type { CapturedGeometryValue, CapturedGeometryVertex, GeoJsonFeature, GeoJsonPosition } from '@/types/gis'

const EARTH_RADIUS_M = 6_371_008.8

function radians(value: number) {
  return value * Math.PI / 180
}

export function haversineMeters(first: GeoJsonPosition, second: GeoJsonPosition) {
  const lat1 = radians(first[1])
  const lat2 = radians(second[1])
  const deltaLatitude = lat2 - lat1
  const deltaLongitude = radians(second[0] - first[0])
  const a = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLongitude / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)))
}

export function lineLengthMeters(coordinates: GeoJsonPosition[]) {
  return coordinates.slice(1).reduce((total, coordinate, index) => (
    total + haversineMeters(coordinates[index], coordinate)
  ), 0)
}

export function polygonAreaSquareMeters(coordinates: GeoJsonPosition[]) {
  if (coordinates.length < 3) return 0
  const referenceLatitude = radians(coordinates.reduce((sum, point) => sum + point[1], 0) / coordinates.length)
  const projected = coordinates.map(([longitude, latitude]) => [
    EARTH_RADIUS_M * radians(longitude) * Math.cos(referenceLatitude),
    EARTH_RADIUS_M * radians(latitude),
  ])
  let twiceArea = 0
  for (let index = 0; index < projected.length; index += 1) {
    const current = projected[index]
    const next = projected[(index + 1) % projected.length]
    twiceArea += current[0] * next[1] - next[0] * current[1]
  }
  return Math.abs(twiceArea) / 2
}

export function geometryMinimumVertices(captureType: CapturedGeometryValue['captureType']) {
  return captureType === 'geoshape' ? 3 : 2
}

export function geometryCaptureIsComplete(value: unknown, captureType?: CapturedGeometryValue['captureType']): value is CapturedGeometryValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const capture = value as CapturedGeometryValue
  if (capture.captureType !== 'geotrace' && capture.captureType !== 'geoshape') return false
  const expectedType = captureType || capture.captureType
  return capture.captureType === expectedType
    && capture.geometryType === (expectedType === 'geoshape' ? 'Polygon' : 'LineString')
    && capture.complete === true
    && Array.isArray(capture.coordinates)
    && Array.isArray(capture.vertices)
    && capture.coordinates.length >= geometryMinimumVertices(expectedType)
    && capture.coordinates.length === capture.vertices.length
    && capture.coordinates.every(point => Array.isArray(point)
      && Number.isFinite(point[0]) && point[0] >= -180 && point[0] <= 180
      && Number.isFinite(point[1]) && point[1] >= -90 && point[1] <= 90
      && !(point[0] === 0 && point[1] === 0))
    && capture.vertices.every(vertex => vertex
      && Number.isFinite(vertex.longitude) && vertex.longitude >= -180 && vertex.longitude <= 180
      && Number.isFinite(vertex.latitude) && vertex.latitude >= -90 && vertex.latitude <= 90
      && !(vertex.longitude === 0 && vertex.latitude === 0)
      && Number.isFinite(vertex.timestamp))
}

export function capturedGeometryFeature(value: CapturedGeometryValue): GeoJsonFeature | null {
  if (!geometryCaptureIsComplete(value)) return null
  const coordinates = value.captureType === 'geoshape'
    ? [[...value.coordinates, value.coordinates[0]]]
    : value.coordinates
  return {
    type: 'Feature',
    geometry: { type: value.geometryType, coordinates },
    properties: {
      capture_type: value.captureType,
      captured_at: value.capturedAt,
      vertex_count: value.coordinates.length,
      maximum_accuracy_m: Math.max(0, ...value.vertices.map(vertex => Number(vertex.accuracyM || 0))),
    },
  }
}

export function buildCapturedGeometry(
  captureType: CapturedGeometryValue['captureType'],
  vertices: CapturedGeometryVertex[],
  original?: CapturedGeometryValue | null,
): CapturedGeometryValue {
  const now = new Date().toISOString()
  return {
    captureType,
    geometryType: captureType === 'geoshape' ? 'Polygon' : 'LineString',
    coordinates: vertices.map(vertex => [vertex.longitude, vertex.latitude]),
    vertices,
    complete: vertices.length >= geometryMinimumVertices(captureType),
    capturedAt: original?.capturedAt || now,
    updatedAt: now,
  }
}
