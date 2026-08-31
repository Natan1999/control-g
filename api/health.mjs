// The release belongs to the deployed artifact. Do not let a stale platform
// variable override it and make monitoring report the wrong version.
const RELEASE = '2.14.0'
const TIMEOUT_MS = 7_000

function setHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
}

async function checkDatabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) return { status: 'error', code: 'CONFIG_MISSING' }

  const startedAt = Date.now()
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/entities?select=id&limit=0`, {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) return { status: 'error', code: 'UPSTREAM_REJECTED', latencyMs: Date.now() - startedAt }
    return { status: 'ok', latencyMs: Date.now() - startedAt }
  } catch (error) {
    return {
      status: 'error',
      code: error?.name === 'TimeoutError' ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
      latencyMs: Date.now() - startedAt,
    }
  }
}

export default async function handler(req, res) {
  setHeaders(res)
  res.setHeader('Allow', 'GET, HEAD')
  if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })

  const checkedAt = new Date().toISOString()
  const database = await checkDatabase()
  const operational = database.status === 'ok'
  const body = {
    status: operational ? 'operational' : 'degraded',
    service: 'control-g',
    release: RELEASE,
    checkedAt,
    checks: {
      web: { status: 'ok' },
      database,
    },
  }
  if (req.method === 'HEAD') return res.status(operational ? 200 : 503).end()
  return res.status(operational ? 200 : 503).json(body)
}
