#!/usr/bin/env node

const baseUrl = (process.env.CONTROL_G_BASE_URL || 'https://www.controlg.co').replace(/\/$/, '')
const response = await fetch(`${baseUrl}/api/health`, {
  headers: { Accept: 'application/json' },
  signal: AbortSignal.timeout(10_000),
})
const payload = await response.json().catch(() => ({}))
if (!response.ok || payload.status !== 'operational' || payload.checks?.database?.status !== 'ok') {
  console.error(`Control G no está listo: HTTP ${response.status}, estado ${payload.status || 'desconocido'}.`)
  process.exit(1)
}
console.log(`Control G operativo (${payload.release}); Supabase respondió en ${payload.checks.database.latencyMs} ms.`)
