import { randomUUID, timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import {
  arcGisErrorCode,
  loadIntegration,
  processClaimedJob,
  recordArcGisFailure,
} from '../arcgis/job.mjs'

const MAX_CLAIMS_PER_INVOCATION = 4
const EXECUTION_BUDGET_MS = 50_000
const LEASE_SECONDS = 180

function bearer(req) {
  const value = String(req.headers.authorization || '')
  return value.startsWith('Bearer ') ? value.slice(7).trim() : ''
}

export function authorizedCronRequest(req, secret) {
  const token = bearer(req)
  if (!token || !secret) return false
  const tokenBuffer = Buffer.from(token)
  const secretBuffer = Buffer.from(secret)
  if (tokenBuffer.length !== secretBuffer.length) return false
  return timingSafeEqual(tokenBuffer, secretBuffer)
}

function serviceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://controlg2.dran.cloud'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return null
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-client-info': 'control-g-arcgis-worker/2.11' } },
  })
}

async function claimOne(client, workerId) {
  const result = await client.rpc('claim_due_arcgis_jobs', {
    p_worker_id: workerId,
    p_limit: 1,
    p_lease_seconds: LEASE_SECONDS,
  })
  if (result.error) throw new Error(`ARCGIS_JOB_CLAIM:${result.error.code}`)
  return Array.isArray(result.data) ? result.data[0] || null : null
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  if (!authorizedCronRequest(req, process.env.CRON_SECRET)) return res.status(401).json({ error: 'AUTH_REQUIRED' })

  const client = serviceClient()
  if (!client) return res.status(503).json({ error: 'SERVICE_ROLE_NOT_CONFIGURED' })

  const startedAt = Date.now()
  const results = []
  for (let index = 0; index < MAX_CLAIMS_PER_INVOCATION; index += 1) {
    if (Date.now() - startedAt >= EXECUTION_BUDGET_MS) break
    const workerId = `worker:${randomUUID()}`
    let job
    let integration
    try {
      job = await claimOne(client, workerId)
      if (!job) break
      integration = { job, connection: null, mapping: null }
      integration = await loadIntegration(client, { jobId: job.id, connectionId: null, mappingId: null })
      const outcome = await processClaimedJob(client, integration.job, integration.connection, integration.mapping, workerId)
      results.push({
        jobId: job.id,
        ok: true,
        status: outcome.status,
        attempted: Number(outcome.attempted || 0),
        succeeded: Number(outcome.succeeded || 0),
        failed: Number(outcome.failed || 0),
        hasMore: Boolean(outcome.hasMore),
      })
    } catch (error) {
      const code = integration?.job
        ? await recordArcGisFailure(client, integration, error)
        : arcGisErrorCode(error)
      results.push({ jobId: job?.id || null, ok: false, code })
      if (!job) break
    }
  }

  const failures = results.filter(result => !result.ok)
  return res.status(failures.length ? 207 : 200).json({
    checkedAt: new Date().toISOString(),
    claimedCount: results.length,
    failureCount: failures.length,
    durationMs: Date.now() - startedAt,
    results,
  })
}
