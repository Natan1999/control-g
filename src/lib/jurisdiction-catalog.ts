import { supabase } from '@/lib/supabase'

const MAX_CATALOG_BYTES = 12 * 1024 * 1024
const MAX_FEATURES = 10_000
const POLYGON_TYPES = new Set(['Polygon', 'MultiPolygon'])

export interface CountryProfileRecord {
  id: string
  country_code: string
  version: number
  name: string
  locale: string
  timezone: string
  administrative_levels: string[]
  source_name?: string | null
  source_url?: string | null
  effective_from: string
  status: 'draft' | 'active' | 'retired'
}

export interface CatalogInspection {
  payload: Record<string, unknown>
  featureCount: number
  propertyNames: string[]
  geometryTypes: string[]
  filename: string
}

export interface CatalogMapping {
  codeProperty: string
  nameProperty: string
  parentCodeProperty?: string
  parentLevelProperty?: string
  levelProperty?: string
  localTypeProperty?: string
  defaultLevel: number
  parentLevel: number
  defaultLocalType: string
}

export interface JurisdictionImportRecord {
  code: string
  name: string
  level: number
  local_type: string
  parent_code?: string
  parent_level?: number
  geometry: Record<string, unknown>
  metadata: { import_engine: 'control-g-catalog-v1' }
}

export interface JurisdictionImportResult {
  run_id: string
  mode: 'preview' | 'published'
  country_code: string
  base_profile_id: string
  base_version?: number
  next_version?: number
  target_profile_id?: string
  published_version?: number
  feature_count: number
  catalog_count?: number
  assigned_entities?: number
  imported_levels: number[]
  input_sha256: string
}

export interface JurisdictionImportRun {
  id: string
  country_code: string
  source_name: string
  source_version: string
  input_sha256: string
  feature_count: number
  imported_levels: number[]
  status: 'preview' | 'published'
  result_summary: Record<string, unknown>
  created_at: string
}

function asFeatureCollection(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('El archivo debe contener un objeto GeoJSON.')
  const payload = value as Record<string, unknown>
  if (payload.type !== 'FeatureCollection' || !Array.isArray(payload.features)) {
    throw new Error('El archivo debe ser un GeoJSON FeatureCollection.')
  }
  return { payload, features: payload.features as Array<Record<string, unknown>> }
}

export async function inspectCatalogFile(file: File): Promise<CatalogInspection> {
  if (file.size > MAX_CATALOG_BYTES) throw new Error('El catálogo supera 12 MiB. Simplifica el GeoJSON antes de importarlo.')
  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error('El archivo no contiene JSON válido.')
  }
  const { payload, features } = asFeatureCollection(parsed)
  if (!features.length || features.length > MAX_FEATURES) {
    throw new Error('El catálogo debe contener entre 1 y 10.000 polígonos.')
  }
  const properties = new Set<string>()
  const geometryTypes = new Set<string>()
  for (const feature of features) {
    if (feature.type !== 'Feature') throw new Error('Todos los elementos deben ser objetos GeoJSON Feature.')
    const geometry = feature.geometry as Record<string, unknown> | null
    const geometryType = String(geometry?.type || '')
    if (!POLYGON_TYPES.has(geometryType)) throw new Error('El catálogo solo admite geometrías Polygon o MultiPolygon.')
    geometryTypes.add(geometryType)
    const featureProperties = feature.properties
    if (featureProperties && typeof featureProperties === 'object' && !Array.isArray(featureProperties)) {
      Object.keys(featureProperties).slice(0, 200).forEach(key => properties.add(key))
    }
  }
  return {
    payload,
    featureCount: features.length,
    propertyNames: Array.from(properties).sort((a, b) => a.localeCompare(b)),
    geometryTypes: Array.from(geometryTypes).sort(),
    filename: file.name,
  }
}

function propertyValue(properties: Record<string, unknown>, key?: string) {
  if (!key) return ''
  const value = properties[key]
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}

export function guessCatalogProperty(propertyNames: string[], purpose: 'code' | 'name' | 'parent' | 'level' | 'type') {
  const patterns = {
    code: /^(code|codigo|c[oó]digo|cod|geocode|geocodigo|dane|id|gid|objectid)$/i,
    name: /^(name|nombre|nom|nam|label|etiqueta)$/i,
    parent: /^(parent|parent_code|codigo_padre|cod_padre|parentid)$/i,
    level: /^(level|nivel|admin_level|nivel_admin)$/i,
    type: /^(type|tipo|local_type|tipo_admin)$/i,
  }
  return propertyNames.find(name => patterns[purpose].test(name)) || ''
}

