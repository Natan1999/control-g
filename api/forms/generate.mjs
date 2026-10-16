import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { AI_FORM_JSON_SCHEMA, aiRequestSchema, aiFormInstructions, normalizeAiDraft } from '../../shared/ai-form.mjs'

const ORIGINS = new Set(['https://www.controlg.co', 'https://controlg.co', 'https://localhost', 'http://localhost', 'capacitor://localhost', 'http://127.0.0.1:5173', 'http://localhost:5173'])
const ERROR_MESSAGES = {
  AUTH_REQUIRED: 'Inicia sesión para usar el asistente.', AUTH_INVALID: 'Tu sesión venció. Inicia sesión nuevamente.',
  FORBIDDEN: 'Solo coordinación y superadministración pueden crear instrumentos con IA.',
  ENTITY_FORBIDDEN: 'Selecciona una entidad activa para la que tengas permisos.',
  INPUT_INVALID: 'Revisa la descripción, el número de preguntas y la confirmación de privacidad.',
  PROVIDER_NOT_CONFIGURED: 'Este proveedor aún no está conectado en el servidor.',
  RATE_LIMITED: 'Alcanzaste el límite temporal del asistente. Inténtalo más tarde.',
  AI_BUSY: 'Ya hay una generación en curso. Espera a que termine.',
  AI_QUOTA: 'El proveedor no tiene cuota disponible. Revisa el proyecto y sus límites.',
  AI_UNAVAILABLE: 'El proveedor de IA no respondió. No se modificó tu formulario.',
  AI_OUTPUT_INVALID: 'La IA no devolvió un instrumento válido. Tu formulario original no se modificó.',
  SERVER_NOT_CONFIGURED: 'El servicio no está configurado en el servidor.',
  QUOTA_NOT_CONFIGURED: 'El control de consumo de IA todavía no está disponible. No se realizó ninguna llamada al proveedor.',
}
function error(code, status) { return Object.assign(new Error(code), { code, status }) }
function reply(res, status, payload) { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(payload)) }

// Burst/concurrency protection is best-effort per warm instance, not a hard
// distributed spending ceiling. Also configure limits in each provider project.
export function createAiLimiter({ now = Date.now } = {}) {
  const users = new Map()
  let active = 0
  return userId => {
    const time = now()
    for (const [key, value] of users) if (!value.active && value.day + 86_400_000 <= time) users.delete(key)
    if (users.size >= 5000 && !users.has(userId)) throw error('RATE_LIMITED', 429)
    let state = users.get(userId)
    if (!state || state.day + 86_400_000 <= time) state = { day: time, daily: 0, minute: time, recent: 0, active: false }
    if (state.active || active >= 3) throw error('AI_BUSY', 429)
    if (state.minute + 60_000 <= time) { state.minute = time; state.recent = 0 }
    if (state.daily >= 20 || state.recent >= 3) throw error('RATE_LIMITED', 429)
    state.daily++; state.recent++; state.active = true; users.set(userId, state); active++
    let released = false
    return () => { if (!released) { released = true; state.active = false; active-- } }
  }
}

export async function generateAiForm(request, { env = process.env, fetchImpl = fetch } = {}) {
  const provider = request.provider
  const key = provider === 'openai' ? env.OPENAI_API_KEY : env.GEMINI_API_KEY
  if (!key) throw error('PROVIDER_NOT_CONFIGURED', 503)
  const model = provider === 'openai' ? env.OPENAI_FORM_MODEL || 'gpt-4.1-mini' : env.GEMINI_FORM_MODEL || 'gemini-3.5-flash-lite'
  if (!/^[a-zA-Z0-9._-]{1,100}$/.test(model)) throw error('SERVER_NOT_CONFIGURED', 503)
  const input = `SOLICITUD DEL USUARIO:\n${request.prompt}\n${request.currentDraft ? `BORRADOR A REVISAR (solo definición, no respuestas):\n${request.currentDraft}` : ''}`
  const instructions = aiFormInstructions(request)
  const url = provider === 'openai' ? 'https://api.openai.com/v1/responses' : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  const body = provider === 'openai' ? {
    model, store: false, instructions, input, max_output_tokens: 10000,
    text: { format: { type: 'json_schema', name: 'control_g_form_draft', strict: true, schema: AI_FORM_JSON_SCHEMA } },
  } : {
    systemInstruction: { parts: [{ text: instructions }] }, contents: [{ role: 'user', parts: [{ text: input }] }],
    generationConfig: { maxOutputTokens: 10000, responseMimeType: 'application/json', responseJsonSchema: AI_FORM_JSON_SCHEMA },
  }
  let response
  try {
    response = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(provider === 'openai' ? { Authorization: `Bearer ${key}` } : { 'x-goog-api-key': key }) }, body: JSON.stringify(body), signal: AbortSignal.timeout(45_000), redirect: 'error' })
  } catch { throw error('AI_UNAVAILABLE', 502) }
  if (!response.ok) {
    const failure = await response.json().catch(() => null)
    const diagnostic = {
      upstreamStatus: response.status,
      upstreamCode: String(failure?.error?.status || failure?.error?.code || '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 100),
      upstreamMessage: String(failure?.error?.message || '').replaceAll(key, '[REDACTED]').slice(0, 600),
    }
    throw Object.assign(error(response.status === 429 || response.status === 402 ? 'AI_QUOTA' : 'AI_UNAVAILABLE', response.status === 429 || response.status === 402 ? 429 : 502), diagnostic)
  }
  const raw = await response.text()
  if (raw.length > 250_000) throw error('AI_OUTPUT_INVALID', 502)
  try {
    const payload = JSON.parse(raw)
    if (provider === 'openai' && payload.status !== 'completed') throw error('AI_OUTPUT_INVALID', 502)
    const output = provider === 'openai'
      ? payload.output?.flatMap(item => item.type === 'message' ? item.content || [] : []).filter(item => item.type === 'output_text').map(item => item.text).join('')
      : payload.candidates?.[0]?.finishReason === 'STOP' ? payload.candidates[0].content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('') : null
    if (!output) throw error('AI_OUTPUT_INVALID', 502)
    const currencies = { CO:'COP', AR:'ARS', BO:'BOB', BR:'BRL', CL:'CLP', CR:'CRC', CU:'CUP', DO:'DOP', EC:'USD', SV:'USD', GT:'GTQ', HN:'HNL', MX:'MXN', NI:'NIO', PA:'PAB', PY:'PYG', PE:'PEN', PR:'USD', UY:'UYU', VE:'VES' }
    return { draft: normalizeAiDraft(JSON.parse(output), { id: randomUUID, countryCode: request.countryCode, currencyCode: currencies[request.countryCode] }), provider, model }
  } catch { throw error('AI_OUTPUT_INVALID', 502) }
}

