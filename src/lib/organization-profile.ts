export const ENTITY_KIND_OPTIONS = [
  { value: 'municipality', label: 'Alcaldía o gobierno local', defaultUnit: 'family', defaultCoverage: 'administrative' },
  { value: 'public_entity', label: 'Entidad pública', defaultUnit: 'record', defaultCoverage: 'administrative' },
  { value: 'private_company', label: 'Empresa privada', defaultUnit: 'establishment', defaultCoverage: 'operational_zones' },
  { value: 'ngo', label: 'ONG, fundación o asociación', defaultUnit: 'family', defaultCoverage: 'administrative' },
  { value: 'education', label: 'Universidad o centro de investigación', defaultUnit: 'record', defaultCoverage: 'administrative' },
  { value: 'operator', label: 'Operador o contratista', defaultUnit: 'record', defaultCoverage: 'operational_zones' },
] as const

export type EntityKind = typeof ENTITY_KIND_OPTIONS[number]['value']
export type CoverageMode = 'administrative' | 'operational_zones'
export type CaptureUnit = 'family' | 'establishment' | 'asset' | 'record'

export const CAPTURE_UNIT_OPTIONS: Array<{ value: CaptureUnit; label: string; singular: string; plural: string }> = [
  { value: 'family', label: 'Hogares y familias', singular: 'familia', plural: 'familias' },
  { value: 'establishment', label: 'Clientes y establecimientos', singular: 'establecimiento', plural: 'establecimientos' },
  { value: 'asset', label: 'Activos e instalaciones', singular: 'activo', plural: 'activos' },
  { value: 'record', label: 'Registros de campo', singular: 'registro', plural: 'registros' },
]

export const ORGANIZATION_SECTOR_OPTIONS = [
  { value: 'public_programs', label: 'Gobierno y programas públicos' },
  { value: 'fuels', label: 'Combustibles, lubricantes y estaciones' },
  { value: 'food_distribution', label: 'Distribución de alimentos y bebidas' },
  { value: 'retail', label: 'Comercio, tiendas y consumo masivo' },
  { value: 'utilities', label: 'Servicios públicos y mantenimiento' },
  { value: 'agriculture', label: 'Agro y asistencia rural' },
  { value: 'construction', label: 'Construcción e interventoría' },
  { value: 'logistics', label: 'Logística y entregas' },
  { value: 'social', label: 'Gestión social y acompañamiento' },
  { value: 'research', label: 'Investigación y educación' },
  { value: 'other', label: 'Otra actividad' },
] as const

export type OrganizationSector = typeof ORGANIZATION_SECTOR_OPTIONS[number]['value']
export interface OrganizationRegionalSettings extends Record<string, unknown> {
  entity_kind?: EntityKind
  organization_sector?: OrganizationSector
  capture_unit?: CaptureUnit
  coverage_mode?: CoverageMode
}

export function organizationKind(value: unknown) {
  return ENTITY_KIND_OPTIONS.find(option => option.value === value) || ENTITY_KIND_OPTIONS[0]
}

/** Legacy entities keep the municipal/family interpretation until configured. */
export function getOrganizationProfile(settings: unknown) {
  const source = settings && typeof settings === 'object' && !Array.isArray(settings) ? settings as Record<string, unknown> : {}
  const kind = organizationKind(source.entity_kind)
  const unit = CAPTURE_UNIT_OPTIONS.find(option => option.value === source.capture_unit)
    || CAPTURE_UNIT_OPTIONS.find(option => option.value === kind.defaultUnit)!
  const sector = ORGANIZATION_SECTOR_OPTIONS.find(option => option.value === source.organization_sector)
    || ORGANIZATION_SECTOR_OPTIONS.find(option => option.value === (kind.value === 'municipality' || kind.value === 'public_entity' ? 'public_programs' : 'other'))!
  const coverageMode: CoverageMode = source.coverage_mode === 'administrative' || source.coverage_mode === 'operational_zones'
    ? source.coverage_mode : kind.defaultCoverage
  return { kind: kind.value, kindLabel: kind.label, sector: sector.value, sectorLabel: sector.label, unit: unit.value, unitLabel: unit.label, unitSingular: unit.singular, unitPlural: unit.plural, coverageMode }
}

export function organizationCacheValue(entity: Record<string, unknown>) {
  const profile = getOrganizationProfile(entity.regional_settings)
  return { version: 1, name: String(entity.name || ''), countryCode: String(entity.country_code || 'CO'), region: String(entity.department || ''), settings: {
    entity_kind: profile.kind, organization_sector: profile.sector,
    capture_unit: profile.unit, coverage_mode: profile.coverageMode,
  } }
}

export function parseOperationalZones(value: string) {
  const seen = new Set<string>()
  return value.split(/[\n;]/).map(name => name.normalize('NFKC').trim().replace(/\s+/g, ' ')).filter(name => {
    const key = name.toLocaleLowerCase('es')
    if (!name || seen.has(key)) return false
    seen.add(key)
    return true
  }).map(name => ({ id: '', name }))
}

export function validateOrganizationSettings(settings: Pick<OrganizationRegionalSettings, 'entity_kind' | 'organization_sector' | 'capture_unit' | 'coverage_mode'>) {
  if (!ENTITY_KIND_OPTIONS.some(option => option.value === settings.entity_kind)) return 'Selecciona un tipo de organización válido.'
  if (!ORGANIZATION_SECTOR_OPTIONS.some(option => option.value === settings.organization_sector)) return 'Selecciona un sector de actividad válido.'
  if (!CAPTURE_UNIT_OPTIONS.some(option => option.value === settings.capture_unit)) return 'Selecciona una unidad de registro válida.'
  if (!['administrative', 'operational_zones'].includes(settings.coverage_mode || '')) return 'Selecciona una cobertura válida.'
  return null
}

export function validateOperationTerritories(territories: Array<{ name: string }>) {
  if (territories.length < 1 || territories.length > 500) return 'Agrega entre 1 y 500 territorios o zonas de operación.'
  if (territories.some(item => !item.name.trim() || item.name.length > 160 || Array.from(item.name).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127))) return 'Cada zona necesita un nombre de hasta 160 caracteres, sin caracteres de control.'
  if (new Set(territories.map(item => item.name.trim().normalize('NFKC').toLocaleLowerCase('es'))).size !== territories.length) return 'Las zonas de operación no pueden estar duplicadas.'
  return null
}
