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

export interface GeoJsonTopologyIssue {
  severity: 'error' | 'warning'
  code: string
  path: string
  message: string
}

export interface GeoJsonTopologyReport {
  valid: boolean
  featureCount: number
  geometryCount: number
  vertexCount: number
  issues: GeoJsonTopologyIssue[]
}

function positionsEqual(first: GeoJsonPosition, second: GeoJsonPosition) {
  return first[0] === second[0] && first[1] === second[1]
}

function orientation(first: GeoJsonPosition, second: GeoJsonPosition, third: GeoJsonPosition) {
  const value = (second[1] - first[1]) * (third[0] - second[0])
    - (second[0] - first[0]) * (third[1] - second[1])
  if (Math.abs(value) < 1e-12) return 0
  return value > 0 ? 1 : 2
}

function pointOnSegment(first: GeoJsonPosition, point: GeoJsonPosition, second: GeoJsonPosition) {
  return point[0] <= Math.max(first[0], second[0]) + 1e-12
    && point[0] + 1e-12 >= Math.min(first[0], second[0])
    && point[1] <= Math.max(first[1], second[1]) + 1e-12
    && point[1] + 1e-12 >= Math.min(first[1], second[1])
}

function segmentsIntersect(
  firstStart: GeoJsonPosition,
  firstEnd: GeoJsonPosition,
  secondStart: GeoJsonPosition,
  secondEnd: GeoJsonPosition,
) {
  const firstOrientation = orientation(firstStart, firstEnd, secondStart)
  const secondOrientation = orientation(firstStart, firstEnd, secondEnd)
  const thirdOrientation = orientation(secondStart, secondEnd, firstStart)
  const fourthOrientation = orientation(secondStart, secondEnd, firstEnd)
  if (firstOrientation !== secondOrientation && thirdOrientation !== fourthOrientation) return true
  return (firstOrientation === 0 && pointOnSegment(firstStart, secondStart, firstEnd))
    || (secondOrientation === 0 && pointOnSegment(firstStart, secondEnd, firstEnd))
    || (thirdOrientation === 0 && pointOnSegment(secondStart, firstStart, secondEnd))
    || (fourthOrientation === 0 && pointOnSegment(secondStart, firstEnd, secondEnd))
}

function ringSelfIntersects(ring: GeoJsonPosition[]) {
  const segmentCount = Math.max(0, ring.length - 1)
  for (let first = 0; first < segmentCount; first += 1) {
    for (let second = first + 1; second < segmentCount; second += 1) {
      if (Math.abs(first - second) <= 1) continue
      if (first === 0 && second === segmentCount - 1) continue
      if (segmentsIntersect(ring[first], ring[first + 1], ring[second], ring[second + 1])) return true
    }
  }
  return false
}

function inspectPositionList(
  raw: unknown,
  path: string,
  minimum: number,
  issues: GeoJsonTopologyIssue[],
) {
  if (!Array.isArray(raw)) {
    issues.push({ severity: 'error', code: 'COORDINATES_NOT_ARRAY', path, message: `${path}: las coordenadas no son una lista.` })
    return []
  }
  const positions = raw.filter(isCoordinate).map(point => [Number(point[0]), Number(point[1])] as GeoJsonPosition)
  if (positions.length !== raw.length) {
    issues.push({ severity: 'error', code: 'INVALID_COORDINATE', path, message: `${path}: contiene coordenadas fuera de WGS84 o no numéricas.` })
  }
  if (positions.length < minimum) {
    issues.push({ severity: 'error', code: 'TOO_FEW_VERTICES', path, message: `${path}: requiere al menos ${minimum} vértices válidos.` })
  }
  if (positions.some((position, index) => index > 0 && positionsEqual(position, positions[index - 1]))) {
    issues.push({ severity: 'warning', code: 'DUPLICATE_VERTEX', path, message: `${path}: contiene vértices consecutivos repetidos.` })
  }
  return positions
}

function inspectRing(raw: unknown, path: string, issues: GeoJsonTopologyIssue[]) {
  const ring = inspectPositionList(raw, path, 4, issues)
  if (ring.length && !positionsEqual(ring[0], ring[ring.length - 1])) {
    issues.push({ severity: 'error', code: 'RING_NOT_CLOSED', path, message: `${path}: el anillo no termina en su coordenada inicial.` })
  }
  const distinctVertices = new Set(ring.slice(0, -1).map(position => `${position[0]}:${position[1]}`))
  if (ring.length >= 4 && distinctVertices.size < 3) {
    issues.push({ severity: 'error', code: 'RING_COLLAPSED', path, message: `${path}: no forma un área porque tiene menos de tres vértices distintos.` })
  }
  if (ring.length >= 4 && positionsEqual(ring[0], ring[ring.length - 1]) && ringSelfIntersects(ring)) {
    issues.push({ severity: 'error', code: 'RING_SELF_INTERSECTION', path, message: `${path}: el polígono se cruza consigo mismo.` })
  }
  return ring
}

