export type AiProvider = 'gemini' | 'openai' | 'openrouter'
export const AI_PROVIDERS: readonly AiProvider[]
export function isAiProvider(value: unknown): value is AiProvider
