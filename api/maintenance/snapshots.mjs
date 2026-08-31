import { timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

function bearer(req) {
  const value = String(req.headers.authorization || '')
  return value.startsWith('Bearer ') ? value.slice(7).trim() : ''
}

function authorized(req, secret) {
  const token = bearer(req)
  if (!token || !secret || token.length !== secret.length) return false
  return timingSafeEqual(Buffer.from(token), Buffer.from(secret))
}

async function runInBatches(items, size, operation) {
  const output = []
  for (let index = 0; index < items.length; index += size) {
    const batch = items.slice(index, index + size)
    output.push(...await Promise.all(batch.map(operation)))
  }
  return output
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })

  const cronSecret = process.env.CRON_SECRET
  if (!authorized(req, cronSecret)) return res.status(401).json({ error: 'AUTH_REQUIRED' })

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://controlg2.dran.cloud'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return res.status(503).json({ error: 'SERVICE_ROLE_NOT_CONFIGURED' })

  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const cutoffAt = new Date().toISOString()
  const entitiesResult = await client.from('entities').select('id').eq('status', 'active').order('id').limit(200)
  if (entitiesResult.error) return res.status(502).json({ error: 'ENTITY_QUERY_FAILED', code: entitiesResult.error.code })

  const results = await runInBatches(entitiesResult.data || [], 5, async entity => {
    const { data, error } = await client.rpc('run_indicator_snapshots', {
      p_entity_id: entity.id,
      p_cutoff_at: cutoffAt,
      p_filter_context: { scheduled: true, periodicity: 'daily' },
    })
    return error
      ? { entityId: entity.id, ok: false, code: error.code }
      : { entityId: entity.id, ok: true, snapshotCount: Number(data?.snapshot_count || 0) }
  })
  const failures = results.filter(result => !result.ok)
  return res.status(failures.length ? 207 : 200).json({
    cutoffAt,
    entityCount: results.length,
    snapshotCount: results.reduce((sum, result) => sum + Number(result.snapshotCount || 0), 0),
    failureCount: failures.length,
    results,
  })
}
