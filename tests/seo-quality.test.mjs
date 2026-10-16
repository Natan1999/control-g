import assert from 'node:assert/strict'
import test from 'node:test'
import { checkSeoBuild, inspectHtml, mapConcurrent } from '../scripts/seo-check.mjs'
import { fetchSeoDocument, normalizedProbeOrigin, probeSeo } from '../scripts/seo-probe.mjs'
import { buildLlms, buildRss, buildSitemap, renderMarketingDocument } from '../scripts/lib/marketing-html.mjs'

const origin = 'https://www.controlg.co'
const pages = [{ path: '/', heading: 'Control G', lead: 'Encuestas', sections: [], faqs: [] }]
const posts = [{ slug: 'guia', title: 'Guía', description: 'Descripción de la guía', publishedAt: '2026-10-15', updatedAt: '2026-10-15', intro: ['Preparación'], sections: [], faqs: [], sources: [] }]
const paths = ['/', '/blog', '/blog/guia']
const shell = '<html lang="es"><head></head><body><div id="root"></div></body></html>'
const makeHtml = (path, overrides = {}) => renderMarketingDocument(shell,
  `<main><h1>Título ${path}</h1><a href="/blog/guia">Guía relacionada</a><a href="https://wa.me/573009010300">Solicitar demo</a><img src="/imagen.jpg" alt="Trabajo de campo" width="720" height="480"></main>`,
  { title: `Título ${path}`, description: `Descripción ${path}`, canonical: `${origin}${path}`, locale: 'es-CO', type: 'website', image: `${origin}/imagen.jpg`, imageAlt: 'Trabajo de campo', structuredData: { '@type': 'WebPage', name: path }, ...overrides })

