#!/usr/bin/env node
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SITE_ORIGIN, parseSitemapUrls } from './submit-indexnow.mjs'
import { inspectHtml, mapConcurrent, validatePublicLinks, checkDiscoveryDocuments, printSeoReport } from './seo-check.mjs'

export function normalizedProbeOrigin(value = SITE_ORIGIN) {
  const url = new URL(value)
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw Error('Origen de comprobación inválido.')
  return url.origin
}

export async function fetchSeoDocument(url, { fetchImpl = fetch, method = 'GET', timeoutMs = 12_000, maxRedirects = 4 } = {}) {
  let current = new URL(url)
  const initial = current.origin
  const redirects = []
  for (let attempt = 0; attempt <= maxRedirects; attempt++) {
    const response = await fetchImpl(current.href, { method, redirect: 'manual', signal: AbortSignal.timeout(timeoutMs), headers: { 'User-Agent': 'Control-G-SEO-Probe/1.0', Accept: '*/*' } })
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location')
      if (!location || attempt === maxRedirects) throw Error('Cadena de redirección inválida.')
      const target = new URL(location, current)
      const publicDomain = ['controlg.co', 'www.controlg.co'].includes(target.hostname)
      if ((target.origin !== initial && !publicDomain) || (target.protocol !== 'https:' && target.origin !== initial) || target.username || target.password) throw Error('La redirección sale del origen público admitido.')
      redirects.push({ status: response.status, from: current.pathname, to: target.pathname, host: target.hostname })
      current = target
      continue
    }
    return { status: response.status, headers: response.headers, body: method === 'HEAD' ? '' : await response.text(), url: current.href, redirects }
  }
  throw Error('No se pudo resolver el documento público.')
}

