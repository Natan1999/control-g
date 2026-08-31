#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

export const INCIDENT_TITLE = '[Control G][AUTO] Producción degradada'
const WORKFLOW_FILE = 'production-health.yml'

export function decideIncidentAction({ probeOk, previousConclusions, hasOpenIncident }) {
  const previous = previousConclusions.filter(Boolean)
  if (!probeOk) {
    if (previous[0] !== 'failure') return 'await-second-failure'
    return hasOpenIncident ? 'incident-open' : 'open-incident'
  }
  const recovered = previous[0] === 'success' && previous[1] === 'success'
  if (recovered && hasOpenIncident) return 'close-incident'
  return hasOpenIncident ? 'await-third-success' : 'healthy'
}

function githubContext(env = process.env) {
  const [owner, repository] = String(env.GITHUB_REPOSITORY || '').split('/')
  if (!owner || !repository || !env.GITHUB_TOKEN) {
    throw new Error('GITHUB_REPOSITORY y GITHUB_TOKEN son obligatorios para administrar incidentes.')
  }
  return {
    owner,
    repository,
    token: env.GITHUB_TOKEN,
    apiUrl: String(env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, ''),
    serverUrl: String(env.GITHUB_SERVER_URL || 'https://github.com').replace(/\/$/, ''),
    runId: String(env.GITHUB_RUN_ID || ''),
    probeOutcome: env.PROBE_OUTCOME === 'success' ? 'success' : 'failure',
    resultPath: String(env.HEALTH_RESULT_PATH || ''),
  }
}

async function githubRequest(context, path, options = {}) {
  const response = await fetch(`${context.apiUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${context.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...options.headers,
    },
    signal: AbortSignal.timeout(12_000),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`GitHub API rechazó la operación (${response.status}).`)
  return body
}

function incidentBody(context, probe) {
  const runUrl = `${context.serverUrl}/${context.owner}/${context.repository}/actions/runs/${context.runId}`
  const health = probe?.checks?.health || {}
  const frontend = probe?.checks?.frontend || {}
  return [
    'La sonda automática detectó **dos ejecuciones fallidas consecutivas**.',
    '',
    `- Momento UTC: ${probe?.checkedAt || new Date().toISOString()}`,
    `- Versión reportada: ${probe?.release || 'no disponible'}`,
    `- Health API: HTTP ${health.httpStatus ?? 'sin respuesta'} · ${health.status || health.error || 'desconocido'}`,
    `- Supabase: ${health.databaseStatus || 'sin respuesta'}`,
    `- Frontend: HTTP ${frontend.httpStatus ?? 'sin respuesta'} · ${frontend.error || (frontend.ok ? 'ok' : 'degradado')}`,
    `- Ejecución: ${runUrl}`,
    '',
    'No publique credenciales, respuestas, evidencias, coordenadas ni datos personales en este incidente.',
    'Siga `docs/runbooks/OPERATIONS_AND_INCIDENTS.md` para diagnóstico y recuperación.',
  ].join('\n')
}

export async function manageUptimeIncident({ env = process.env } = {}) {
  const context = githubContext(env)
  const probe = context.resultPath
    ? JSON.parse(await readFile(context.resultPath, 'utf8'))
    : { ok: context.probeOutcome === 'success', checkedAt: new Date().toISOString() }
  const runsPayload = await githubRequest(
    context,
    `/repos/${context.owner}/${context.repository}/actions/workflows/${WORKFLOW_FILE}/runs?status=completed&branch=main&per_page=10`,
  )
  const previousConclusions = (runsPayload.workflow_runs || [])
    .filter(run => String(run.id) !== context.runId)
    .map(run => run.conclusion)
  const issues = await githubRequest(
    context,
    `/repos/${context.owner}/${context.repository}/issues?state=open&per_page=100`,
  )
  const incident = issues.find(issue => !issue.pull_request && issue.title === INCIDENT_TITLE)
  const action = decideIncidentAction({
    probeOk: context.probeOutcome === 'success' && probe.ok === true,
    previousConclusions,
    hasOpenIncident: Boolean(incident),
  })

  if (action === 'open-incident') {
    const created = await githubRequest(context, `/repos/${context.owner}/${context.repository}/issues`, {
      method: 'POST',
      body: JSON.stringify({ title: INCIDENT_TITLE, body: incidentBody(context, probe) }),
    })
    console.log(`Incidente automático abierto: #${created.number}.`)
  } else if (action === 'close-incident') {
    const runUrl = `${context.serverUrl}/${context.owner}/${context.repository}/actions/runs/${context.runId}`
    await githubRequest(context, `/repos/${context.owner}/${context.repository}/issues/${incident.number}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: `Recuperación automática confirmada después de tres sondas exitosas consecutivas. Evidencia: ${runUrl}` }),
    })
    await githubRequest(context, `/repos/${context.owner}/${context.repository}/issues/${incident.number}`, {
      method: 'PATCH',
      body: JSON.stringify({ state: 'closed', state_reason: 'completed' }),
    })
    console.log(`Incidente automático #${incident.number} cerrado después de tres éxitos consecutivos.`)
  } else {
    console.log(`Estado de monitoreo: ${action}.`)
  }
  return action
}

async function main() {
  await manageUptimeIncident()
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : ''
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : 'No fue posible administrar el incidente de disponibilidad.')
    process.exitCode = 1
  })
}
