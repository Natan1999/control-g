import { Capacitor } from '@capacitor/core'
import { supabase } from '@/lib/supabase'
import type { FormDefinition, FormField } from '@/types'
import type { AiFormDraft } from '../../shared/ai-form.mjs'

export type AiProvider = 'openai' | 'gemini'
export type AiFormMode = 'create' | 'import' | 'revise'
export interface AiFormRequest {
  entityId: string
  provider: AiProvider
  mode: AiFormMode
  prompt: string
  countryCode: string
  language: 'es' | 'pt' | 'en'
  questionCount: number
  currentDraft?: string
  privacyConfirmed: true
}
export type AiFormResult = { draft: AiFormDraft; provider: AiProvider; model: string }

function apiOrigin() {
  return String(import.meta.env.VITE_CONTROL_G_API_URL || (Capacitor.isNativePlatform() ? 'https://www.controlg.co' : '')).replace(/\/$/, '')
}

async function requestAi(method: 'GET' | 'POST', body?: AiFormRequest, signal?: AbortSignal) {
  if (!navigator.onLine) throw new Error('La creación con IA necesita internet. Los formularios ya descargados siguen disponibles para captura offline.')
  const { data } = await supabase.auth.getSession()
  if (!data.session?.access_token) throw new Error('Inicia sesión nuevamente para usar el asistente.')
  let response: Response
  try {
    response = await fetch(`${apiOrigin()}/api/forms/generate`, {
      method, signal, headers: { Authorization: `Bearer ${data.session.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('No fue posible conectar con el asistente. Tu formulario no se modificó.')
  }
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'El asistente no está disponible. Tu formulario no se modificó.')
  return payload
}

export async function loadAiProviders(signal?: AbortSignal): Promise<AiProvider[]> {
  const result = await requestAi('GET', undefined, signal)
  return Array.isArray(result.providers) ? result.providers.filter((item: string) => item === 'openai' || item === 'gemini') : []
}

export async function generateFormDraft(request: AiFormRequest, signal?: AbortSignal): Promise<AiFormResult> {
  const result = await requestAi('POST', request, signal)
  if (!result.draft?.title || !Array.isArray(result.draft.pages) || !result.draft.pages.length) throw new Error('El borrador recibido no es válido.')
  return result
}

// Never serialize answers, profile, entity metadata, attachments or hidden store
// state. Only the questionnaire definition intentionally selected for revision.
export function questionnaireContext(form: Partial<FormDefinition>) {
  const field = (item: FormField): Record<string, unknown> => ({
    type: item.type, label: item.label, description: item.description, required: item.required,
    options: item.options?.map(option => option.label), matrixRows: item.matrixRows?.map(row => row.label),
    sensitive: item.sensitive, sensitiveJustification: item.sensitiveJustification,
    subFields: item.subFields?.map(field),
  })
  const context = JSON.stringify({ title: form.title, description: form.description, pages: form.pages?.map(page => ({ title: page.title, fields: page.fields.map(field) })) })
  if (context.length > 30000) throw new Error('Este instrumento es demasiado extenso para revisarlo completo con IA. Describe la sección que deseas crear y agrégala al formulario.')
  return context
}
