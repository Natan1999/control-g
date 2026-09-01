import type { FormField, FormFieldTranslation, FormPage, FormValidationProfile } from '@/types'

export interface FormOfflineEstimate {
  definitionBytes: number
  estimatedSubmissionBytes: number
  mediaFields: number
  risk: 'low' | 'medium' | 'high'
  riskLabel: string
}

export function isEmptyFormValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  return false
}

const NATIONAL_ID_PATTERNS: Record<string, RegExp> = {
  AR: /^\d{7,8}$/,
  BO: /^[A-Z0-9]{5,12}$/,
  BR: /^\d{11}(\d{3})?$/,
  CL: /^\d{7,8}[0-9K]$/,
  CO: /^\d{6,10}$/,
  CR: /^\d{9,12}$/,
  CU: /^\d{11}$/,
  DO: /^\d{11}$/,
  EC: /^\d{10}$/,
  SV: /^\d{9}$/,
  GT: /^\d{13}$/,
  HN: /^\d{13}$/,
  MX: /^([A-Z]{4}\d{6}[A-Z]{6}[A-Z0-9]\d|[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3})$/,
  NI: /^[A-Z0-9]{13,16}$/,
  PA: /^[A-Z0-9]{4,20}$/,
  PY: /^\d{5,10}$/,
  PE: /^[A-Z0-9]{8,12}$/,
  PR: /^\d{9}$/,
  UY: /^\d{7,8}$/,
  VE: /^[VEJPG]?\d{6,10}$/,
}

const POSTAL_CODE_PATTERNS: Record<string, RegExp> = {
  AR: /^[A-Z]?\d{4}[A-Z]{0,3}$/,
  BO: /^\d{4}$/,
  BR: /^\d{8}$/,
  CL: /^\d{7}$/,
  CO: /^\d{6}$/,
  CR: /^\d{5}$/,
  CU: /^\d{5}$/,
  DO: /^\d{5}$/,
  EC: /^\d{6}$/,
  SV: /^\d{4}$/,
  GT: /^\d{5}$/,
  HN: /^\d{5}$/,
  MX: /^\d{5}$/,
  NI: /^\d{5}$/,
  PA: /^\d{4}$/,
  PY: /^\d{4}$/,
  PE: /^\d{5}$/,
  PR: /^\d{5}(\d{4})?$/,
  UY: /^\d{5}$/,
  VE: /^\d{4}$/,
}

const PHONE_LENGTHS: Record<string, [number, number]> = {
  AR: [10, 13], BO: [8, 11], BR: [10, 13], CL: [9, 12], CO: [10, 12], CR: [8, 11],
  CU: [8, 11], DO: [10, 11], EC: [9, 12], SV: [8, 11], GT: [8, 11], HN: [8, 11],
  MX: [10, 12], NI: [8, 11], PA: [7, 11], PY: [9, 12], PE: [9, 12], PR: [10, 11],
  UY: [8, 11], VE: [10, 12],
}

export function validateLatamProfile(
  profile: FormValidationProfile,
  value: unknown,
  countryCode = 'CO',
): string | null {
  const country = countryCode.toUpperCase()
  const raw = String(value ?? '').trim().toUpperCase()
  if (!raw) return null
  if (profile === 'phone_latam') {
    const digits = raw.replace(/\D/g, '')
    const [minimum, maximum] = PHONE_LENGTHS[country] || [7, 15]
    return digits.length >= minimum && digits.length <= maximum
      ? null
      : `El teléfono no cumple la longitud esperada para ${country}`
  }
  const normalized = raw.replace(/[.\s-]/g, '')
  const pattern = profile === 'postal_code'
    ? POSTAL_CODE_PATTERNS[country]
    : NATIONAL_ID_PATTERNS[country]
  if (!pattern) return normalized.length >= 4 && normalized.length <= 20
    ? null
    : `El valor no cumple el formato configurado para ${country}`
  if (pattern.test(normalized)) return null
  return profile === 'postal_code'
    ? `El código postal no cumple el formato de ${country}`
    : `El documento no cumple el formato de ${country}`
}

