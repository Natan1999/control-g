export type AnalyticsSourceTable = 'form_responses' | 'families' | 'activities'
export type IndicatorCalculation = 'count' | 'ratio' | 'average' | 'median' | 'distribution'

export interface IndicatorDefinition {
  id: string
  entityId: string | null
  code: string
  version: number
  name: string
  question: string
  description?: string
  category: string
  sourceTable: AnalyticsSourceTable
  calculationType: IndicatorCalculation
  numerator: Record<string, unknown>
  denominator: Record<string, unknown>
  filters: Record<string, unknown>
  unit: string
  nullHandling: 'exclude' | 'zero' | 'category'
  territoryLevel: string
  minimumGroupSize: number
  methodology: string
  warning?: string
  status: 'draft' | 'published' | 'archived'
}

export interface AnalyticsFilters {
  formId: string
  municipalityId: string
  status: string
  from: string
  to: string
  variableKey: string
}

export interface AnalyticsVariable {
  key: string
  label: string
  formId?: string
  sensitive: boolean
}

export interface AnalyticsKpi {
  code: string
  label: string
  value: number
  display: string
  unit: 'count' | 'percent' | 'minutes'
  methodology: string
  warning?: string
}

export interface AnalyticsDistributionItem {
  label: string
  count: number
  percentage: number
  suppressed: boolean
}

export interface AnalyticsTimelineItem {
  date: string
  total: number
  mapped: number
  reviewed: number
}

export interface AnalyticsTerritoryItem {
  id: string
  name: string
  target: number
  total: number
  mapped: number
  reviewed: number
  rejected: number
  coveragePercent: number | null
  gpsPercent: number
  suppressed: boolean
}

export interface AnalyticsReport {
  entityId: string
  entityName: string
  cutoffAt: string
  filters: AnalyticsFilters
  methodologyVersion: string
  recordCount: number
  kpis: AnalyticsKpi[]
  statusDistribution: AnalyticsDistributionItem[]
  timeline: AnalyticsTimelineItem[]
  territories: AnalyticsTerritoryItem[]
  thematicVariable?: AnalyticsVariable
  thematicDistribution: AnalyticsDistributionItem[]
  warnings: string[]
}