function inspectPolygon(raw: unknown, path: string, issues: GeoJsonTopologyIssue[]) {
  if (!Array.isArray(raw) || raw.length === 0) {
    issues.push({ severity: 'error', code: 'POLYGON_WITHOUT_RINGS', path, message: `${path}: el polígono no contiene anillos.` })
    return
  }
  const rings = raw.map((ring, index) => inspectRing(ring, `${path}.anillo[${index}]`, issues))
  const exterior = rings[0]
  rings.slice(1).forEach((hole, index) => {
    if (exterior.length >= 4 && hole.length >= 4 && !pointInRing(hole[0], exterior)) {
      issues.push({ severity: 'error', code: 'HOLE_OUTSIDE_POLYGON', path: `${path}.anillo[${index + 1}]`, message: `${path}: contiene un hueco fuera de su anillo exterior.` })
    }
  })
}

function inspectGeometryTopology(geometry: GeoJsonGeometry, path: string, issues: GeoJsonTopologyIssue[]) {
  const coordinates = geometry.coordinates as unknown
  if (geometry.type === 'Point') {
    if (!isCoordinate(coordinates)) issues.push({ severity: 'error', code: 'INVALID_POINT', path, message: `${path}: el punto no contiene una coordenada WGS84 válida.` })
    return
  }
  if (geometry.type === 'MultiPoint') {
    inspectPositionList(coordinates, path, 1, issues)
    return
  }
  if (geometry.type === 'LineString') {
    inspectPositionList(coordinates, path, 2, issues)
    return
  }
  if (geometry.type === 'MultiLineString') {
    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      issues.push({ severity: 'error', code: 'EMPTY_MULTILINE', path, message: `${path}: no contiene líneas.` })
      return
    }
    coordinates.forEach((line, index) => inspectPositionList(line, `${path}.linea[${index}]`, 2, issues))
    return
  }
  if (geometry.type === 'Polygon') {
    inspectPolygon(coordinates, path, issues)
    return
  }
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    issues.push({ severity: 'error', code: 'EMPTY_MULTIPOLYGON', path, message: `${path}: no contiene polígonos.` })
    return
  }
  coordinates.forEach((polygon, index) => inspectPolygon(polygon, `${path}.poligono[${index}]`, issues))
}

export function analyzeGeoJsonTopology(geojson: SupportedGeoJson): GeoJsonTopologyReport {
  const features = geoJsonFeatures(geojson)
  const geometries = geoJsonGeometries(geojson)
  const issues: GeoJsonTopologyIssue[] = []
  geometries.forEach((geometry, index) => inspectGeometryTopology(geometry, `geometria[${index}]`, issues))
  return {
    valid: !issues.some(issue => issue.severity === 'error'),
    featureCount: features.length,
    geometryCount: geometries.length,
    vertexCount: geoJsonCoordinates(geojson).length,
    issues,
  }
}

export function assertValidGeoJsonTopology(geojson: SupportedGeoJson) {
  const report = analyzeGeoJsonTopology(geojson)
  const firstError = report.issues.find(issue => issue.severity === 'error')
  if (firstError) throw new Error(`Topología inválida. ${firstError.message}`)
  return report
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

export function geoJsonFeatures(geojson: SupportedGeoJson): GeoJsonFeature[] {
  if (geojson.type === 'FeatureCollection') return geojson.features.filter(feature => feature.geometry)
  if (geojson.type === 'Feature') return geojson.geometry ? [geojson] : []
  return [{ type: 'Feature', geometry: geojson, properties: {} }]
}

function pointInRing([longitude, latitude]: GeoJsonPosition, ring: GeoJsonPosition[]) {
  let inside = false
  for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current, current += 1) {
    const [currentLongitude, currentLatitude] = ring[current]
    const [previousLongitude, previousLatitude] = ring[previous]
    const crosses = (currentLatitude > latitude) !== (previousLatitude > latitude)
      && longitude < ((previousLongitude - currentLongitude) * (latitude - currentLatitude))
        / ((previousLatitude - currentLatitude) || Number.EPSILON) + currentLongitude
    if (crosses) inside = !inside
  }
  return inside
}

function pointInPolygon(point: GeoJsonPosition, rings: GeoJsonPosition[][]) {
  return Boolean(rings.length && pointInRing(point, rings[0]) && !rings.slice(1).some(ring => pointInRing(point, ring)))
}

export function pointInGeoJsonGeometry(point: GeoJsonPosition, geometry: GeoJsonGeometry) {
  if (geometry.type === 'Polygon') return pointInPolygon(point, geometry.coordinates as GeoJsonPosition[][])
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as GeoJsonPosition[][][]).some(polygon => pointInPolygon(point, polygon))
  }
  return false
}

export function geoJsonCoordinates(geojson: SupportedGeoJson): GeoJsonPosition[] {
  const coordinates: GeoJsonPosition[] = []
  for (const geometry of geoJsonGeometries(geojson)) {
    collectNestedCoordinates(geometry.coordinates, coordinates)
  }
  return coordinates
}
