import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  arcGisFailurePatch,
  processClaimedJob,
} from '../api/arcgis/job.mjs'
import { authorizedCronRequest } from '../api/maintenance/arcgis.mjs'

const activeConnection = { status: 'active' }
const activeMapping = { enabled: true }

test('el trabajador exige el secreto cron completo con comparación segura', () => {
  const request = token => ({ headers: { authorization: `Bearer ${token}` } })
  assert.equal(authorizedCronRequest(request('secreto-valido'), 'secreto-valido'), true)
  assert.equal(authorizedCronRequest(request('secreto-invalido'), 'secreto-valido'), false)
  assert.equal(authorizedCronRequest(request('secreto-válido'), 'secreto-valido'), false)
  assert.equal(authorizedCronRequest({ headers: {} }, 'secreto-valido'), false)
  assert.equal(authorizedCronRequest(request('secreto-valido'), ''), false)
})

test('un fallo libera el lease y aplica backoff hasta el límite de reintentos', () => {
  const now = Date.parse('2026-08-31T12:00:00.000Z')
  const first = arcGisFailurePatch({ retry_count: 0, max_retries: 5 }, new Error('ARCGIS_503:temporal'), now)
  assert.equal(first.retry_count, 1)
  assert.equal(first.next_retry_at, '2026-08-31T12:01:00.000Z')
  assert.equal(first.worker_id, null)
  assert.equal(first.lease_expires_at, null)
  assert.deepEqual(first.error_summary, { code: 'ARCGIS_503' })

  const exhausted = arcGisFailurePatch({ retry_count: 4, max_retries: 5 }, new Error('OAUTH_401'), now)
  assert.equal(exhausted.retry_count, 5)
  assert.equal(exhausted.next_retry_at, null)
})

test('solo el dueño de un lease vigente puede procesar un trabajo', async () => {
  const base = {
    id: 'job-1', status: 'running', worker_id: 'worker:11111111-1111-1111-1111-111111111111',
    lease_expires_at: new Date(Date.now() + 60_000).toISOString(), retry_count: 0, max_retries: 5,
  }
  await assert.rejects(
    processClaimedJob({}, base, activeConnection, activeMapping, 'worker:22222222-2222-2222-2222-222222222222'),
    /JOB_LEASE_MISMATCH/,
  )
  await assert.rejects(
    processClaimedJob({}, { ...base, lease_expires_at: '2020-01-01T00:00:00.000Z' }, activeConnection, activeMapping, base.worker_id),
    /JOB_LEASE_EXPIRED/,
  )
})

test('la reclamación SQL es atómica, recuperable y exclusiva de service_role', async () => {
  const migration = await readFile('supabase/migrations/202608310010_arcgis_worker_leases.sql', 'utf8')
  const worker = await readFile('api/maintenance/arcgis.mjs', 'utf8')
  const vercel = JSON.parse(await readFile('vercel.json', 'utf8'))

  assert.match(migration, /for update of job skip locked/i)
  assert.match(migration, /lease_expires_at/)
  assert.match(migration, /job\.retry_count \+ 1 >= job\.max_retries/)
  assert.match(migration, /coalesce\(auth\.role\(\), ''\) <> 'service_role'/)
  assert.match(migration, /revoke all on function public\.claim_due_arcgis_jobs[^;]+authenticated/s)
  assert.match(migration, /grant execute on function public\.claim_due_arcgis_jobs[^;]+service_role/s)
  assert.match(worker, /SUPABASE_SERVICE_ROLE_KEY/)
  assert.doesNotMatch(worker, /VITE_SUPABASE_SERVICE_ROLE_KEY/)
  assert.match(worker, /MAX_CLAIMS_PER_INVOCATION/)
  assert.match(worker, /EXECUTION_BUDGET_MS/)
  assert.deepEqual(vercel.crons.find(item => item.path === '/api/maintenance/arcgis'), {
    path: '/api/maintenance/arcgis', schedule: '35 3 * * *',
  })
})
