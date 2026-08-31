import { createHash, randomUUID } from 'node:crypto'

const MAX_BODY_BYTES = 8_192
const WINDOW_MS = 60_000
const MAX_EVENTS_PER_WINDOW = 12
const buckets = globalThis.__controlGMonitoringBuckets || new Map()
globalThis.__controlGMonitoringBuckets = buckets

const ALLOWED_ORIGINS = new Set([
  'https://www.controlg.co',
  'https://controlg.co',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost',
  'capacitor://localhost',
])

export function sanitizeText(input, maxLength = 500) {
  return String(input || '')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[token]')
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [token]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/https?:\/\/[^\s)]+/gi, '[url]')
    .replace(/[?&](token|key|secret|password|code)=[^&\s]+/gi, '$1=[redacted]')
    .replace(/\b\d{6,}\b/g, '[number]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function clientKey(req) {
  const address = String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0]
  return createHash('sha256').update(address).digest('hex')
}

function rateLimited(req) {
  const key = clientKey(req)
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || now - bucket.startedAt > WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: 1 })
    return false
  }
  bucket.count += 1
  return bucket.count > MAX_EVENTS_PER_WINDOW
}

export function sanitizeRoute(value) {
  const route = String(value || '/').split('?')[0].split('#')[0]
  if (!route.startsWith('/')) return '/'
  return sanitizeText(route
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, '[id]')
    .replace(/\/([A-Za-z0-9_-]{24,})(?=\/|$)/g, '/[id]'), 160)
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
  res.setHeader('Allow', 'POST')
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })

  const origin = String(req.headers.origin || '')
  const deploymentOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
  if (origin && !ALLOWED_ORIGINS.has(origin) && origin !== deploymentOrigin) return res.status(403).json({ error: 'ORIGIN_NOT_ALLOWED' })
  if (Number(req.headers['content-length'] || 0) > MAX_BODY_BYTES) return res.status(413).json({ error: 'PAYLOAD_TOO_LARGE' })
  if (rateLimited(req)) return res.status(429).json({ error: 'RATE_LIMITED' })

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  } catch {
    return res.status(400).json({ error: 'INVALID_JSON' })
  }
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_BYTES) return res.status(413).json({ error: 'PAYLOAD_TOO_LARGE' })
  const event = {
    eventId: /^[0-9a-f-]{36}$/i.test(String(body.eventId || '')) ? String(body.eventId) : randomUUID(),
    receivedAt: new Date().toISOString(),
    release: sanitizeText(body.release, 32),
    kind: ['react-boundary', 'window-error', 'unhandled-rejection'].includes(body.kind) ? body.kind : 'window-error',
    route: sanitizeRoute(body.route),
    online: Boolean(body.online),
    native: Boolean(body.native),
    message: sanitizeText(body.message),
    stack: sanitizeText(body.stack, 1_500),
  }

  // Vercel retains this structured event in function logs. The payload is
  // deliberately free of answers, coordinates, media paths and identifiers.
  console.error(`[control-g-client-error] ${JSON.stringify(event)}`)
  return res.status(202).json({ accepted: true, eventId: event.eventId })
}