function fixture() {
  return new Map([
    ['/seo-manifest.json', JSON.stringify({ site: origin, sourceRevision: 'a'.repeat(40), pages: paths, articles: 1 })],
    ['/index.html', makeHtml('/')], ['/blog/index.html', makeHtml('/blog')], ['/blog/guia/index.html', makeHtml('/blog/guia')],
    ['/sitemap.xml', buildSitemap(pages, posts)], ['/rss.xml', buildRss(posts)],
    ['/llms.txt', buildLlms(pages, posts)], ['/llms-full.txt', buildLlms(pages, posts, true)],
    ['/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml`],
    ['/404.html', renderMarketingDocument(shell, '<main><h1>Página no encontrada</h1></main>', null)],
    ['/imagen.jpg', 'image'], ['/blog-catalog.json', '{"posts":[]}'],
  ])
}
const buildOptions = files => ({
  distDir: '/fixture',
  read: async path => { const value = files.get(path.replace('/fixture', '')); if (value === undefined) throw Error('missing'); return value },
  exists: async path => { if (!files.has(path.replace('/fixture', ''))) throw Error('missing') },
})

test('el chequeo local acepta un inventario completo SSR con documentos coherentes', async () => {
  const result = await checkSeoBuild(buildOptions(fixture()))
  assert.equal(result.ok, true, JSON.stringify(result.errors))
  assert.equal(result.pages, 3)
  assert.equal(result.articles, 1)
})

test('los errores de canonical SSR H1 schema y alt bloquean mientras longitud y dimensiones avisan', () => {
  const bad = inspectHtml('<html><head><title>Artículo</title><meta name="description" content="Guía"><link rel="canonical" href="https://otro.example"><script type="application/ld+json">{mal}</script></head><body><h1>Uno</h1><h1>Dos</h1><img src="/a.jpg"></body></html>', { path: '/blog/guia' })
  for (const code of ['CANONICAL', 'SSR', 'H1', 'SCHEMA_INVALID', 'IMAGE_ALT']) assert.ok(bad.errors.some(item => item.code === code), code)
  const long = inspectHtml(makeHtml('/', { title: 'Un título editorial que puede ser largo sin convertir una recomendación de presentación en un error artificial de validación' }).replace(' width="720" height="480"', ''))
  assert.equal(long.errors.length, 0)
  assert.ok(long.warnings.some(item => item.code === 'TITLE_LENGTH'))
  assert.ok(long.warnings.some(item => item.code === 'IMAGE_DIMENSIONS'))
})

test('el chequeo detecta enlaces rotos títulos duplicados imágenes ausentes y omisiones de sitemap', async () => {
  const files = fixture()
  files.set('/blog/guia/index.html', makeHtml('/blog/guia', { title: 'Título /blog' }).replace('href="/blog/guia"', 'href="/blog/no-publicado"'))
  files.delete('/imagen.jpg')
  files.set('/sitemap.xml', buildSitemap(pages, []))
  const result = await checkSeoBuild(buildOptions(files))
  assert.equal(result.ok, false)
  for (const code of ['DUPLICATE_TITLE', 'LINK_NOT_PUBLISHED', 'IMAGE_FILE', 'SITEMAP_MISSING']) assert.ok(result.errors.some(item => item.code === code), code)
})

test('la concurrencia nunca excede el límite configurado', async () => {
  let active = 0, maximum = 0
  const values = await mapConcurrent(Array.from({ length: 20 }, (_, index) => index), async value => {
    active++; maximum = Math.max(maximum, active)
    await new Promise(resolve => setImmediate(resolve))
    active--; return value * 2
  }, 6)
  assert.ok(maximum <= 6)
  assert.deepEqual(values, Array.from({ length: 20 }, (_, index) => index * 2))
})

function mockFetch({ soft404 = false, privateNoindex = true, corruptCatalog = false } = {}) {
  const files = fixture()
  return async (input, options = {}) => {
    const path = new URL(input).pathname
    if (path.includes('seo-probe-')) return new Response('<html><meta name="robots" content="noindex"></html>', { status: soft404 ? 200 : 404, headers: { 'content-type': 'text/html', 'x-robots-tag': 'noindex' } })
    if (/^\/(?:login|recuperar|restablecer|admin|coord|apoyo|field)/.test(path)) return new Response('', { headers: { 'content-type': 'text/html', ...(privateNoindex ? { 'x-robots-tag': 'noindex, nofollow' } : {}) } })
    const file = paths.includes(path) ? (path === '/' ? '/index.html' : `${path}/index.html`) : path
    const body = files.get(file)
    if (body === undefined) return new Response('', { status: 404 })
    const type = path.endsWith('.json') ? 'application/json' : path.endsWith('.xml') ? 'application/xml' : path.endsWith('.txt') ? 'text/plain' : 'text/html'
    return new Response(options.method === 'HEAD' ? '' : path === '/blog-catalog.json' && corruptCatalog ? '{"posts":[{"created_by":"internal"}]}' : body, { headers: { 'content-type': type, ...(path === '/blog-catalog.json' ? { 'x-robots-tag': 'noindex' } : {}) } })
  }
}

test('la sonda valida páginas feeds manifest rutas privadas y404 con solo lecturas', async () => {
  const result = await probeSeo({ fetchImpl: mockFetch() })
  assert.equal(result.ok, true, JSON.stringify(result.errors))
  assert.equal(result.pages, 3)
  assert.equal(result.articles, 1)
  assert.equal(result.sourceRevision, 'a'.repeat(40))
})

test('la sonda denuncia soft404 exclusión privada ausente catálogo interno y revisión incorrecta', async () => {
  const result = await probeSeo({ fetchImpl: mockFetch({ soft404: true, privateNoindex: false, corruptCatalog: true }), expectedRevision: 'b'.repeat(40) })
  assert.equal(result.ok, false)
  for (const code of ['SOFT_404', 'PRIVATE_NOINDEX', 'CATALOG', 'REVISION_MISMATCH']) assert.ok(result.errors.some(item => item.code === code), code)
})

test('solo se siguen redirecciones públicas y el origen no acepta credenciales ni parámetros', async () => {
  let calls = 0
  const result = await fetchSeoDocument('https://controlg.co/blog', { fetchImpl: async () => ++calls === 1 ? new Response('', { status: 307, headers: { location: 'https://www.controlg.co/blog' } }) : new Response('Contenido') })
  assert.equal(result.status, 200)
  assert.equal(result.redirects.length, 1)
  assert.equal(result.redirects[0].host, 'www.controlg.co')
  await assert.rejects(fetchSeoDocument(`${origin}/blog`, { fetchImpl: async () => new Response('', { status: 302, headers: { location: 'https://otro.example/' } }) }), /origen público/)
  for (const candidate of ['https://user:password@www.controlg.co/', `${origin}/?token=secreto`, 'http://www.controlg.co/']) assert.throws(() => normalizedProbeOrigin(candidate))
  assert.equal(normalizedProbeOrigin('http://127.0.0.1:4173/'), 'http://127.0.0.1:4173')
})