async function authenticate(req, env) {
  const token = String(req.headers.authorization || '').match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1]
  if (!token) throw error('AUTH_REQUIRED', 401)
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  if (!url || !key) throw error('SERVER_NOT_CONFIGURED', 503)
  // One shared deadline for auth, profile, entity and quota leaves room for the
  // 45-second provider call within the function's 60-second execution window.
  const backendDeadline = AbortSignal.timeout(12_000)
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (resource, options) => fetch(resource, { ...options, signal: backendDeadline }),
    },
  })
  const { data, error: authError } = await client.auth.getUser(token)
  if (authError || !data.user) throw error('AUTH_INVALID', 401)
  const profileResult = await client.from('user_profiles').select('user_id,entity_id,role,status').eq('user_id', data.user.id).single()
  const profile = profileResult.data
  if (profileResult.error || profile?.status !== 'active' || !['admin', 'coordinator'].includes(profile.role)) throw error('FORBIDDEN', 403)
  return { client, profile }
}

export function createFormAiHandler({ env = process.env, authenticateRequest = authenticate, generate = generateAiForm, reserve = createAiLimiter() } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Vary', 'Origin')
    const origin = req.headers.origin
    if (origin && !ORIGINS.has(origin)) return reply(res, 403, { ok: false, code: 'FORBIDDEN', message: ERROR_MESSAGES.FORBIDDEN })
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')
    if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end() }
    if (!['GET', 'POST'].includes(req.method)) return reply(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED' })
    let release
    try {
      const { profile, client } = await authenticateRequest(req, env)
      if (req.method === 'GET') return reply(res, 200, { ok: true, providers: ['gemini', 'openai'].filter(provider => Boolean(provider === 'openai' ? env.OPENAI_API_KEY : env.GEMINI_API_KEY)) })
      if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) throw error('INPUT_INVALID', 415)
      const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})
      if (Buffer.byteLength(raw) > 60_000 || Number(req.headers['content-length']) > 60_000) throw error('INPUT_INVALID', 413)
      let parsed
      try { parsed = aiRequestSchema.safeParse(JSON.parse(raw)) } catch { throw error('INPUT_INVALID', 400) }
      if (!parsed.success) throw error('INPUT_INVALID', 400)
      const request = parsed.data
      if (profile.role !== 'admin' && profile.entity_id !== request.entityId) throw error('ENTITY_FORBIDDEN', 403)
      const entityResult = await client.from('entities').select('id,status').eq('id', request.entityId).single()
      if (entityResult.error || entityResult.data?.status !== 'active') throw error('ENTITY_FORBIDDEN', 403)
      if (!(request.provider === 'openai' ? env.OPENAI_API_KEY : env.GEMINI_API_KEY)) throw error('PROVIDER_NOT_CONFIGURED', 503)
      release = reserve(profile.user_id)
      const quota = await client.rpc('consume_ai_form_quota', { p_entity_id: request.entityId })
      if (quota.error || quota.data?.allowed !== true) {
        if (quota.error?.message?.includes('AI_RATE_LIMITED')) throw error('RATE_LIMITED', 429)
        if (quota.error?.message?.includes('AI_ENTITY_FORBIDDEN')) throw error('ENTITY_FORBIDDEN', 403)
        throw error('QUOTA_NOT_CONFIGURED', 503)
      }
      const result = await generate(request, { env })
      return reply(res, 200, { ok: true, ...result })
    } catch (caught) {
      const code = ERROR_MESSAGES[caught?.code] ? caught.code : 'AI_UNAVAILABLE'
      if (caught?.status === 429) res.setHeader('Retry-After', '60')
      return reply(res, caught?.status || 502, { ok: false, code, message: ERROR_MESSAGES[code] })
    } finally { release?.() }
  }
}

export default createFormAiHandler()