export function buildJurisdictionRecords(inspection: CatalogInspection, mapping: CatalogMapping) {
  if (!mapping.codeProperty || !mapping.nameProperty || !mapping.defaultLocalType.trim()) {
    throw new Error('Selecciona las propiedades de código y nombre, y define el tipo territorial.')
  }
  if (!Number.isInteger(mapping.defaultLevel) || mapping.defaultLevel < 0 || mapping.defaultLevel > 8) {
    throw new Error('El nivel predeterminado debe estar entre 0 y 8.')
  }
  const { features } = asFeatureCollection(inspection.payload)
  const unique = new Set<string>()
  const records: JurisdictionImportRecord[] = features.map((feature, index) => {
    const properties = feature.properties && typeof feature.properties === 'object' && !Array.isArray(feature.properties)
      ? feature.properties as Record<string, unknown>
      : {}
    const code = propertyValue(properties, mapping.codeProperty)
    const name = propertyValue(properties, mapping.nameProperty)
    const rawLevel = propertyValue(properties, mapping.levelProperty)
    const level = rawLevel ? Number(rawLevel) : mapping.defaultLevel
    const localType = propertyValue(properties, mapping.localTypeProperty) || mapping.defaultLocalType.trim()
    const parentCode = propertyValue(properties, mapping.parentCodeProperty)
    const rawParentLevel = propertyValue(properties, mapping.parentLevelProperty)
    const parentLevel = rawParentLevel ? Number(rawParentLevel) : mapping.parentLevel
    if (!code || !name) throw new Error(`La entidad geográfica ${index + 1} no tiene código o nombre.`)
    if (!Number.isInteger(level) || level < 0 || level > 8) throw new Error(`La entidad ${code} tiene un nivel fuera del rango 0–8.`)
    const uniqueKey = `${level}\u0000${code}`
    if (unique.has(uniqueKey)) throw new Error(`El código ${code} está repetido en el nivel ${level}.`)
    unique.add(uniqueKey)
    if (parentCode && (!Number.isInteger(parentLevel) || parentLevel < 0 || parentLevel >= level)) {
      throw new Error(`El nivel padre de ${code} debe ser menor que ${level}.`)
    }
    return {
      code: code.slice(0, 100),
      name: name.slice(0, 180),
      level,
      local_type: localType.slice(0, 80),
      ...(parentCode ? { parent_code: parentCode.slice(0, 100), parent_level: parentLevel } : {}),
      geometry: feature.geometry as Record<string, unknown>,
      metadata: { import_engine: 'control-g-catalog-v1' },
    }
  })
  const bytes = new Blob([JSON.stringify(records)]).size
  if (bytes > MAX_CATALOG_BYTES) throw new Error('El catálogo normalizado supera 12 MiB. Simplifica las geometrías.')
  return records
}

export async function loadCountryCatalogs() {
  const [profilesResult, runsResult] = await Promise.all([
    supabase.from('country_profiles').select('*').order('country_code').order('version', { ascending: false }),
    supabase.from('jurisdiction_import_runs').select('*').order('created_at', { ascending: false }).limit(100),
  ])
  if (profilesResult.error) throw profilesResult.error
  if (runsResult.error) throw runsResult.error
  return {
    profiles: profilesResult.data as CountryProfileRecord[],
    runs: runsResult.data as JurisdictionImportRun[],
  }
}

export async function countJurisdictions(countryProfileId: string) {
  const { count, error } = await supabase.from('jurisdictions')
    .select('id', { count: 'exact', head: true })
    .eq('country_profile_id', countryProfileId)
    .eq('status', 'active')
  if (error) throw error
  return count || 0
}

export async function runJurisdictionImport(input: {
  countryCode: string
  sourceName: string
  sourceUrl?: string
  sourceVersion: string
  effectiveFrom: string
  records: JurisdictionImportRecord[]
  publish: boolean
  assignActiveEntities: boolean
}) {
  const { data, error } = await supabase.rpc('import_jurisdiction_catalog', {
    p_country_code: input.countryCode,
    p_source_name: input.sourceName,
    p_source_url: input.sourceUrl?.trim() || null,
    p_source_version: input.sourceVersion,
    p_effective_from: input.effectiveFrom,
    p_records: input.records,
    p_publish: input.publish,
    p_assign_active_entities: input.assignActiveEntities,
  })
  if (error) throw error
  return data as JurisdictionImportResult
}
