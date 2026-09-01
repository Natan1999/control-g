import type {
  AnalyticsDistributionItem,
  AnalyticsFilters,
  AnalyticsKpi,
  AnalyticsReport,
  AnalyticsTerritoryItem,
  AnalyticsTimelineItem,
  AnalyticsVariable,
  IndicatorDefinition,
} from '@/types/analytics'

const SENSITIVE_FIELD_PATTERN = /(nombre|apellido|(^|_)(full|first|last)_?name($|_)|document|cedula|identific|telefono|celular|phone|correo|email|direccion|address|firma|signature|foto|photo|archivo|file|victima|salud|health|diagnost|menor|niñ|etnia|discapacidad)/i
const NON_ANALYTIC_TYPES = new Set(['photo', 'signature', 'document', 'file', 'geolocation', 'gps', 'section_title', 'note'])
const REVIEWED_STATUSES = new Set(['reviewed', 'approved', 'rejected'])
const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', pending: 'Pendiente', queued: 'Pendiente de sincronizar',
  synced: 'Sincronizado', reviewed: 'Revisado', approved: 'Aprobado', rejected: 'Rechazado',
}
export const ANALYTICS_METHODOLOGY_VERSION = 'control-g-analytics-v1'

interface FieldMetadata {
  id: string
  label: string
  type: string
  required: boolean
  sensitive: boolean
}

interface NormalizedResponse {
  id: string
  formId: string
  municipalityId: string
  status: string
  capturedAt: string
  syncedAt: string
  latitude: number | null
  longitude: number | null
  answers: Record<string, unknown>
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value && typeof value === 'object') return value as T
  if (typeof value !== 'string' || !value.trim()) return fallback
  try { return JSON.parse(value) as T } catch { return fallback }
}

function flattenFields(value: unknown): FieldMetadata[] {
  const pages = parseJson<any[]>(value, [])
  const output: FieldMetadata[] = []
  const visit = (field: any) => {
    if (!field?.id) return
    const type = String(field.type || 'text')
    const label = String(field.label || field.id)
    output.push({
      id: String(field.id),
      label,
      type,
      required: Boolean(field.required),
      sensitive: Boolean(field.sensitive) || SENSITIVE_FIELD_PATTERN.test(`${field.id} ${label}`),
    })
    if (Array.isArray(field.fields)) field.fields.forEach(visit)
  }
  for (const page of pages) {
    for (const field of Array.isArray(page?.fields) ? page.fields : []) visit(field)
  }
  return output
}

function nonEmpty(value: unknown) {
  if (value === null || value === undefined || value === '') return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value as object).length > 0
  return true
}

function normalizeResponse(row: any): NormalizedResponse {
  const answers = parseJson<Record<string, unknown>>(row.answers ?? row.answers_json, {})
  const metadata = (answers._metadata && typeof answers._metadata === 'object')
    ? answers._metadata as Record<string, unknown>
    : {}
  const numberOrNull = (value: unknown) => {
    const parsed = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return {
    id: String(row.$id || row.id),
    formId: String(row.form_id || ''),
    municipalityId: String(row.municipality_id || ''),
    status: String(row.status || 'synced'),
    capturedAt: String(row.captured_at || row.$createdAt || row.created_at || new Date(0).toISOString()),
    syncedAt: String(row.synced_at || row.$updatedAt || row.updated_at || ''),
    latitude: numberOrNull(row.latitude ?? metadata.lat ?? metadata.latitude),
    longitude: numberOrNull(row.longitude ?? metadata.lng ?? metadata.longitude),
    answers,
  }
}

function validCoordinate(response: NormalizedResponse) {
  if (response.latitude === null || response.longitude === null) return false
  if (response.latitude === 0 && response.longitude === 0) return false
  return response.latitude >= -90 && response.latitude <= 90
    && response.longitude >= -180 && response.longitude <= 180
}

function percentage(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 10_000) / 100 : 0
}

function median(values: number[]) {
  if (!values.length) return 0
  const ordered = [...values].sort((a, b) => a - b)
  const middle = Math.floor(ordered.length / 2)
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2
}

function responseWithinFilters(response: NormalizedResponse, filters: AnalyticsFilters) {
  if (filters.formId && response.formId !== filters.formId) return false
  if (filters.municipalityId && response.municipalityId !== filters.municipalityId) return false
  if (filters.status && response.status !== filters.status) return false
  const captured = new Date(response.capturedAt).getTime()
  if (filters.from && captured < new Date(`${filters.from}T00:00:00`).getTime()) return false
  if (filters.to && captured > new Date(`${filters.to}T23:59:59.999`).getTime()) return false
  return true
}

