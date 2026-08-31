import { COLLECTION_IDS, DATABASE_ID, databases, ID, Query } from '@/lib/backend'
import latamCountries from '@/assets/latam-countries.json'
import { localDB, type LocalGeoRecord, type LocalMapLayer } from '@/lib/dexie-db'
import { extractAnswerCoordinates, geoJsonCoordinates, normalizeColor, parseGeoJson, validLatitude, validLongitude } from '@/lib/geo'
import { isOnline } from '@/lib/network'
import type { User } from '@/types'
import type { GeoDimensionValue, GeoJsonPosition, GeoRecord, MapDataset, MapLayer, SupportedGeoJson } from '@/types/gis'

interface DimensionDefinition {
  label: string
  type: string
  options: Map<string, string>
}

const SENSITIVE_FIELD_PATTERN = /(nombre|apellido|document|c[eé]dula|identificaci[oó]n|tel[eé]fono|celular|correo|email|direcci[oó]n|firma|foto|imagen|archivo)/i
const REPORTABLE_FIELD_TYPES = new Set(['number', 'select', 'multi_select', 'radio', 'checkbox', 'date', 'municipality', 'calculation'])
const BASEMAP = parseGeoJson(latamCountries as unknown)
type MapPrivacyMode = 'exact' | 'approximate' | 'aggregate'

function cacheScope(user: User) {
  return `${user.role}:${user.entityId || 'all'}:${user.id}`
}

function normalizePrivacyMode(value: unknown): MapPrivacyMode {
  return value === 'approximate' || value === 'aggregate' ? value : 'exact'
}

function cachedPrivacyMode(entityId?: string | null) {
  if (!entityId || typeof localStorage === 'undefined') return 'exact' as const
  return normalizePrivacyMode(localStorage.getItem(`cg_map_privacy_${entityId}`))
}

function rememberPrivacyMode(entityId: string | null | undefined, mode: MapPrivacyMode) {
  if (entityId && typeof localStorage !== 'undefined') localStorage.setItem(`cg_map_privacy_${entityId}`, mode)
}

function applySpatialPrivacy(records: GeoRecord[], mode: MapPrivacyMode) {
  const precision = mode === 'aggregate' ? 2 : mode === 'approximate' ? 3 : null
  if (precision === null) return records
  return records.map(record => ({
    ...record,
    latitude: Number(record.latitude.toFixed(precision)),
    longitude: Number(record.longitude.toFixed(precision)),
  }))
}

function scopedQueries(user: User, professionalOnly = false) {
  const queries = user.entityId ? [Query.equal('entity_id', user.entityId)] : []
  if (professionalOnly && user.role === 'professional') queries.push(Query.equal('professional_id', user.id))
  return queries
}

function parseDefinition(value: unknown): any[] {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).pages)) return (parsed as any).pages
  } catch {
    // A malformed definition is ignored; it must never block the operational map.
  }
  return []
}

function collectFields(fields: any[], catalog: Map<string, DimensionDefinition>) {
  for (const field of fields) {
    if (!field?.id || !field?.label) continue
    if (REPORTABLE_FIELD_TYPES.has(field.type) && !SENSITIVE_FIELD_PATTERN.test(field.label)) {
      catalog.set(field.id, {
        label: String(field.label),
        type: String(field.type || ''),
        options: new Map((field.options || []).map((option: any) => [String(option.value), String(option.label)])),
      })
    }
    const children = field.subFields || field.fields
    if (Array.isArray(children)) collectFields(children, catalog)
  }
}

function dimensionCatalog(forms: any[]) {
  const catalog = new Map<string, DimensionDefinition>()
  for (const form of forms) {
    for (const page of parseDefinition(form.definition || form.schema)) {
      if (Array.isArray(page?.fields)) collectFields(page.fields, catalog)
    }
  }
  return catalog
}

function reportableDimensions(answers: unknown, catalog: Map<string, DimensionDefinition>) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return undefined
  const dimensions: Record<string, GeoDimensionValue> = {}
  for (const [fieldId, definition] of catalog) {
    const raw = (answers as Record<string, unknown>)[fieldId]
    if (raw === null || raw === undefined || raw === '') continue
    if (Array.isArray(raw)) {
      const values = raw
        .filter(value => ['string', 'number', 'boolean'].includes(typeof value))
        .map(value => definition.options.get(String(value)) || String(value))
      if (values.length) dimensions[fieldId] = { label: definition.label, value: values.join(', ') }
      continue
    }
    if (!['string', 'number', 'boolean'].includes(typeof raw)) continue
    dimensions[fieldId] = {
      label: definition.label,
      value: definition.options.get(String(raw)) || raw as string | number | boolean,
    }
  }
  return Object.keys(dimensions).length ? dimensions : undefined
}

