#!/usr/bin/env node
import { setTimeout as delay } from 'node:timers/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SITE_ORIGIN = 'https://www.controlg.co'
// This is an intentionally public ownership token, not an application secret.
export const INDEXNOW_KEY = 'aded37d21c24e40b663938edaa1be9d5'
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
export const KEY_LOCATION = `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`
const PRIVATE_PATH = /^\/(?:api|admin|coord|apoyo|field|login|demo|recuperar-contrasena|restablecer-contrasena)(?:\/|$)/
const REQUEST_TIMEOUT_MS = 15_000

export function validatePublicUrl(value) {
  if (typeof value !== 'string') throw new Error('Cada URL debe ser una cadena absoluta.')
  const url = new URL(value)
  if (url.origin !== SITE_ORIGIN || url.username || url.password || url.search || url.hash) {
    throw new Error(`Solo se admiten URLs canónicas de ${SITE_ORIGIN}, sin parámetros ni fragmentos.`)
  }
  if (!/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/.test(url.pathname)
    || (url.pathname !== '/' && url.pathname.endsWith('/'))
    || PRIVATE_PATH.test(url.pathname)) {
    throw new Error(`Ruta no publicable: ${url.pathname}`)
  }
  if (url.href !== value) throw new Error('La URL debe usar su representación canónica exacta.')
  return url.href
}

export function parseSitemapUrls(xml) {
  if (typeof xml !== 'string' || !/<urlset(?:\s|>)/.test(xml) || /<!DOCTYPE|<!ENTITY/i.test(xml)) {
    throw new Error('Se esperaba un sitemap XML urlset sin entidades externas.')
  }
  const urls = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) => validatePublicUrl(match[1]))
  if (!urls.length || urls.length > 10_000 || urls.length !== (xml.match(/<url(?:\s|>)/g) || []).length) {
    throw new Error('El sitemap no contiene un conjunto válido de entre 1 y 10.000 URLs.')
  }
  if (new Set(urls).size !== urls.length) throw new Error('El sitemap contiene URLs duplicadas.')
  return urls
}

async function fetchPublic(url, fetchImpl, options = {}) {
  return fetchImpl(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { 'User-Agent': 'Control-G-SEO-Discovery/1.0' },
    ...options,
  })
}

export async function loadPublishedUrls({ fetchImpl = fetch } = {}) {
  const response = await fetchPublic(`${SITE_ORIGIN}/sitemap.xml`, fetchImpl)
  if (response.status !== 200) throw new Error(`Sitemap no disponible: HTTP ${response.status}.`)
  return parseSitemapUrls(await response.text())
}

export async function verifyOwnershipKey({ fetchImpl = fetch } = {}) {
  const response = await fetchPublic(KEY_LOCATION, fetchImpl)
  if (response.status !== 200 || (await response.text()).trim() !== INDEXNOW_KEY) {
    throw new Error('El archivo público de propiedad IndexNow falta o no coincide exactamente con la clave.')
  }
  return true
}

export async function verifyPublishedUrls(urls, { fetchImpl = fetch, concurrency = 4 } = {}) {
  const candidates = urls.map(validatePublicUrl)
  let cursor = 0
  const errors = []
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), candidates.length) }, async () => {
    while (cursor < candidates.length) {
      const url = candidates[cursor++]
      try {
        const response = await fetchPublic(url, fetchImpl, { method: 'HEAD' })
        const contentType = response.headers.get('content-type') || ''
        const robots = response.headers.get('x-robots-tag') || ''
        if (response.status !== 200 || !contentType.includes('text/html') || /noindex|none/i.test(robots)) {
          throw new Error(`HTTP ${response.status}; tipo ${contentType}; robots ${robots || 'sin restricción'}`)
        }
      } catch (error) {
        errors.push(`${url}: ${error.message}`)
      }
    }
  }))
  if (errors.length) throw new Error(`Se canceló el envío: ${errors.length} URL(s) no verificadas.\n${errors.join('\n')}`)
  return candidates
}

export async function waitForRevision(expectedRevision, {
  fetchImpl = fetch,
  sleepImpl = delay,
  now = Date.now,
  timeoutMs = 600_000,
  intervalMs = 30_000,
  onAttempt = () => {},
} = {}) {
  if (!/^[a-f0-9]{40}$/i.test(expectedRevision || '')) throw new Error('La revisión esperada debe ser un SHA completo de Git.')
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 600_000
    || !Number.isFinite(intervalMs) || intervalMs < 1 || intervalMs > 30_000) {
    throw new Error('La espera debe estar entre 1 ms y 10 minutos, con intervalo máximo de 30 segundos.')
  }
  const startedAt = now()
  let lastState = 'manifiesto todavía no disponible'
  while (now() - startedAt < timeoutMs) {
    try {
      const remainingMs = timeoutMs - (now() - startedAt)
      const response = await fetchPublic(`${SITE_ORIGIN}/seo-manifest.json`, fetchImpl, {
        cache: 'no-store',
        signal: AbortSignal.timeout(Math.max(1, Math.min(REQUEST_TIMEOUT_MS, remainingMs))),
        headers: { 'User-Agent': 'Control-G-SEO-Discovery/1.0', 'Cache-Control': 'no-cache' },
      })
      if (response.status === 200) {
        const manifest = await response.json()
        if (manifest.sourceRevision === expectedRevision) return manifest
        lastState = `revisión publicada ${String(manifest.sourceRevision || 'desconocida').slice(0, 40)}`
      } else lastState = `manifiesto HTTP ${response.status}`
    } catch (error) {
      lastState = error.name === 'TimeoutError' ? 'consulta del manifiesto agotó su tiempo' : 'manifiesto no disponible o inválido'
    }
    onAttempt({ expectedRevision, lastState, elapsedMs: now() - startedAt })
    const remainingMs = timeoutMs - (now() - startedAt)
    if (remainingMs > 0) await sleepImpl(Math.min(intervalMs, remainingMs))
  }
  throw new Error(`No se notificaron URLs: producción no publicó la revisión ${expectedRevision} en 10 minutos (${lastState}).`)
}