function distribution(values: unknown[], minimumGroupSize: number): AnalyticsDistributionItem[] {
  const counts = new Map<string, number>()
  for (const rawValue of values) {
    const items = Array.isArray(rawValue) ? rawValue : [rawValue]
    for (const value of items) {
      if (!nonEmpty(value)) continue
      const label = typeof value === 'object' ? JSON.stringify(value) : String(value)
      counts.set(label, (counts.get(label) || 0) + 1)
    }
  }
  const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0)
  const visible: AnalyticsDistributionItem[] = []
  let suppressedCount = 0
  for (const [label, count] of counts) {
    if (count < minimumGroupSize) suppressedCount += count
    else visible.push({ label, count, percentage: percentage(count, total), suppressed: false })
  }
  if (suppressedCount > 0) {
    visible.push({
      label: 'Categorías pequeñas agrupadas',
      count: suppressedCount,
      percentage: percentage(suppressedCount, total),
      suppressed: true,
    })
  }
  return visible.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

function formFieldMap(forms: any[]) {
  const map = new Map<string, FieldMetadata[]>()
  for (const form of forms) map.set(String(form.$id || form.id), flattenFields(form.definition || form.pages_json))
  return map
}

export function listAnalyticsVariables(forms: any[], responses: any[]): AnalyticsVariable[] {
  const fieldsByForm = formFieldMap(forms)
  const byKey = new Map<string, AnalyticsVariable>()
  for (const form of forms) {
    const formId = String(form.$id || form.id)
    for (const field of fieldsByForm.get(formId) || []) {
      if (NON_ANALYTIC_TYPES.has(field.type) || field.sensitive) continue
      byKey.set(`${formId}:${field.id}`, { key: field.id, label: field.label, formId, sensitive: false })
    }
  }
  for (const row of responses) {
    const response = normalizeResponse(row)
    const sensitiveFieldIds = new Set((fieldsByForm.get(response.formId) || []).filter(field => field.sensitive).map(field => field.id))
    for (const key of Object.keys(response.answers)) {
      if (key === '_metadata' || sensitiveFieldIds.has(key) || SENSITIVE_FIELD_PATTERN.test(key)) continue
      const composite = `${response.formId}:${key}`
      if (!byKey.has(composite)) byKey.set(composite, { key, label: key.replace(/_/g, ' '), formId: response.formId, sensitive: false })
    }
  }
  return Array.from(byKey.values()).sort((a, b) => a.label.localeCompare(b.label, 'es'))
}

export function normalizeIndicatorDefinition(row: any): IndicatorDefinition {
  return {
    id: String(row.$id || row.id),
    entityId: row.entity_id || null,
    code: String(row.code),
    version: Number(row.version || 1),
    name: String(row.name),
    question: String(row.question),
    description: row.description || undefined,
    category: String(row.category || 'operational'),
    sourceTable: row.source_table || 'form_responses',
    calculationType: row.calculation_type || 'count',
    numerator: parseJson(row.numerator, {}),
    denominator: parseJson(row.denominator, {}),
    filters: parseJson(row.filters, {}),
    unit: String(row.unit || 'count'),
    nullHandling: row.null_handling || 'exclude',
    territoryLevel: String(row.territory_level || 'entity'),
    minimumGroupSize: Number(row.minimum_group_size || 5),
    methodology: String(row.methodology || ''),
    warning: row.warning || undefined,
    status: row.status || 'draft',
  }
}

