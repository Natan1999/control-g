#!/usr/bin/env node
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const DEFAULT_BASE_URL = 'https://www.controlg.co'
const DEFAULT_TIMEOUT_MS = 12_000

function normalizedBaseUrl(value) {
  const url = new URL(value || DEFAULT_BASE_URL)
  const localHost = ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
  if (url.protocol !== 'https:' && !localHost) {
    throw new Error('La sonda solo admite HTTPS fuera del entorno local.')
  }
  return url.toString().replace(/\/$/, '')
}

function timeoutSignal(timeoutMs) {
  return AbortSignal.timeout(timeoutMs)
}

function elapsed(startedAt) {
  return Date.now() - startedAt
}

export async function probeProduction({
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  now = () => new Date(),
} = {}) {
  const root = normalizedBaseUrl(baseUrl)
  const checkedAt = now().toISOString()
  const healthStartedAt = Date.now()
  let healthResponse
  let healthPayload = {}
  let healthError = null
  let healthProbeLatencyMs = 0

  try {
    healthResponse = await fetchImpl(`${root}/api/health`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Control-G-Uptime-Probe/1.0' },
      redirect: 'error',
      signal: timeoutSignal(timeoutMs),
    })
    healthPayload = await healthResponse.json().catch(() => ({}))
  } catch (error) {
    healthError = error?.name === 'TimeoutError' ? 'HEALTH_TIMEOUT' : 'HEALTH_UNAVAILABLE'
  } finally {
    healthProbeLatencyMs = elapsed(healthStartedAt)
  }

  const frontendStartedAt = Date.now()
  let frontendResponse
  let frontendError = null
  try {
    frontendResponse = await fetchImpl(`${root}/login`, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Control-G-Uptime-Probe/1.0' },
      redirect: 'error',
      signal: timeoutSignal(timeoutMs),
    })
  } catch (error) {
    frontendError = error?.name === 'TimeoutError' ? 'FRONTEND_TIMEOUT' : 'FRONTEND_UNAVAILABLE'
  }

  const healthOk = Boolean(
    healthResponse?.ok
    && healthPayload?.status === 'operational'
    && healthPayload?.service === 'control-g'
    && healthPayload?.checks?.web?.status === 'ok'
    && healthPayload?.checks?.database?.status === 'ok',
  )
  const frontendHasHsts = Boolean(frontendResponse?.headers?.get?.('strict-transport-security'))
  const frontendOk = Boolean(frontendResponse?.ok && (!root.startsWith('https://') || frontendHasHsts))
  const ok = healthOk && frontendOk

  return {
    ok,
    service: 'control-g',
    checkedAt,
    baseUrl: root,
    release: typeof healthPayload?.release === 'string' ? healthPayload.release.slice(0, 40) : null,
    checks: {
      health: {
        ok: healthOk,
        httpStatus: healthResponse?.status || null,
        status: typeof healthPayload?.status === 'string' ? healthPayload.status.slice(0, 40) : null,
        databaseStatus: typeof healthPayload?.checks?.database?.status === 'string'
          ? healthPayload.checks.database.status.slice(0, 40)
          : null,
        upstreamLatencyMs: Number.isFinite(healthPayload?.checks?.database?.latencyMs)
          ? Number(healthPayload.checks.database.latencyMs)
          : null,
        probeLatencyMs: healthProbeLatencyMs,
        error: healthError,
      },
      frontend: {
        ok: frontendOk,
        httpStatus: frontendResponse?.status || null,
        probeLatencyMs: elapsed(frontendStartedAt),
        hsts: frontendHasHsts,
        error: frontendError,
      },
    },
  }
}

function cliOptions(argv) {
  const outputIndex = argv.indexOf('--output')
  return {
    outputPath: outputIndex >= 0 ? argv[outputIndex + 1] : '',
    baseUrl: process.env.CONTROL_G_BASE_URL || DEFAULT_BASE_URL,
  }
}

async function main() {
  const options = cliOptions(process.argv.slice(2))
  const result = await probeProduction({ baseUrl: options.baseUrl })
  const serialized = `${JSON.stringify(result, null, 2)}\n`
  if (options.outputPath) await writeFile(options.outputPath, serialized, { mode: 0o600 })
  process.stdout.write(serialized)
  if (!result.ok) process.exitCode = 1
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : ''
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : 'La sonda de producción falló.')
    process.exitCode = 1
  })
}