function localizedValue<T>(translations: Record<string, T> | undefined, locale: string | undefined) {
  if (!translations || !locale) return undefined
  const normalizedLocale = locale.replace('_', '-').toLowerCase()
  const exactKey = Object.keys(translations).find(key => key.replace('_', '-').toLowerCase() === normalizedLocale)
  if (exactKey) return translations[exactKey]
  const language = normalizedLocale.split('-')[0]
  const languageKey = Object.keys(translations).find(key => key.replace('_', '-').toLowerCase() === language)
  return languageKey ? translations[languageKey] : undefined
}

function localizeField(field: FormField, locale?: string): FormField {
  const translation = localizedValue<FormFieldTranslation>(field.translations, locale)
  const subFields = field.subFields?.map(subField => localizeField(subField, locale))
  if (!translation) return subFields ? { ...field, subFields } : field
  return {
    ...field,
    label: translation.label?.trim() || field.label,
    description: translation.description?.trim() || field.description,
    placeholder: translation.placeholder?.trim() || field.placeholder,
    options: field.options?.map(option => ({ ...option, label: translation.options?.[option.value]?.trim() || option.label })),
    matrixRows: field.matrixRows?.map(row => ({ ...row, label: translation.matrixRows?.[row.value]?.trim() || row.label })),
    subFields,
  }
}

export function localizeFormPages(pages: FormPage[], locale?: string): FormPage[] {
  if (!locale) return pages
  return pages.map(page => {
    const translation = localizedValue(page.translations, locale)
    return {
      ...page,
      title: translation?.title?.trim() || page.title,
      description: translation?.description?.trim() || page.description,
      fields: page.fields.map(field => localizeField(field, locale)),
    }
  })
}

export function availableFormLocales(pages: FormPage[]) {
  const locales = new Set<string>()
  pages.forEach(page => {
    Object.keys(page.translations || {}).forEach(locale => locales.add(locale))
    page.fields.forEach(field => Object.keys(field.translations || {}).forEach(locale => locales.add(locale)))
  })
  return Array.from(locales).sort()
}

function comparableValue(value: unknown) {
  if (typeof value === 'string') return value.trim()
  return value
}

function valuesEqual(left: unknown, right: unknown) {
  const normalizedLeft = comparableValue(left)
  const normalizedRight = comparableValue(right)
  if (normalizedLeft === normalizedRight) return true
  if (normalizedLeft === null || normalizedLeft === undefined || normalizedRight === null || normalizedRight === undefined) return false
  return String(normalizedLeft) === String(normalizedRight)
}

export function isFieldVisible(field: FormField, answers: Record<string, unknown>): boolean {
  const rule = field.visibilityLogic
  if (!rule) return true

  const actual = answers[rule.fieldId]
  const expected = rule.value
  switch (rule.operator) {
    case '==': return valuesEqual(actual, expected)
    case '!=': return !valuesEqual(actual, expected)
    case 'contains':
      return Array.isArray(actual)
        ? actual.some(item => valuesEqual(item, expected))
        : String(actual ?? '').includes(String(expected ?? ''))
    case 'not_contains':
      return Array.isArray(actual)
        ? !actual.some(item => valuesEqual(item, expected))
        : !String(actual ?? '').includes(String(expected ?? ''))
    case '>': return !isEmptyFormValue(actual) && !isEmptyFormValue(expected) && Number(actual) > Number(expected)
    case '>=': return !isEmptyFormValue(actual) && !isEmptyFormValue(expected) && Number(actual) >= Number(expected)
    case '<': return !isEmptyFormValue(actual) && !isEmptyFormValue(expected) && Number(actual) < Number(expected)
    case '<=': return !isEmptyFormValue(actual) && !isEmptyFormValue(expected) && Number(actual) <= Number(expected)
    case 'is_empty': return isEmptyFormValue(actual)
    case 'is_not_empty': return !isEmptyFormValue(actual)
    default: return true
  }
}

