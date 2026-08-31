import type { FormField, FormPage } from '@/types'

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
