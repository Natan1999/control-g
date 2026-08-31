import { COLLECTION_IDS, DATABASE_ID, databases, ID, Query } from '@/lib/backend'
import latamCountries from '@/assets/latam-countries.json'
import { localDB, type LocalGeoRecord, type LocalMapLayer } from '@/lib/dexie-db'
import { extractAnswerCoordinates, geoJsonCoordinates, normalizeColor, parseGeoJson, validLatitude, validLongitude } from '@/lib/geo'
import { capturedGeometryFeature, geometryCaptureIsComplete } from '@/lib/geometry-capture'
import { isOnline } from '@/lib/network'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types'
import type { CapturedGeometryValue, GeoDimensionValue, GeoJsonFeature, GeoJsonPosition, GeoRecord, MapDataset, MapLayer, SupportedGeoJson } from '@/types/gis'

interface DimensionDefinition {
  label: string
  type: string
  options: Map<string, string>
}

const SENSITIVE_FIELD_PATTERN = /(nombre|apellido|document|c[eé]dula|identificaci[oó]n|tel[eé]fono|celular|correo|email|direcci[oó]n|firma|foto|imagen|archivo)/i
const REPORTABLE_FIELD_TYPES = new Set(['number', 'select', 'multi_select', 'radio', 'checkbox', 'date', 'municipality', 'calculation'])
const BASEMAP = parseGeoJson(latamCountries as unknown)
type MapPrivacyMode = 'exact' | 'approximate' | 'aggregate'
type SpatialPolicy = MapDataset['spatialPolicy']

function cacheScope(user: User) {
  return `${user.role}:${user.entityId || 'all'}:${user.id}`
}

function normalizePrivacyMode(value: unknown): MapPrivacyMode {
  return value === 'approximate' || value === 'aggregate' ? value : 'exact'
}

function cachedPrivacyMode(entityId?: string | null) {
  if (!entityId || typeof localStorage === 'undefined') return 'aggregate' as const
  return normalizePrivacyMode(localStorage.getItem(`cg_map_privacy_${entityId}`))
}

function cachedSpatialPolicy(entityId?: string | null): SpatialPolicy {
  const fallback = { privacyMode: cachedPrivacyMode(entityId), minimumGroupSize: 5, coverageTarget: 10 }
  if (!entityId || typeof localStorage === 'undefined') return fallback
  try {
    const cached = JSON.parse(localStorage.getItem(`cg_spatial_policy_${entityId}`) || '{}')
    return {
      privacyMode: normalizePrivacyMode(cached.privacyMode),
      minimumGroupSize: Math.min(100, Math.max(1, Number(cached.minimumGroupSize || 5))),
      coverageTarget: Math.min(1_000_000, Math.max(1, Number(cached.coverageTarget || 10))),
    }
  } catch { return fallback }
}

function rememberPrivacyMode(entityId: string | null | undefined, mode: MapPrivacyMode) {
  if (entityId && typeof localStorage !== 'undefined') localStorage.setItem(`cg_map_privacy_${entityId}`, mode)
}

