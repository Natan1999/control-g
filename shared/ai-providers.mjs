// Lightweight browser/server contract. Do not import the Zod form schema just
// to populate a provider selector. Gemini stays first when it is configured.
export const AI_PROVIDERS = Object.freeze(['gemini', 'openai', 'openrouter'])
export function isAiProvider(value) { return AI_PROVIDERS.includes(value) }