export function buildIndexNowPayload(urls) {
  if (!Array.isArray(urls) || !urls.length || urls.length > 10_000) {
    throw new Error('IndexNow requiere entre 1 y 10.000 URLs.')
  }
  const urlList = urls.map(validatePublicUrl)
  if (new Set(urlList).size !== urlList.length) throw new Error('No se permiten URLs duplicadas.')
  return { host: 'www.controlg.co', key: INDEXNOW_KEY, keyLocation: KEY_LOCATION, urlList }
}

export async function notifyPublishedUrls({
  submit = false,
  expectedRevision,
  fetchImpl = fetch,
  waitOptions = {},
} = {}) {
  if (submit && !expectedRevision) throw new Error('Un envío requiere --revision con el SHA de la versión publicada.')
  if (expectedRevision) await waitForRevision(expectedRevision, { ...waitOptions, fetchImpl })
  await verifyOwnershipKey({ fetchImpl })
  const urls = await loadPublishedUrls({ fetchImpl })
  await verifyPublishedUrls(urls, { fetchImpl })
  const payload = buildIndexNowPayload(urls)
  if (!submit) return { mode: 'dry-run', submitted: false, indexed: null, urlCount: urls.length, keyLocation: KEY_LOCATION }
  // A second deployment may have replaced the release while its pages were
  // checked. Do not notify from a different revision in that case.
  const manifestResponse = await fetchPublic(`${SITE_ORIGIN}/seo-manifest.json`, fetchImpl, {
    cache: 'no-store',
    headers: { 'User-Agent': 'Control-G-SEO-Discovery/1.0', 'Cache-Control': 'no-cache' },
  })
  const currentManifest = manifestResponse.status === 200 ? await manifestResponse.json() : null
  if (currentManifest?.sourceRevision !== expectedRevision) {
    throw new Error('No se notificaron URLs: la revisión publicada cambió durante la comprobación.')
  }
  const response = await fetchPublic(INDEXNOW_ENDPOINT, fetchImpl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'User-Agent': 'Control-G-SEO-Discovery/1.0' },
    body: JSON.stringify(payload),
  })
  if (![200, 202].includes(response.status)) {
    throw new Error(`IndexNow no aceptó la notificación: HTTP ${response.status}. No se confirma recepción ni indexación.`)
  }
  return {
    mode: 'submit',
    submitted: true,
    indexed: null,
    status: response.status,
    state: response.status === 202 ? 'received-key-validation-pending' : 'received',
    urlCount: urls.length,
    sourceRevision: expectedRevision,
    message: response.status === 202
      ? 'URLs recibidas; validación de propiedad pendiente. La indexación no está confirmada.'
      : 'Notificación recibida por IndexNow. La indexación no está confirmada.',
  }
}

export function parseArguments(args) {
  const options = { submit: false, expectedRevision: undefined, help: false }
  for (let index = 0; index < args.length; index++) {
    const value = args[index]
    if (value === '--submit') options.submit = true
    else if (value === '--dry-run') options.submit = false
    else if (value === '--revision') options.expectedRevision = args[++index]
    else if (value === '--help' || value === '-h') options.help = true
    else throw new Error(`Argumento no reconocido: ${value}`)
  }
  if (args.includes('--revision') && !/^[a-f0-9]{40}$/i.test(options.expectedRevision || '')) {
    throw new Error('--revision requiere el SHA completo de Git.')
  }
  return options
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArguments(process.argv.slice(2))
    if (options.help) {
      console.log('Uso: node scripts/submit-indexnow.mjs [--dry-run] [--revision SHA]\n     node scripts/submit-indexnow.mjs --submit --revision SHA\nLa comprobación es de solo lectura por defecto. El envío espera hasta 10 minutos a que producción publique ese SHA.')
    } else {
      const result = await notifyPublishedUrls({
        ...options,
        waitOptions: { onAttempt: ({ lastState }) => console.log(`Esperando despliegue: ${lastState}.`) },
      })
      console.log(JSON.stringify(result, null, 2))
    }
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
