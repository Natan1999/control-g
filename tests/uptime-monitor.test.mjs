import assert from 'node:assert/strict'
import test from 'node:test'
import { decideIncidentAction, INCIDENT_TITLE } from '../scripts/manage-uptime-incident.mjs'
import { probeProduction } from '../scripts/probe-production.mjs'

function response({ status = 200, json = {}, headers = {} } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => json,
    headers: { get: name => headers[name.toLowerCase()] || null },
  }
}

test('la sonda exige frontend, health y Supabase operativos', async () => {
  const calls = []
  const result = await probeProduction({
    baseUrl: 'https://controlg.example',
    now: () => new Date('2026-08-31T12:00:00.000Z'),
    fetchImpl: async (url, options) => {
      calls.push({ url, method: options.method || 'GET' })
      if (url.endsWith('/api/health')) {
        return response({ json: {
          status: 'operational', service: 'control-g', release: '2.9.0',
          checks: { web: { status: 'ok' }, database: { status: 'ok', latencyMs: 120 } },
        } })
      }
      return response({ headers: { 'strict-transport-security': 'max-age=63072000' } })
    },
  })
  assert.equal(result.ok, true)
  assert.equal(result.checkedAt, '2026-08-31T12:00:00.000Z')
  assert.equal(result.checks.health.databaseStatus, 'ok')
  assert.equal(result.checks.frontend.hsts, true)
  assert.deepEqual(calls, [
    { url: 'https://controlg.example/api/health', method: 'GET' },
    { url: 'https://controlg.example/login', method: 'HEAD' },
  ])
})

test('la sonda rechaza una base degradada aunque el frontend responda', async () => {
  const result = await probeProduction({
    baseUrl: 'https://controlg.example',
    fetchImpl: async url => url.endsWith('/api/health')
      ? response({ status: 503, json: { status: 'degraded', service: 'control-g', checks: { web: { status: 'ok' }, database: { status: 'error' } } } })
      : response({ headers: { 'strict-transport-security': 'max-age=63072000' } }),
  })
  assert.equal(result.ok, false)
  assert.equal(result.checks.health.ok, false)
  assert.equal(result.checks.frontend.ok, true)
})

test('los incidentes requieren dos fallos y tres recuperaciones consecutivas', () => {
  assert.equal(INCIDENT_TITLE, '[Control G][AUTO] Producción degradada')
  assert.equal(decideIncidentAction({ probeOk: false, previousConclusions: ['success'], hasOpenIncident: false }), 'await-second-failure')
  assert.equal(decideIncidentAction({ probeOk: false, previousConclusions: ['failure'], hasOpenIncident: false }), 'open-incident')
  assert.equal(decideIncidentAction({ probeOk: false, previousConclusions: ['failure'], hasOpenIncident: true }), 'incident-open')
  assert.equal(decideIncidentAction({ probeOk: true, previousConclusions: ['success'], hasOpenIncident: true }), 'await-third-success')
  assert.equal(decideIncidentAction({ probeOk: true, previousConclusions: ['success', 'success'], hasOpenIncident: true }), 'close-incident')
  assert.equal(decideIncidentAction({ probeOk: true, previousConclusions: ['success', 'success'], hasOpenIncident: false }), 'healthy')
})
