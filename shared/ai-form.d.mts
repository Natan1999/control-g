import type { FormPage } from '../src/types'
export type AiFormDraft = { title: string; description: string; pages: FormPage[]; warnings: string[] }
export const AI_FIELD_TYPES: string[]
export const AI_FORM_JSON_SCHEMA: Record<string, unknown>
export const aiDraftSchema: unknown
export const aiRequestSchema: unknown
export function normalizeAiDraft(raw: unknown, options?: { id?: () => string; countryCode?: string; currencyCode?: string }): AiFormDraft
export function aiFormInstructions(request: Record<string, unknown>): string