export function buildAnalyticsReport(input: {
  entityId: string
  entityName: string
  forms: any[]
  responses: any[]
  municipalities: any[]
  filters: AnalyticsFilters
  minimumGroupSize?: number
}): AnalyticsReport {
  const minimumGroupSize = Math.max(1, input.minimumGroupSize || 5)
  const normalized = input.responses.map(normalizeResponse)
    .filter(response => responseWithinFilters(response, input.filters))
  const fieldsByForm = formFieldMap(input.forms)
  const total = normalized.length
  const mapped = normalized.filter(validCoordinate).length
  const reviewed = normalized.filter(response => REVIEWED_STATUSES.has(response.status)).length
  const approved = normalized.filter(response => response.status === 'approved').length
  const rejected = normalized.filter(response => response.status === 'rejected').length
  const syncLags = normalized.flatMap(response => {
    const captured = new Date(response.capturedAt).getTime()
    const synced = new Date(response.syncedAt).getTime()
    return Number.isFinite(captured) && Number.isFinite(synced) && synced >= captured
      ? [(synced - captured) / 60_000]
      : []
  })
  const completenessValues = normalized.flatMap(response => {
    const required = (fieldsByForm.get(response.formId) || []).filter(field => field.required)
    if (!required.length) return []
    return [percentage(required.filter(field => nonEmpty(response.answers[field.id])).length, required.length)]
  })
  const averageCompleteness = completenessValues.length
    ? completenessValues.reduce((sum, value) => sum + value, 0) / completenessValues.length
    : 0

  const kpis: AnalyticsKpi[] = [
    { code: 'records', label: 'Registros del corte', value: total, display: String(total), unit: 'count', methodology: 'Conteo de respuestas que cumplen los filtros seleccionados.' },
    { code: 'gps_coverage', label: 'Cobertura GPS', value: percentage(mapped, total), display: `${percentage(mapped, total).toFixed(1)}%`, unit: 'percent', methodology: 'Coordenadas válidas y diferentes de 0/0 sobre respuestas del corte.', warning: 'GPS disponible no prueba por sí solo la presencia en el lugar esperado.' },
    { code: 'reviewed_share', label: 'Revisión', value: percentage(reviewed, total), display: `${percentage(reviewed, total).toFixed(1)}%`, unit: 'percent', methodology: 'Registros revisados, aprobados o rechazados sobre el total.' },
    { code: 'approved_share', label: 'Aprobación', value: percentage(approved, reviewed), display: `${percentage(approved, reviewed).toFixed(1)}%`, unit: 'percent', methodology: 'Registros aprobados sobre los registros que ya pasaron por revisión.' },
    { code: 'rejected_share', label: 'Rechazo', value: percentage(rejected, reviewed), display: `${percentage(rejected, reviewed).toFixed(1)}%`, unit: 'percent', methodology: 'Registros rechazados sobre los registros que ya pasaron por revisión.' },
    { code: 'required_completeness', label: 'Completitud obligatoria', value: averageCompleteness, display: `${averageCompleteness.toFixed(1)}%`, unit: 'percent', methodology: 'Promedio de campos obligatorios no vacíos según la definición de cada formulario.' },
    { code: 'median_sync_lag', label: 'Mediana de sincronización', value: median(syncLags), display: `${median(syncLags).toFixed(1)} min`, unit: 'minutes', methodology: 'Mediana de minutos no negativos entre captura y sincronización.' },
  ]

  const statusDistribution = distribution(normalized.map(response => STATUS_LABELS[response.status] || response.status), 1)
  const dates = new Map<string, AnalyticsTimelineItem>()
  for (const response of normalized) {
    const date = response.capturedAt.slice(0, 10)
    const item = dates.get(date) || { date, total: 0, mapped: 0, reviewed: 0 }
    item.total += 1
    if (validCoordinate(response)) item.mapped += 1
    if (REVIEWED_STATUSES.has(response.status)) item.reviewed += 1
    dates.set(date, item)
  }
  const timeline = Array.from(dates.values()).sort((a, b) => a.date.localeCompare(b.date))

  const municipalityMap = new Map(input.municipalities.map(municipality => [
    String(municipality.$id || municipality.id),
    municipality,
  ]))
  const territoryGroups = new Map<string, NormalizedResponse[]>()
  for (const response of normalized) {
    const key = response.municipalityId || '__unassigned__'
    territoryGroups.set(key, [...(territoryGroups.get(key) || []), response])
  }
  const territories: AnalyticsTerritoryItem[] = Array.from(territoryGroups, ([id, records]) => {
    const municipality: any = municipalityMap.get(id)
    const target = Number(municipality?.families_target || 0)
    const groupMapped = records.filter(validCoordinate).length
    const groupReviewed = records.filter(response => REVIEWED_STATUSES.has(response.status)).length
    return {
      id,
      name: municipality?.municipality_name || 'Sin territorio asignado',
      target,
      total: records.length,
      mapped: groupMapped,
      reviewed: groupReviewed,
      rejected: records.filter(response => response.status === 'rejected').length,
      coveragePercent: target > 0 ? percentage(records.length, target) : null,
      gpsPercent: percentage(groupMapped, records.length),
      suppressed: records.length < minimumGroupSize,
    }
  }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'es'))

  const variables = listAnalyticsVariables(input.forms, input.responses)
  const selectedVariable = variables.find(variable => `${variable.formId || ''}:${variable.key}` === input.filters.variableKey)
  const thematicValues = selectedVariable
    ? normalized
      .filter(response => !selectedVariable.formId || response.formId === selectedVariable.formId)
      .map(response => response.answers[selectedVariable.key])
    : []
  const thematicDistribution = distribution(thematicValues, minimumGroupSize)

  const warnings = [
    'Los resultados son descriptivos y no demuestran causalidad.',
    `Las categorías con menos de ${minimumGroupSize} registros se suprimen en variables temáticas.`,
  ]
  if (!total) warnings.push('No existen respuestas para los filtros seleccionados.')
  if (completenessValues.length < total) warnings.push('Algunas respuestas no tienen una definición de formulario utilizable para calcular completitud.')

  return {
    entityId: input.entityId,
    entityName: input.entityName,
    cutoffAt: new Date().toISOString(),
    filters: input.filters,
    methodologyVersion: ANALYTICS_METHODOLOGY_VERSION,
    recordCount: total,
    kpis,
    statusDistribution,
    timeline,
    territories,
    thematicVariable: selectedVariable,
    thematicDistribution,
    warnings,
  }
}
