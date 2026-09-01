import type { FormPage } from '@/types'

export type FormQualitySeverity = 'error' | 'warning' | 'recommendation'

export interface FormQualityIssue {
  code: string
  severity: FormQualitySeverity
  message: string
}

export interface FormPrivacyCheck {
  code: string
  label: string
  passed: boolean
  detail: string
}

const PERSONAL_DATA_PATTERN = /(nombre|apellido|documento|c[eé]dula|tel[eé]fono|correo|direcci[oó]n|salud|diagn[oó]stico|discapacidad|niñ|menor|etnia)/i
const CONSENT_PATTERN = /(consent|autoriz|tratamiento de datos|habeas data)/i
const LATAM_COUNTRY_CODES = new Set(['AR', 'BO', 'BR', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GT', 'HN', 'MX', 'NI', 'PA', 'PY', 'PE', 'PR', 'UY', 'VE'])

export function analyzeFormQuality(pages: FormPage[]): FormQualityIssue[] {
  const issues: FormQualityIssue[] = []
  const fields = pages.flatMap(page => page.fields)
  const ids = fields.map(field => field.id.trim()).filter(Boolean)
  const fieldIndex = new Map(fields.map((field, index) => [field.id, index]))
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
  if (fields.some(field => ['select', 'multi_select', 'radio', 'checkbox', 'matrix'].includes(field.type) && !field.options?.some(option => option.label.trim() && option.value.trim()))) {
    issues.push({ code: 'empty-options', severity: 'error', message: 'Las preguntas de selección necesitan opciones de respuesta válidas.' })
  }
  if (fields.some(field => field.type === 'matrix' && !field.matrixRows?.some(row => row.label.trim() && row.value.trim()))) {
    issues.push({ code: 'empty-matrix-rows', severity: 'error', message: 'Cada matriz necesita al menos una fila válida.' })
  }
  if (fields.some(field => {
    const values = field.matrixRows?.map(row => row.value.trim()).filter(Boolean) || []
    return values.length !== new Set(values).size
  })) {
    issues.push({ code: 'duplicate-matrix-rows', severity: 'error', message: 'Hay matrices con filas repetidas; cada valor de fila debe ser único.' })
  }
  if (fields.some(field => {
    const values = field.options?.map(option => option.value.trim()).filter(Boolean) || []
    return values.length !== new Set(values).size
  })) {
    issues.push({ code: 'duplicate-options', severity: 'error', message: 'Hay preguntas con opciones repetidas; cada valor debe ser único.' })
  }
  fields.forEach(field => {
    const pattern = field.validationRules?.pattern || field.validation
    if (pattern) {
      try {
        new RegExp(pattern)
      } catch {
        issues.push({ code: `invalid-pattern-${field.id}`, severity: 'error', message: `La expresión de validación de “${field.label}” no es válida.` })
      }
    }
    const { min, max, minLength, maxLength } = field.validationRules || {}
    if ((min !== undefined && max !== undefined && min > max) || (minLength !== undefined && maxLength !== undefined && minLength > maxLength)) {
      issues.push({ code: `invalid-range-${field.id}`, severity: 'error', message: `Los límites configurados en “${field.label}” son inconsistentes.` })
    }
    if (field.sensitive && !field.sensitiveJustification?.trim()) {
      issues.push({ code: `sensitive-justification-${field.id}`, severity: 'error', message: `Justifica por qué “${field.label}” necesita recolectar información sensible.` })
    }
    if (field.type === 'currency' && !/^[A-Z]{3}$/.test(field.currencyCode || 'COP')) {
      issues.push({ code: `currency-code-${field.id}`, severity: 'error', message: `La moneda de “${field.label}” debe usar un código ISO de tres letras, por ejemplo COP o USD.` })
    }
    if (field.type === 'audio' && ((field.maxDurationSeconds ?? 300) < 10 || (field.maxDurationSeconds ?? 300) > 1_800)) {
      issues.push({ code: `audio-duration-${field.id}`, severity: 'error', message: `La duración de “${field.label}” debe estar entre 10 y 1.800 segundos.` })
    }
    if (field.validationProfile && !LATAM_COUNTRY_CODES.has((field.validationCountryCode || '').toUpperCase())) {
      issues.push({ code: `validation-country-${field.id}`, severity: 'error', message: `Selecciona un país LATAM válido para la regla de “${field.label}”.` })
    }
    if (PERSONAL_DATA_PATTERN.test(`${field.id} ${field.label}`) && !field.sensitive) {
      issues.push({ code: `unclassified-sensitive-${field.id}`, severity: 'warning', message: `Clasifica “${field.label}” como dato sensible/personal o confirma que no lo es.` })
    }
    const rule = field.visibilityLogic
    if (rule) {
      const sourcePosition = fieldIndex.get(rule.fieldId)
      const targetPosition = fieldIndex.get(field.id)
      if (sourcePosition === undefined) {
        issues.push({ code: `logic-missing-source-${field.id}`, severity: 'error', message: `La condición de “${field.label}” referencia una pregunta que no existe.` })
      } else if (rule.fieldId === field.id || (targetPosition !== undefined && sourcePosition >= targetPosition)) {
        issues.push({ code: `logic-order-${field.id}`, severity: 'error', message: `La condición de “${field.label}” debe depender de una pregunta anterior para funcionar offline.` })
      }
      if (!['is_empty', 'is_not_empty'].includes(rule.operator) && (rule.value === undefined || rule.value === '')) {
        issues.push({ code: `logic-value-${field.id}`, severity: 'error', message: `Completa el valor de la condición de “${field.label}”.` })
      }
    }
    if (field.type === 'calculation') {
      const dependencies = Array.from(field.calculation?.matchAll(/\{\{\s*([A-Za-z0-9_-]+)\s*\}\}/g) || []).map(match => match[1])
      if (!field.calculation?.trim() || dependencies.length === 0) {
        issues.push({ code: `calculation-empty-${field.id}`, severity: 'error', message: `El cálculo “${field.label}” necesita una fórmula con referencias como {{campo}}.` })
      } else if (dependencies.some(dependency => !fieldIndex.has(dependency) || (fieldIndex.get(dependency) ?? 0) >= (fieldIndex.get(field.id) ?? 0))) {
        issues.push({ code: `calculation-dependency-${field.id}`, severity: 'error', message: `El cálculo “${field.label}” solo puede usar preguntas numéricas anteriores.` })
      }
    }
  })
  if (!fields.some(field => field.type === 'gps')) {
    issues.push({ code: 'gps', severity: 'warning', message: 'Incluye GPS para trazabilidad territorial y control de calidad.' })
  }
  if (!fields.some(field => field.type === 'municipality')) {
    issues.push({ code: 'territory', severity: 'recommendation', message: 'Incluye una unidad territorial normalizada para análisis y mapas.' })
  }
  if (fields.some(field => field.type === 'geotrace' || field.type === 'geoshape') && !fields.some(field => field.type === 'gps')) {
    issues.push({ code: 'geometry-anchor', severity: 'recommendation', message: 'Combina líneas o polígonos con un punto GPS principal para facilitar control de calidad y búsqueda territorial.' })
  }
  if (!fields.some(field => field.type === 'photo' || field.type === 'file' || field.type === 'audio')) {
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

  const translatedLocales = new Set<string>()
  pages.forEach(page => {
    Object.keys(page.translations || {}).forEach(locale => translatedLocales.add(locale))
    page.fields.forEach(field => Object.keys(field.translations || {}).forEach(locale => translatedLocales.add(locale)))
  })
  translatedLocales.forEach(locale => {
    const missingPages = pages.filter(page => !page.translations?.[locale]?.title?.trim()).length
    const missingFields = fields.filter(field => !field.translations?.[locale]?.label?.trim()).length
    if (missingPages || missingFields) {
      issues.push({ code: `translation-incomplete-${locale}`, severity: 'warning', message: `La traducción ${locale} está incompleta: faltan ${missingPages} página(s) y ${missingFields} etiqueta(s).` })
    }
  })

  return issues
}

export function buildFormPrivacyChecklist(pages: FormPage[]): FormPrivacyCheck[] {
  const fields = pages.flatMap(page => page.fields)
  const personalFields = fields.filter(field => PERSONAL_DATA_PATTERN.test(`${field.id} ${field.label}`) || field.sensitive)
  const hasConsent = fields.some(field => CONSENT_PATTERN.test(`${field.id} ${field.label}`))
  const unjustified = fields.filter(field => field.sensitive && !field.sensitiveJustification?.trim())
  const unclassified = personalFields.filter(field => !field.sensitive)

  return [
    {
      code: 'purpose',
      label: 'Finalidad y minimización',
      passed: unjustified.length === 0,
      detail: unjustified.length ? `${unjustified.length} campo(s) sensible(s) no tienen justificación.` : 'Los campos sensibles declarados tienen una finalidad documentada.',
    },
    {
      code: 'classification',
      label: 'Clasificación de datos',
      passed: unclassified.length === 0,
      detail: unclassified.length ? `${unclassified.length} posible(s) dato(s) personal(es) requieren clasificación.` : 'No hay posibles datos personales sin clasificar.',
    },
    {
      code: 'consent',
      label: 'Consentimiento informado',
      passed: personalFields.length === 0 || hasConsent,
      detail: personalFields.length === 0 || hasConsent ? 'El instrumento incluye consentimiento o no trata datos personales detectables.' : 'Agrega autorización de tratamiento y consentimiento aplicable al país.',
    },
    {
      code: 'offline',
      label: 'Protección offline',
      passed: !fields.some(field => field.type === 'file' && (field.maxFileSizeMb ?? 5) > 15),
      detail: 'El APK conserva borradores localmente y los envía por la cola de sincronización al recuperar conexión.',
    },
  ]
}

export function formQualityScore(pages: FormPage[]) {
  const issues = analyzeFormQuality(pages)
  const penalty = issues.reduce((total, issue) => total + (issue.severity === 'error' ? 25 : issue.severity === 'warning' ? 12 : 5), 0)
  return Math.max(0, 100 - penalty)
}
