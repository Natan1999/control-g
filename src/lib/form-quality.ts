import type { FormPage } from '@/types'

export type FormQualitySeverity = 'error' | 'warning' | 'recommendation'

export interface FormQualityIssue {
  code: string
  severity: FormQualitySeverity
  message: string
}

const PERSONAL_DATA_PATTERN = /(nombre|apellido|documento|c[eé]dula|tel[eé]fono|correo|direcci[oó]n|salud|diagn[oó]stico|discapacidad|niñ|menor|etnia)/i
const CONSENT_PATTERN = /(consent|autoriz|tratamiento de datos|habeas data)/i

export function analyzeFormQuality(pages: FormPage[]): FormQualityIssue[] {
  const issues: FormQualityIssue[] = []
  const fields = pages.flatMap(page => page.fields)
  const ids = fields.map(field => field.id.trim()).filter(Boolean)
  const duplicateIds = Array.from(new Set(ids.filter((id, index) => ids.indexOf(id) !== index)))
  const requiredCount = fields.filter(field => field.required).length

  if (!pages.length || !fields.length) {
    issues.push({ code: 'empty', severity: 'error', message: 'Agrega al menos una pregunta antes de publicar.' })
  }
  if (fields.some(field => !field.id.trim() || !field.label.trim())) {
    issues.push({ code: 'missing-label', severity: 'error', message: 'Todas las preguntas deben tener identificador y etiqueta.' })
  }
  if (duplicateIds.length) {
    issues.push({ code: 'duplicate-id', severity: 'error', message: `Corrige identificadores repetidos: ${duplicateIds.join(', ')}.` })
  }
  if (fields.some(field => ['select', 'multi_select', 'radio'].includes(field.type) && !field.options?.some(option => option.label.trim() && option.value.trim()))) {
    issues.push({ code: 'empty-options', severity: 'error', message: 'Las preguntas de selección necesitan opciones de respuesta válidas.' })
  }
  if (!fields.some(field => field.type === 'gps')) {
    issues.push({ code: 'gps', severity: 'warning', message: 'Incluye GPS para trazabilidad territorial y control de calidad.' })
  }
  if (!fields.some(field => field.type === 'municipality')) {
    issues.push({ code: 'territory', severity: 'recommendation', message: 'Incluye una unidad territorial normalizada para análisis y mapas.' })
  }
  if (!fields.some(field => field.type === 'photo' || field.type === 'file')) {
    issues.push({ code: 'evidence', severity: 'recommendation', message: 'Evalúa añadir evidencia cuando el protocolo de campo la requiera.' })
  }
  const hasPersonalData = fields.some(field => PERSONAL_DATA_PATTERN.test(`${field.id} ${field.label}`))
  const hasConsent = fields.some(field => CONSENT_PATTERN.test(`${field.id} ${field.label}`))
  if (hasPersonalData && !hasConsent) {
    issues.push({ code: 'consent', severity: 'warning', message: 'El instrumento parece tratar datos personales y no contiene consentimiento informado.' })
  }
  if (fields.length > 0 && requiredCount / fields.length > 0.8) {
    issues.push({ code: 'required-density', severity: 'recommendation', message: 'Más del 80 % de las preguntas son obligatorias; valida que no afecte la calidad en campo.' })
  }
  if (fields.length > 80) {
    issues.push({ code: 'length', severity: 'recommendation', message: 'El formulario supera 80 preguntas; considera dividirlo en momentos o módulos.' })
  }

  return issues
}

export function formQualityScore(pages: FormPage[]) {
  const issues = analyzeFormQuality(pages)
  const penalty = issues.reduce((total, issue) => total + (issue.severity === 'error' ? 25 : issue.severity === 'warning' ? 12 : 5), 0)
  return Math.max(0, 100 - penalty)
}