export async function probeSeo({ baseUrl = process.env.SEO_BASE_URL || SITE_ORIGIN, fetchImpl = fetch, expectedRevision = process.env.SEO_EXPECTED_REVISION } = {}) {
  const base = normalizedProbeOrigin(baseUrl)
  const report = { ok: false, baseUrl: base, pages: 0, articles: 0, errors: [], warnings: [], redirects: [] }
  const get = async (path, method = 'GET') => {
    try {
      const result = await fetchSeoDocument(`${base}${path}`, { fetchImpl, method })
      report.redirects.push(...result.redirects.map(item => ({ path, ...item })))
      return result
    } catch { report.errors.push({ path, code: 'HTTP_UNAVAILABLE', message: 'No fue posible consultar este documento público.' }); return null }
  }
  const [manifestResponse, sitemapResponse] = await Promise.all([get('/seo-manifest.json'), get('/sitemap.xml')])
  let manifest, urls
  try {
    if (manifestResponse?.status !== 200) throw Error('manifest')
    manifest = JSON.parse(manifestResponse.body)
    if (manifest.site !== SITE_ORIGIN || !Array.isArray(manifest.pages) || !/^[a-f0-9]{40}$/i.test(manifest.sourceRevision || '')) throw Error('manifest')
    report.sourceRevision = manifest.sourceRevision
    if (!/application\/json/i.test(manifestResponse.headers.get('content-type') || '')) report.errors.push({ path: '/seo-manifest.json', code: 'MANIFEST_TYPE', message: 'El manifiesto no se entrega como JSON.' })
    if (expectedRevision && manifest.sourceRevision !== expectedRevision) report.errors.push({ path: '/seo-manifest.json', code: 'REVISION_MISMATCH', message: 'La revisión pública no coincide con la esperada.' })
  } catch { report.errors.push({ path: '/seo-manifest.json', code: 'MANIFEST', message: 'No hay un manifiesto público válido de la revisión desplegada.' }) }
  try { if (sitemapResponse?.status !== 200) throw Error('sitemap'); urls = parseSitemapUrls(sitemapResponse.body) }
  catch { report.errors.push({ path: '/sitemap.xml', code: 'SITEMAP', message: 'El sitemap público no responde correctamente.' }); return report }
  const paths = new Set(urls.map(url => new URL(url).pathname))
  if (!/xml/i.test(sitemapResponse.headers.get('content-type') || '')) report.errors.push({ path: '/sitemap.xml', code: 'SITEMAP_TYPE', message: 'El sitemap no se entrega como XML.' })
  report.pages = paths.size
  report.articles = [...paths].filter(path => path.startsWith('/blog/')).length
  if (manifest && (manifest.pages.length !== paths.size || manifest.pages.some(path => !paths.has(path)))) report.warnings.push({ path: '/seo-manifest.json', code: 'CMS_RUNTIME_CHANGE', message: 'El catálogo vivo difiere de la compilación; puede deberse a publicaciones o archivos posteriores del CMS.' })
  const pages = await mapConcurrent([...paths], async path => ({ path, response: await get(path) }), 6)
  const assets = new Set()
  for (const { path, response } of pages) {
    if (!response) continue
    if (response.status !== 200) { report.errors.push({ path, code: 'PUBLIC_STATUS', message: `Página del sitemap con HTTP ${response.status}.` }); continue }
    if (!/text\/html/i.test(response.headers.get('content-type') || '')) report.errors.push({ path, code: 'PUBLIC_TYPE', message: 'Una página pública no se entrega como HTML.' })
    const result = inspectHtml(response.body, { path })
    report.errors.push(...result.errors, ...validatePublicLinks(result.facts, path, paths))
    report.warnings.push(...result.warnings)
    if (/noindex|\bnone\b/i.test(response.headers.get('x-robots-tag') || '')) report.errors.push({ path, code: 'PUBLIC_NOINDEX_HEADER', message: 'La cabecera HTTP excluye una página pública.' })
    if (path === '/') for (const href of result.facts.stylesheets) { try { const target = new URL(href, SITE_ORIGIN); if (target.origin === SITE_ORIGIN) assets.add(target.pathname) } catch {} }
  }
  const extraPaths = ['/rss.xml', '/llms.txt', '/llms-full.txt', '/robots.txt', '/blog-catalog.json', '/seo-probe-pagina-inexistente', '/blog/seo-probe-articulo-inexistente', '/login', '/recuperar-contrasena', '/restablecer-contrasena', '/admin', '/coord', '/apoyo', '/field', ...assets]
  const extras = await mapConcurrent(extraPaths, async path => ({ path, response: await get(path, /^\/(?:login|recuperar|restablecer|admin|coord|apoyo|field)/.test(path) || assets.has(path) ? 'HEAD' : 'GET') }), 6)
  const documents = new Map(extras.map(item => [item.path, item.response]))
  for (const { path, response } of extras) {
    if (!response) continue
    if (path.includes('seo-probe-')) {
      if (response.status !== 404) report.errors.push({ path, code: 'SOFT_404', message: `Una URL inexistente responde HTTP ${response.status}, debe responder404.` })
      if (!/noindex/i.test(`${response.headers.get('x-robots-tag') || ''} ${response.body}`)) report.errors.push({ path, code: '404_NOINDEX', message: 'La respuesta404 no excluye la URL de resultados.' })
      continue
    }
    if (response.status !== 200) report.errors.push({ path, code: 'DOCUMENT_STATUS', message: `El documento público responde HTTP ${response.status}.` })
    const expectedType = path === '/rss.xml' ? /xml/i : /\.(?:txt)$/.test(path) ? /text\/plain/i : path.endsWith('.json') ? /application\/json/i : null
    if (expectedType && !expectedType.test(response.headers.get('content-type') || '')) report.errors.push({ path, code: 'DOCUMENT_TYPE', message: 'El documento no utiliza su tipo de contenido público esperado.' })
    if (/^\/(?:login|recuperar|restablecer|admin|coord|apoyo|field)/.test(path) && !/noindex/i.test(response.headers.get('x-robots-tag') || '')) report.errors.push({ path, code: 'PRIVATE_NOINDEX', message: 'La ruta de acceso o privada no tiene cabecera noindex.' })
  }
  if (['/rss.xml', '/llms.txt', '/llms-full.txt'].every(path => documents.get(path)?.status === 200)) report.errors.push(...checkDiscoveryDocuments({ sitemap: sitemapResponse.body, rss: documents.get('/rss.xml').body, llms: documents.get('/llms.txt').body, llmsFull: documents.get('/llms-full.txt').body, paths }))
  const robots = documents.get('/robots.txt')
  if (robots?.status === 200 && !robots.body.includes(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`)) report.errors.push({ path: '/robots.txt', code: 'ROBOTS_SITEMAP', message: 'El robots no anuncia el sitemap canónico.' })
  const catalog = documents.get('/blog-catalog.json')
  if (catalog?.status === 200) {
    try {
      const data = JSON.parse(catalog.body)
      if (!Array.isArray(data.posts) || data.posts.some(post => ['created_by', 'user_id', 'entity_id', 'password', 'access_token'].some(key => Object.hasOwn(post, key)))) throw Error('catalog')
      if (!/noindex/i.test(catalog.headers.get('x-robots-tag') || '')) throw Error('noindex')
    } catch { report.errors.push({ path: '/blog-catalog.json', code: 'CATALOG', message: 'El catálogo editorial no es una proyección pública válida y noindex.' }) }
  }
  if (report.redirects.length) report.warnings.push({ path: '/', code: 'REDIRECTS', message: `${report.redirects.length} redirección(es) detectadas y seguidas; revisar el detalle JSON para consolidar el dominio canónico.` })
  report.ok = report.errors.length === 0
  return report
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = await probeSeo()
    if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2))
    else printSeoReport(report, 'SEO de producción')
    if (!report.ok) process.exitCode = 1
  } catch { console.error('No fue posible iniciar la sonda SEO: revise el origen público configurado.'); process.exitCode = 1 }
}