export function validateFieldValue(field: FormField, value: unknown): string | null {
  if (field.type === 'matrix') {
    const matrixValue = value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {}
    const answeredRows = field.matrixRows?.filter(row => !isEmptyFormValue(matrixValue[row.value])).length || 0
    const totalRows = field.matrixRows?.length || 0
    if (field.required && answeredRows === 0) return 'Esta matriz es obligatoria'
    if (answeredRows > 0 && answeredRows < totalRows) return `Responde todas las filas de la matriz (${answeredRows}/${totalRows})`
    return null
  }
  if (field.required && isEmptyFormValue(value)) return 'Este campo es obligatorio'
  if (isEmptyFormValue(value)) return null

  const rules = field.validationRules
  const textValue = String(value)
  const numericValue = Number(value)
  const pattern = rules?.pattern || field.validation

  if (pattern) {
    try {
      if (!new RegExp(pattern).test(textValue)) return rules?.message || 'Formato inválido'
    } catch {
      return 'La validación configurada no es válida'
    }
  }

  if (rules?.min !== undefined && Number.isFinite(numericValue) && numericValue < rules.min) {
    return rules.message || `El valor mínimo es ${rules.min}`
  }
  if (rules?.max !== undefined && Number.isFinite(numericValue) && numericValue > rules.max) {
    return rules.message || `El valor máximo es ${rules.max}`
  }
  if (rules?.minLength !== undefined && textValue.length < rules.minLength) {
    return rules.message || `Escribe al menos ${rules.minLength} caracteres`
  }
  if (rules?.maxLength !== undefined && textValue.length > rules.maxLength) {
    return rules.message || `No superes ${rules.maxLength} caracteres`
  }
  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(textValue)) {
    return 'Escribe un correo electrónico válido'
  }
  if (field.type === 'phone' && !/^\+?[0-9 ()-]{7,20}$/.test(textValue)) {
    return 'Escribe un teléfono válido'
  }
  if (field.validationProfile) {
    const profileError = validateLatamProfile(field.validationProfile, value, field.validationCountryCode || 'CO')
    if (profileError) return rules?.message || profileError
  }
  return null
}

class ArithmeticParser {
  private cursor = 0

  constructor(private readonly expression: string) {}

  parse() {
    const value = this.parseExpression()
    this.skipSpaces()
    if (this.cursor !== this.expression.length || !Number.isFinite(value)) throw new Error('INVALID_CALCULATION')
    return value
  }

  private parseExpression(): number {
    let value = this.parseTerm()
    while (this.cursor < this.expression.length) {
      this.skipSpaces()
      const operator = this.expression[this.cursor]
      if (operator !== '+' && operator !== '-') return value
      this.cursor += 1
      const next = this.parseTerm()
      value = operator === '+' ? value + next : value - next
    }
    return value
  }

  private parseTerm(): number {
    let value = this.parseFactor()
    while (this.cursor < this.expression.length) {
      this.skipSpaces()
      const operator = this.expression[this.cursor]
      if (operator !== '*' && operator !== '/') return value
      this.cursor += 1
      const next = this.parseFactor()
      if (operator === '/' && next === 0) throw new Error('DIVISION_BY_ZERO')
      value = operator === '*' ? value * next : value / next
    }
    return value
  }

  private parseFactor(): number {
    this.skipSpaces()
    const sign = this.expression[this.cursor] === '-' ? -1 : 1
    if (sign === -1 || this.expression[this.cursor] === '+') this.cursor += 1
    this.skipSpaces()
    if (this.expression[this.cursor] === '(') {
      this.cursor += 1
      const value = this.parseExpression()
      this.skipSpaces()
      if (this.expression[this.cursor] !== ')') throw new Error('UNBALANCED_CALCULATION')
      this.cursor += 1
      return sign * value
    }
    const start = this.cursor
    while (/[0-9.]/.test(this.expression[this.cursor] || '')) this.cursor += 1
    if (start === this.cursor) throw new Error('INVALID_CALCULATION')
    const value = Number(this.expression.slice(start, this.cursor))
    if (!Number.isFinite(value)) throw new Error('INVALID_CALCULATION')
    return sign * value
  }

