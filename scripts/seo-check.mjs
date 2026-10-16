#!/usr/bin/env node
import { readFile, access } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SITE_ORIGIN, parseSitemapUrls, validatePublicUrl } from './submit-indexnow.mjs'

const PRIVATE = /^\/(?:api|login|admin|coord|apoyo|field|recuperar-contrasena|restablecer-contrasena)(?:\/|$)/
const decode = value => String(value || '').replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replace(/&#(\d+);/g, (match, number) => Number(number) <= 0x10ffff ? String.fromCodePoint(Number(number)) : match)
const text = value => decode(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
const issue = (path, code, message) => ({ path, code, message })

export function htmlAttributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([a-zA-Z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
    .map(match => [match[1].toLowerCase(), decode(match[2] ?? match[3] ?? match[4])]))
}

export function extractHtmlFacts(html) {
  const tags = name => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(match => htmlAttributes(match[0]))
  const meta = tags('meta')
  return {
    titles: [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map(match => text(match[1])),
    descriptions: meta.filter(tag => tag.name === 'description').map(tag => tag.content || ''),
    robots: meta.filter(tag => tag.name === 'robots').map(tag => tag.content || '').join(','),
    canonicals: tags('link').filter(tag => (tag.rel || '').split(/\s+/).includes('canonical')).map(tag => tag.href),
    headings: [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(match => text(match[1])),
    links: tags('a').map(tag => tag.href).filter(Boolean),
    images: tags('img'),
    stylesheets: tags('link').filter(tag => tag.rel === 'stylesheet').map(tag => tag.href),
    schemas: [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
      .filter(match => htmlAttributes(match[1]).type === 'application/ld+json').map(match => match[2]),
    ssr: /<div\b(?=[^>]*\bid="root")(?=[^>]*\bdata-seo-static="true")[^>]*>[\s\S]*?<main\b/i.test(html),
    language: htmlAttributes(html.match(/<html\b[^>]*>/i)?.[0] || '').lang,
  }
}

export function inspectHtml(html, { path = '/', site = SITE_ORIGIN, indexable = true } = {}) {
  const errors = []
  const warnings = []
  const facts = extractHtmlFacts(html)
  if (facts.titles.length !== 1 || !facts.titles[0]) errors.push(issue(path, 'TITLE', 'Debe existir un título útil y único en el documento.'))
  if (facts.descriptions.length !== 1 || !facts.descriptions[0].trim()) errors.push(issue(path, 'DESCRIPTION', 'Debe existir una descripción útil y única en el documento.'))
  if (facts.headings.length !== 1 || !facts.headings[0]) errors.push(issue(path, 'H1', 'El contenido debe tener exactamente un encabezado H1 útil.'))
  if (!facts.ssr) errors.push(issue(path, 'SSR', 'Falta contenido principal real en el HTML inicial.'))
  if (!facts.language) errors.push(issue(path, 'LANGUAGE', 'Falta el idioma del documento.'))
  if (indexable) {
    if (facts.canonicals.length !== 1 || facts.canonicals[0] !== `${site}${path}`) errors.push(issue(path, 'CANONICAL', 'La URL canónica no coincide con la página publicada.'))
    if (/noindex|\bnone\b/i.test(facts.robots)) errors.push(issue(path, 'NOINDEX', 'Una página pública está marcada como no indexable.'))
    if (!facts.schemas.length) errors.push(issue(path, 'SCHEMA_MISSING', 'Faltan datos estructurados.'))
  } else if (!/noindex/i.test(facts.robots)) errors.push(issue(path, '404_NOINDEX', 'La página404 debe excluirse de los resultados.'))
  for (const source of facts.schemas) {
    try {
      const schema = JSON.parse(source)
      if (!schema || typeof schema !== 'object' || (!schema['@type'] && !Array.isArray(schema['@graph']))) throw Error('shape')
    } catch { errors.push(issue(path, 'SCHEMA_INVALID', 'Hay datos estructurados que no son JSON-LD válido.')) }
  }
  facts.images.forEach((image, index) => {
    if (!Object.hasOwn(image, 'alt')) errors.push(issue(path, 'IMAGE_ALT', `La imagen ${index + 1} necesita texto alternativo o alt vacío si es decorativa.`))
    if (!image.src) errors.push(issue(path, 'IMAGE_SRC', `La imagen ${index + 1} no tiene origen.`))
    if (!image.width || !image.height) warnings.push(issue(path, 'IMAGE_DIMENSIONS', `Conviene reservar dimensiones para la imagen ${index + 1}.`))
  })
  if (facts.titles[0]?.length > 80) warnings.push(issue(path, 'TITLE_LENGTH', 'El título puede truncarse; revisar legibilidad, sin imponer un límite editorial rígido.'))
  if (facts.descriptions[0]?.length > 220) warnings.push(issue(path, 'DESCRIPTION_LENGTH', 'La descripción es extensa; revisar el resumen visible en búsqueda.'))
  if (indexable && !facts.links.some(href => href.startsWith('https://wa.me/573009010300'))) errors.push(issue(path, 'CONTACT_LINK', 'Falta una llamada comercial a WhatsApp.'))
  return { errors, warnings, facts }
}

export async function mapConcurrent(values, work, limit = 6) {
  const results = Array(values.length)
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++
      results[index] = await work(values[index], index)
    }
  }))
  return results
}

export function validatePublicLinks(facts, path, paths) {
  const errors = []
  for (const href of facts.links) {
    let url
    try { url = new URL(href, `${SITE_ORIGIN}${path}`) } catch { errors.push(issue(path, 'LINK_INVALID', 'Hay un enlace con URL inválida.')); continue }
    if (url.origin !== SITE_ORIGIN || PRIVATE.test(url.pathname)) continue
    const target = url.pathname === '/' ? '/' : url.pathname.replace(/\/$/, '')
    if (!paths.has(target) && !/\.[a-z0-9]+$/i.test(target)) errors.push(issue(path, 'LINK_NOT_PUBLISHED', `El enlace interno ${target} no está en el inventario público.`))
  }
  return errors
}

export function checkDiscoveryDocuments({ sitemap, rss, llms, llmsFull, paths }) {
  const errors = []
  let urls = []
  try { urls = parseSitemapUrls(sitemap) } catch { errors.push(issue('/sitemap.xml', 'SITEMAP_INVALID', 'El sitemap no es válido o incluye URLs no publicables.')) }
  const listed = new Set(urls.map(url => new URL(url).pathname))
  for (const path of paths) if (!listed.has(path)) errors.push(issue(path, 'SITEMAP_MISSING', 'La página publicada falta en el sitemap.'))
  for (const path of listed) if (!paths.has(path)) errors.push(issue(path, 'SITEMAP_EXTRA', 'El sitemap contiene una página ajena al inventario.'))
  if (!/<rss\b/.test(rss) || !/<channel>/.test(rss) || /Invalid Date/.test(rss)) errors.push(issue('/rss.xml', 'RSS_INVALID', 'El RSS no tiene un canal válido o contiene fechas inválidas.'))
  for (const path of paths) {
    if (path.startsWith('/blog/') && !rss.includes(`${SITE_ORIGIN}${path}`)) errors.push(issue(path, 'RSS_MISSING', 'El artículo falta en el RSS.'))
    if (!llms.includes(`${SITE_ORIGIN}${path}`) && path !== '/blog') errors.push(issue(path, 'LLMS_MISSING', 'La página falta en el catálogo legible.'))
  }
  if (!llms.startsWith('# Control G') || !llmsFull.startsWith('# Control G') || llmsFull.length < llms.length) errors.push(issue('/llms-full.txt', 'LLMS_INVALID', 'Los documentos legibles no contienen el catálogo esperado.'))
  return errors
}

export async function checkSeoBuild({ distDir = resolve('dist'), read = readFile, exists = access } = {}) {
  const report = { ok: false, pages: 0, articles: 0, images: 0, errors: [], warnings: [] }
  let manifest
  try { manifest = JSON.parse(await read(join(distDir, 'seo-manifest.json'), 'utf8')) }
  catch { report.errors.push(issue('/seo-manifest.json', 'MANIFEST', 'Falta un manifiesto de compilación válido.')); return report }
  if (manifest.site !== SITE_ORIGIN || !Array.isArray(manifest.pages) || !manifest.pages.length) {
    report.errors.push(issue('/seo-manifest.json', 'MANIFEST', 'El manifiesto debe identificar el dominio y las páginas públicas.')); return report
  }
  const paths = new Set()
  for (const path of manifest.pages) {
    try { validatePublicUrl(`${SITE_ORIGIN}${path}`); paths.add(path) }
    catch { report.errors.push(issue('/seo-manifest.json', 'MANIFEST_PATH', 'El manifiesto incluye una ruta inválida o privada.')) }
  }
  if (paths.size !== manifest.pages.length) report.errors.push(issue('/seo-manifest.json', 'MANIFEST_DUPLICATE', 'Hay rutas repetidas o inválidas en el manifiesto.'))
  report.pages = paths.size
  report.articles = [...paths].filter(path => path.startsWith('/blog/')).length
  if (manifest.articles !== report.articles) report.errors.push(issue('/seo-manifest.json', 'ARTICLE_COUNT', 'El número de artículos no coincide con sus URLs.'))
  const results = await mapConcurrent([...paths], async path => {
    try {
      const html = await read(path === '/' ? join(distDir, 'index.html') : join(distDir, path, 'index.html'), 'utf8')
      return { path, ...inspectHtml(html, { path }) }
    } catch { return { path, errors: [issue(path, 'HTML_MISSING', 'Falta el documento HTML publicado.')], warnings: [] } }
  })
  const titles = new Map(), descriptions = new Map(), headings = new Map(), localImages = new Set()
  for (const result of results) {
    report.errors.push(...result.errors); report.warnings.push(...result.warnings)
    if (!result.facts) continue
    report.errors.push(...validatePublicLinks(result.facts, result.path, paths))
    report.images += result.facts.images.length
    for (const [values, map, code] of [[result.facts.titles, titles, 'DUPLICATE_TITLE'], [result.facts.descriptions, descriptions, 'DUPLICATE_DESCRIPTION'], [result.facts.headings, headings, 'DUPLICATE_H1']]) {
      const value = values[0]?.trim().toLowerCase()
      if (value && map.has(value)) report.errors.push(issue(result.path, code, `El texto principal se repite exactamente en ${map.get(value)}.`))
      else if (value) map.set(value, result.path)
    }
    for (const image of result.facts.images) {
      try { const url = new URL(image.src, SITE_ORIGIN); if (url.origin === SITE_ORIGIN) localImages.add(url.pathname) } catch {}
    }
  }
  await mapConcurrent([...localImages], async path => {
    if (/\.\.|%|\\/.test(path)) { report.errors.push(issue(path, 'IMAGE_PATH', 'La imagen usa una ruta no admitida.')); return }
    try { await exists(join(distDir, path)) } catch { report.errors.push(issue(path, 'IMAGE_FILE', 'Falta el archivo de imagen referenciado.')) }
  })
  try {
    const [sitemap, rss, llms, llmsFull, notFound, robots] = await Promise.all(['sitemap.xml', 'rss.xml', 'llms.txt', 'llms-full.txt', '404.html', 'robots.txt'].map(name => read(join(distDir, name), 'utf8')))
    report.errors.push(...checkDiscoveryDocuments({ sitemap, rss, llms, llmsFull, paths }))
    report.errors.push(...inspectHtml(notFound, { path: '/404', indexable: false }).errors)
    if (!robots.includes(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`)) report.errors.push(issue('/robots.txt', 'ROBOTS_SITEMAP', 'Falta la referencia al sitemap canónico.'))
  } catch { report.errors.push(issue('/sitemap.xml', 'DISCOVERY_FILES', 'Falta un documento de descubrimiento o la página404.')) }
  report.ok = report.errors.length === 0
  return report
}

export function printSeoReport(report, label = 'SEO') {
  console.log(`${label}: ${report.ok ? 'CORRECTO' : 'CON ERRORES'} · ${report.pages || 0} páginas · ${report.articles || 0} artículos · ${report.errors.length} errores · ${report.warnings.length} avisos.`)
  for (const item of report.errors) console.error(`[${item.code}] ${item.path}: ${item.message}`)
  for (const item of report.warnings.slice(0, 12)) console.warn(`[AVISO ${item.code}] ${item.path}: ${item.message}`)
  if (report.warnings.length > 12) console.warn(`${report.warnings.length - 12} avisos adicionales; use --json para el detalle.`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = await checkSeoBuild()
    if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2))
    else printSeoReport(report, 'SEO de compilación')
    if (!report.ok) process.exitCode = 1
  } catch { console.error('No fue posible completar el chequeo SEO de la compilación.'); process.exitCode = 1 }
}