function mapRecord(
  document: any,
  source: GeoRecord['source'],
  label: string,
  catalog = new Map<string, DimensionDefinition>(),
): GeoRecord | null {
  const latitude = validLatitude(document.latitude)
  const longitude = validLongitude(document.longitude)
  if (latitude === null || longitude === null) return null

  return {
    id: `${source}:${document.$id}`,
    localId: document.local_id || undefined,
    entityId: document.entity_id,
    professionalId: document.professional_id || undefined,
    formId: document.form_id || undefined,
    source,
    status: document.status || document.overall_status || 'synced',
    latitude,
    longitude,
    capturedAt: document.captured_at || document.activity_date || document.$updatedAt || document.$createdAt,
    label,
    isPending: false,
    dimensions: source === 'response' ? reportableDimensions(document.answers, catalog) : undefined,
  }
}

function mapLayer(document: any): MapLayer {
  return {
    id: document.$id,
    entityId: document.entity_id,
    name: document.name,
    description: document.description || undefined,
    layerType: document.layer_type || 'mixed',
    geojson: parseGeoJson(document.geojson),
    color: normalizeColor(document.color),
    opacity: Number(document.opacity ?? 0.28),
    visibleDefault: document.visible_default !== false,
    status: document.status || 'active',
    updatedAt: document.$updatedAt || document.updated_at || new Date().toISOString(),
    source: document.source || undefined,
    sourceUrl: document.source_url || undefined,
  }
}

function pointInBounds(record: GeoRecord, coordinates: GeoJsonPosition[]) {
  if (!coordinates.length) return false
  const longitudes = coordinates.map(point => point[0])
  const latitudes = coordinates.map(point => point[1])
  return record.longitude >= Math.min(...longitudes)
    && record.longitude <= Math.max(...longitudes)
    && record.latitude >= Math.min(...latitudes)
    && record.latitude <= Math.max(...latitudes)
}

function baseMapLayers(records: GeoRecord[], countryCode?: string): MapLayer[] {
  if (BASEMAP.type !== 'FeatureCollection') return []
  let features = BASEMAP.features.filter(feature => {
    const code = String(feature.properties?.country_code || '')
    return countryCode ? code === countryCode : records.some(record => pointInBounds(record, geoJsonCoordinates(feature)))
  })
  if (!features.length && !countryCode) features = BASEMAP.features
  if (!features.length) return []
  const code = countryCode || (features.length === 1 ? String(features[0].properties?.country_code || 'LATAM') : 'LATAM')
  return [{
    id: `base:${code}`,
    entityId: 'system',
    name: code === 'LATAM' ? 'Países de América Latina' : `Mapa base ${String(features[0].properties?.name || code)}`,
    description: 'Cartografía de referencia simplificada, disponible sin conexión.',
    layerType: 'polygons',
    geojson: { type: 'FeatureCollection', features },
    color: '#6F8E96',
    opacity: 0.12,
    visibleDefault: true,
    status: 'active',
    updatedAt: '2026-08-31T00:00:00.000Z',
    source: 'Natural Earth 1:110m',
    readOnly: true,
  }]
}

async function localResponses(user: User, scope: string): Promise<GeoRecord[]> {
  const responses = await localDB.formResponses
    .where('professionalId')
    .equals(user.id)
    .filter(response => response.entityId === user.entityId && response.status !== 'draft')
    .toArray()

  return responses.flatMap(response => {
    const coordinates = extractAnswerCoordinates(response.answers)
    if (!coordinates) return []
    return [{
      id: `local:${response.localId}`,
      localId: response.localId,
      entityId: response.entityId,
      professionalId: response.professionalId,
      formId: response.formId,
      source: 'local' as const,
      status: response.status,
      ...coordinates,
      capturedAt: new Date(response.createdAt).toISOString(),
      label: response.status === 'completed' ? 'Captura pendiente de sincronizar' : 'Captura guardada en el dispositivo',
      isPending: response.status === 'completed',
      cacheScope: scope,
    }]
  })
}

async function cachedDataset(scope: string, online: boolean): Promise<MapDataset> {
  const [records, layers] = await Promise.all([
    localDB.geoRecords.where('cacheScope').equals(scope).toArray(),
    localDB.mapLayers.where('cacheScope').equals(scope).toArray(),
  ])
  const timestamps = [
    ...records.map(record => record.capturedAt),
    ...layers.map(layer => layer.updatedAt),
  ].filter((value): value is string => typeof value === 'string' && value.length > 0).sort()
  const lastUpdatedAt = timestamps.length ? timestamps[timestamps.length - 1] : null

  return { records, layers, isOnline: online, loadedFromCache: true, lastUpdatedAt }
}

function mergeRecords(remote: GeoRecord[], local: GeoRecord[]) {
  const remoteLocalIds = new Set(remote.map(record => record.localId).filter(Boolean))
  return [...local.filter(record => !remoteLocalIds.has(record.localId)), ...remote]
    .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
}