  private skipSpaces() {
    while (/\s/.test(this.expression[this.cursor] || '')) this.cursor += 1
  }
}

export function calculateFieldValue(field: FormField, answers: Record<string, unknown>): number | null {
  if (field.type !== 'calculation' || !field.calculation?.trim()) return null
  let missingDependency = false
  const expression = field.calculation.replace(/\{\{\s*([A-Za-z0-9_-]+)\s*\}\}/g, (_match, fieldId: string) => {
    const value = answers[fieldId]
    if (isEmptyFormValue(value) || !Number.isFinite(Number(value))) {
      missingDependency = true
      return '0'
    }
    return String(Number(value))
  })
  if (missingDependency || !/^[0-9+\-*/().\s]+$/.test(expression)) return null
  try {
    const result = new ArithmeticParser(expression).parse()
    return Math.round((result + Number.EPSILON) * 1_000_000) / 1_000_000
  } catch {
    return null
  }
}

export function resolveFormRuntimeState(pages: FormPage[], answers: Record<string, unknown>) {
  const next: Record<string, unknown> = {}
  const visibleFieldIds = new Set<string>()
  Object.entries(answers).forEach(([key, value]) => {
    if (key.startsWith('_')) next[key] = value
  })

  pages.flatMap(page => page.fields).forEach(field => {
    if (!isFieldVisible(field, next)) return
    visibleFieldIds.add(field.id)
    if (field.type === 'calculation') {
      const calculated = calculateFieldValue(field, next)
      if (calculated !== null) next[field.id] = calculated
      return
    }
    if (Object.prototype.hasOwnProperty.call(answers, field.id)) next[field.id] = answers[field.id]
  })

  return { answers: next, visibleFieldIds }
}

export function withCalculatedAnswers(pages: FormPage[], answers: Record<string, unknown>) {
  return resolveFormRuntimeState(pages, answers).answers
}

export function sanitizeVisibleAnswers(pages: FormPage[], answers: Record<string, unknown>) {
  return resolveFormRuntimeState(pages, answers).answers
}

export function estimateFormOfflineFootprint(pages: FormPage[]): FormOfflineEstimate {
  const fields = pages.flatMap(page => page.fields)
  const definitionBytes = new TextEncoder().encode(JSON.stringify(pages)).length
  let estimatedSubmissionBytes = 2_048 + fields.length * 180
  let mediaFields = 0

  fields.forEach(field => {
    if (field.type === 'photo') {
      estimatedSubmissionBytes += 1_200_000
      mediaFields += 1
    } else if (field.type === 'signature') {
      estimatedSubmissionBytes += 120_000
      mediaFields += 1
    } else if (field.type === 'file') {
      estimatedSubmissionBytes += Math.max(1, field.maxFileSizeMb ?? 5) * 1_000_000
      mediaFields += 1
    } else if (field.type === 'audio') {
      estimatedSubmissionBytes += Math.max(1, field.maxFileSizeMb ?? 8) * 1_000_000
      mediaFields += 1
    } else if (field.type === 'geotrace' || field.type === 'geoshape') {
      estimatedSubmissionBytes += 80_000
    } else if (field.type === 'repeat_group') {
      estimatedSubmissionBytes += 12_000
    }
  })

  const risk = estimatedSubmissionBytes > 15_000_000 ? 'high' : estimatedSubmissionBytes > 5_000_000 ? 'medium' : 'low'
  return {
    definitionBytes,
    estimatedSubmissionBytes,
    mediaFields,
    risk,
    riskLabel: risk === 'high' ? 'Carga alta' : risk === 'medium' ? 'Carga media' : 'Carga baja',
  }
}

export function formatFormBytes(bytes: number) {
  if (bytes < 1_000) return `${bytes} B`
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(1)} KB`
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}