function rememberSpatialPolicy(entityId: string | null | undefined, policy: SpatialPolicy) {
  if (!entityId || typeof localStorage === 'undefined') return
  rememberPrivacyMode(entityId, policy.privacyMode)
  localStorage.setItem(`cg_spatial_policy_${entityId}`, JSON.stringify(policy))
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

function privacyCoordinates(value: unknown, precision: number): unknown {
  if (!Array.isArray(value)) return value
  if (value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) {
    return [Number(Number(value[0]).toFixed(precision)), Number(Number(value[1]).toFixed(precision))]
  }
  return value.map(item => privacyCoordinates(item, precision))
}

function applyFeaturePrivacy(feature: GeoJsonFeature, mode: MapPrivacyMode): GeoJsonFeature {
  const precision = mode === 'aggregate' ? 2 : mode === 'approximate' ? 3 : null
  if (precision === null || !feature.geometry) return feature
  return {
    ...feature,
    geometry: { ...feature.geometry, coordinates: privacyCoordinates(feature.geometry.coordinates, precision) },
  }
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

async function loadJurisdictionDocuments(countryProfileId: string) {
  const pageSize = 1_000
  const maximum = 10_000
  const documents: any[] = []
  for (let start = 0; start < maximum; start += pageSize) {
    const { data, error } = await supabase.from(COLLECTION_IDS.JURISDICTIONS)
      .select('id,country_profile_id,parent_id,level,code,name,local_type,geometry,source_name,source_url,source_version,status,updated_at')
      .eq('country_profile_id', countryProfileId)
      .eq('status', 'active')
      .not('geometry', 'is', null)
      .order('level')
      .order('code')
      .range(start, start + pageSize - 1)
    if (error) throw error
    documents.push(...(data || []))
    if ((data || []).length < pageSize) break
  }
  return documents
}

function jurisdictionLayers(documents: any[], entityId: string): MapLayer[] {
  const byLevel = new Map<number, any[]>()
  for (const document of documents) {
    const level = Number(document.level)
    if (!Number.isInteger(level)) continue
    const group = byLevel.get(level) || []
    group.push(document)
    byLevel.set(level, group)
  }
  const deepestLevel = Math.max(-1, ...byLevel.keys())
  const colors = ['#315D6B', '#3D7B9E', '#2F855A', '#B7791F', '#6B5B95', '#C05640', '#218380', '#8B6F47', '#475569']
  return Array.from(byLevel.entries()).sort(([left], [right]) => left - right).flatMap(([level, group]) => {
    const features = group.flatMap(document => {
      try {
        const geometry = parseGeoJson(document.geometry)
        if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return []
        return [{
          type: 'Feature' as const,
          geometry,
          properties: {
            jurisdiction_code: String(document.code),
            jurisdiction_name: String(document.name),
            administrative_level: level,
            local_type: String(document.local_type),
            source_version: document.source_version ? String(document.source_version) : null,
          },
        }]
      } catch { return [] }
    })
    if (!features.length) return []
    const first = group[0]
    const updateTimes = group.map(item => String(item.updated_at || '')).sort()
    return [{
      id: `jurisdictions:${first.country_profile_id}:${level}`,
      entityId,
      name: `${String(first.local_type || 'Territorios')} · nivel ${level}`,
      description: `${features.length.toLocaleString('es-CO')} divisiones oficiales versionadas para esta entidad.`,
      layerType: 'polygons' as const,
      geojson: { type: 'FeatureCollection' as const, features },
      color: colors[level] || colors[0],
      opacity: 0.1,
      visibleDefault: level === deepestLevel,
      status: 'active' as const,
      updatedAt: updateTimes[updateTimes.length - 1] || new Date().toISOString(),
      source: String(first.source_name || 'Catálogo territorial versionado'),
      sourceUrl: first.source_url ? String(first.source_url) : undefined,
      readOnly: true,
    }]
  })
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

async function localGeometryLayers(user: User, mode: MapPrivacyMode): Promise<MapLayer[]> {
  const responses = await localDB.formResponses
    .where('professionalId')
    .equals(user.id)
    .filter(response => response.entityId === user.entityId && response.status !== 'draft')
    .toArray()
  const features = responses.flatMap(response => Object.entries(response.answers).flatMap(([fieldId, answer]) => {
    if (!geometryCaptureIsComplete(answer)) return []
    const feature = capturedGeometryFeature(answer as CapturedGeometryValue)
    if (!feature) return []
    return [applyFeaturePrivacy({
      ...feature,
      properties: {
        ...feature.properties,
        control_g_local_id: response.localId,
        field_id: fieldId,
        status: response.status,
        pending_sync: response.status === 'completed',
      },
    }, mode)]
  }))
  if (!features.length) return []
  return [{
    id: 'local:field-geometries',
    entityId: user.entityId || 'device',
    name: 'Geometrías pendientes del dispositivo',
    description: 'Recorridos y polígonos guardados localmente; se sincronizan al recuperar internet.',
    layerType: 'mixed',
    geojson: { type: 'FeatureCollection', features },
    color: '#B7791F',
    opacity: 0.24,
    visibleDefault: true,
    status: 'active',
    updatedAt: new Date().toISOString(),
    source: 'Captura offline Control G',
    readOnly: true,
  }]
}

function spatialFeatureLayers(documents: any[], mode: MapPrivacyMode): MapLayer[] {
  const groups = [
    { type: 'LineString', name: 'Recorridos GPS sincronizados', color: '#2F855A', layerType: 'lines' as const },
    { type: 'Polygon', name: 'Áreas GPS sincronizadas', color: '#6B5B95', layerType: 'polygons' as const },
  ]
  return groups.flatMap(group => {
    const features = documents.filter(document => document.geometry_type === group.type).flatMap(document => {
      try {
        const parsed = parseGeoJson(document.geojson)
        const feature = parsed.type === 'Feature' ? parsed : null
        return feature ? [applyFeaturePrivacy(feature, mode)] : []
      } catch { return [] }
    })
    if (!features.length) return []
    return [{
      id: `control-g:spatial:${group.type.toLowerCase()}`,
      entityId: documents[0]?.entity_id || 'system',
      name: group.name,
      description: 'Geometrías derivadas de formularios y gobernadas por RLS/PostGIS.',
      layerType: group.layerType,
      geojson: { type: 'FeatureCollection', features },
      color: group.color,
      opacity: 0.22,
      visibleDefault: true,
      status: 'active' as const,
      updatedAt: new Date().toISOString(),
      source: 'Control G · PostGIS',
      readOnly: true,
    }]
  })
}

async function cachedDataset(scope: string, online: boolean, spatialPolicy: SpatialPolicy): Promise<MapDataset> {
  const [records, layers] = await Promise.all([
    localDB.geoRecords.where('cacheScope').equals(scope).toArray(),
    localDB.mapLayers.where('cacheScope').equals(scope).toArray(),
  ])
  const timestamps = [
    ...records.map(record => record.capturedAt),
    ...layers.map(layer => layer.updatedAt),
  ].filter((value): value is string => typeof value === 'string' && value.length > 0).sort()
  const lastUpdatedAt = timestamps.length ? timestamps[timestamps.length - 1] : null

  return { records, layers, isOnline: online, loadedFromCache: true, lastUpdatedAt, spatialPolicy }
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
  const localPolicy = cachedSpatialPolicy(user.entityId)
  const localPrivacyMode = localPolicy.privacyMode
  const rawPendingRecords = await localResponses(user, scope)
  const pendingRecords = applySpatialPrivacy(rawPendingRecords, localPrivacyMode)
  const pendingGeometryLayers = await localGeometryLayers(user, localPrivacyMode)

  if (!connected) {
    const cached = await cachedDataset(scope, false, localPolicy)
    const records = mergeRecords(cached.records, pendingRecords)
    const layers = cached.layers.length ? cached.layers : baseMapLayers(records)
    return { ...cached, records, layers: [...layers, ...pendingGeometryLayers] }
  }

  try {
    const common = scopedQueries(user, false)
    const professional = scopedQueries(user, true)
    const [responseResult, activityResult, familyResult, layerResult, spatialResult, formResult, entityResult] = await Promise.all([
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
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.SPATIAL_FEATURES, [
        ...professional,
        Query.orderDesc('captured_at'),
        Query.limit(3000),
      ]).catch(() => ({ documents: [], total: 0 })),
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORMS, [
        ...common,
        Query.limit(500),
      ]),
      user.entityId
        ? databases.getDocument(DATABASE_ID, COLLECTION_IDS.ENTITIES, user.entityId).catch(() => null)
        : Promise.resolve(null),
    ])

    const jurisdictionDocuments = entityResult?.country_profile_id && user.entityId
      ? await loadJurisdictionDocuments(String(entityResult.country_profile_id))
      : []
    const catalog = dimensionCatalog(formResult.documents)
    const rawRecords = [
      ...responseResult.documents.map((document: any) => mapRecord(document, 'response', 'Respuesta de formulario', catalog)),
      ...activityResult.documents.map((document: any) => mapRecord(document, 'activity', 'Actividad de campo')),
      ...familyResult.documents.map((document: any) => mapRecord(document, 'family', 'Hogar caracterizado')),
    ].filter((record): record is GeoRecord => record !== null)
    const countryCode = entityResult?.country_code ? String(entityResult.country_code) : undefined
    const spatialPolicy: SpatialPolicy = {
      privacyMode: user.entityId ? normalizePrivacyMode(entityResult?.map_privacy_mode) : 'aggregate',
      minimumGroupSize: Math.min(100, Math.max(1, Number(entityResult?.map_minimum_group_size || 5))),
      coverageTarget: Math.min(1_000_000, Math.max(1, Number(entityResult?.map_coverage_target || 10))),
    }
    const privacyMode = spatialPolicy.privacyMode
    rememberSpatialPolicy(user.entityId, spatialPolicy)
    const records = applySpatialPrivacy(rawRecords, privacyMode)
    const layers = [
      ...baseMapLayers(records, countryCode),
      ...jurisdictionLayers(jurisdictionDocuments, user.entityId || 'system'),
      ...layerResult.documents.map(mapLayer),
      ...spatialFeatureLayers(spatialResult.documents, privacyMode),
    ]
    await cacheDataset(scope, records, layers)

    return {
      records: mergeRecords(records, applySpatialPrivacy(rawPendingRecords, privacyMode)),
      layers: [...layers, ...await localGeometryLayers(user, privacyMode)],
      isOnline: true,
      loadedFromCache: false,
      lastUpdatedAt: new Date().toISOString(),
      spatialPolicy,
    }
  } catch (error) {
    const cached = await cachedDataset(scope, true, localPolicy)
    if (cached.records.length || cached.layers.length || pendingRecords.length) {
      return { ...cached, records: mergeRecords(cached.records, pendingRecords), layers: [...cached.layers, ...pendingGeometryLayers] }
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