async function cacheDataset(scope: string, records: GeoRecord[], layers: MapLayer[]) {
  const cachedRecords: LocalGeoRecord[] = records.map(record => ({
    ...record,
    cacheId: `${scope}:${record.id}`,
    cacheScope: scope,
  }))
  const cachedLayers: LocalMapLayer[] = layers.map(layer => ({
    ...layer,
    cacheId: `${scope}:${layer.id}`,
    cacheScope: scope,
  }))

  await localDB.transaction('rw', localDB.geoRecords, localDB.mapLayers, async () => {
    await localDB.geoRecords.where('cacheScope').equals(scope).delete()
    await localDB.mapLayers.where('cacheScope').equals(scope).delete()
    if (cachedRecords.length) await localDB.geoRecords.bulkPut(cachedRecords)
    if (cachedLayers.length) await localDB.mapLayers.bulkPut(cachedLayers)
  })
}

export async function loadMapDataset(user: User): Promise<MapDataset> {
  const scope = cacheScope(user)
  const connected = await isOnline()
  const localPrivacyMode = cachedPrivacyMode(user.entityId)
  const rawPendingRecords = await localResponses(user, scope)
  const pendingRecords = applySpatialPrivacy(rawPendingRecords, localPrivacyMode)

  if (!connected) {
    const cached = await cachedDataset(scope, false)
    const records = mergeRecords(cached.records, pendingRecords)
    const layers = cached.layers.length ? cached.layers : baseMapLayers(records)
    return { ...cached, records, layers }
  }

  try {
    const common = scopedQueries(user, false)
    const professional = scopedQueries(user, true)
    const [responseResult, activityResult, familyResult, layerResult, formResult, entityResult] = await Promise.all([
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORM_RESPONSES, [
        ...professional,
        Query.orderDesc('captured_at'),
        Query.limit(3000),
      ]),
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ACTIVITIES, [
        ...professional,
        Query.orderDesc('activity_date'),
        Query.limit(3000),
      ]),
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FAMILIES, [
        ...professional,
        Query.orderDesc('$updatedAt'),
        Query.limit(3000),
      ]),
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.MAP_LAYERS, [
        ...common,
        Query.equal('status', 'active'),
        Query.limit(200),
      ]).catch(() => ({ documents: [], total: 0 })),
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORMS, [
        ...common,
        Query.limit(500),
      ]),
      user.entityId
        ? databases.getDocument(DATABASE_ID, COLLECTION_IDS.ENTITIES, user.entityId).catch(() => null)
        : Promise.resolve(null),
    ])

    const catalog = dimensionCatalog(formResult.documents)
    const rawRecords = [
      ...responseResult.documents.map((document: any) => mapRecord(document, 'response', 'Respuesta de formulario', catalog)),
      ...activityResult.documents.map((document: any) => mapRecord(document, 'activity', 'Actividad de campo')),
      ...familyResult.documents.map((document: any) => mapRecord(document, 'family', 'Hogar caracterizado')),
    ].filter((record): record is GeoRecord => record !== null)
    const countryCode = entityResult?.country_code ? String(entityResult.country_code) : undefined
    const privacyMode = normalizePrivacyMode(entityResult?.map_privacy_mode)
    rememberPrivacyMode(user.entityId, privacyMode)
    const records = applySpatialPrivacy(rawRecords, privacyMode)
    const layers = [...baseMapLayers(records, countryCode), ...layerResult.documents.map(mapLayer)]
    await cacheDataset(scope, records, layers)

    return {
      records: mergeRecords(records, applySpatialPrivacy(rawPendingRecords, privacyMode)),
      layers,
      isOnline: true,
      loadedFromCache: false,
      lastUpdatedAt: new Date().toISOString(),
    }
  } catch (error) {
    const cached = await cachedDataset(scope, true)
    if (cached.records.length || cached.layers.length || pendingRecords.length) {
      return { ...cached, records: mergeRecords(cached.records, pendingRecords) }
    }
    throw error
  }
}

function layerType(geojson: SupportedGeoJson): MapLayer['layerType'] {
  const serialized = JSON.stringify(geojson)
  const hasPoints = /"(Multi)?Point"/.test(serialized)
  const hasLines = /"(Multi)?LineString"/.test(serialized)
  const hasPolygons = /"(Multi)?Polygon"/.test(serialized)
  if ([hasPoints, hasLines, hasPolygons].filter(Boolean).length !== 1) return 'mixed'
  if (hasPolygons) return 'polygons'
  if (hasLines) return 'lines'
  return 'points'
}

export async function createMapLayer(user: User, input: {
  name: string
  description?: string
  color: string
  geojson: SupportedGeoJson
  source?: string
  sourceUrl?: string
}) {
  if (!user.entityId) throw new Error('Selecciona una entidad antes de crear una capa territorial.')
  return databases.createDocument(DATABASE_ID, COLLECTION_IDS.MAP_LAYERS, ID.unique(), {
    entity_id: user.entityId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    layer_type: layerType(input.geojson),
    geojson: input.geojson,
    color: normalizeColor(input.color),
    opacity: 0.28,
    visible_default: true,
    status: 'active',
    source: input.source || 'Carga GeoJSON desde Control G',
    source_url: input.sourceUrl || null,
    created_by: user.id,
  })
}
