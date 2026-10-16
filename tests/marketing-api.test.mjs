import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createMarketingHandler, publicRequestPath } from '../api/marketing.mjs'
import { escapeHtml } from '../scripts/lib/marketing-html.mjs'

const post = (slug, title = slug) => ({
  slug, title, description: `Guía ${title}`, excerpt: title, category: 'Guías', country: 'Colombia',
  publishedAt: '2026-10-15', updatedAt: '2026-10-15', readingMinutes: 5,
  keywords: ['encuestas'], intro: [title], sections: [{ title: 'Preparación', paragraphs: ['Contenido útil'] }],
  comparison: [], faqs: [], sources: [], verdict: title, whatsappMessage: 'Solicitar demo', image: '', imageAlt: '',
})
const local = post('guia-local', 'Guía local')
const shell = '<!doctype html><html lang="es"><head><title>Viejo</title></head><body><div id="root"></div></body></html>'
const metadata = (path, title) => ({
  title, description: `Descripción ${title}`, canonical: `https://www.controlg.co${path}`,
  locale: 'es-CO', image: 'https://www.controlg.co/og-image.png', imageAlt: 'Control G',
  type: path.startsWith('/blog/') ? 'article' : 'website', structuredData: { '@type': 'WebPage', name: title },
})
const renderer = {
  BLOG_POSTS: [local],
  SEO_PAGES: [{ path: '/', heading: 'Control G', lead: 'Encuestas', sections: [], faqs: [] }],
  marketingMetadata(path, posts) {
    if (path === '/' || path === '/blog') return metadata(path, 'Control G')
    const current = posts.find(item => path === `/blog/${item.slug}`)
    return current ? metadata(path, current.title) : null
  },
  renderMarketingRoute(path, posts) {
    const current = posts.find(item => path === `/blog/${item.slug}`)
    return `<main><h1>${escapeHtml(current?.title || 'Control G')}</h1></main>`
  },
}

function makeHandler(options = {}) {
  return createMarketingHandler({
    loadBundle: async () => renderer,
    loadShell: async () => shell,
    fetchBlog: async () => ({ available: true, posts: [] }),
    logger: { warn() {}, error() {} },
    ...options,
  })
}

async function request(handler, url, method = 'GET', query) {
  const result = { statusCode: 200, headers: {}, body: undefined }
  result.setHeader = (name, value) => { result.headers[name.toLowerCase()] = value }
  result.end = value => { result.body = value; return result }
  await handler({ url, method, query }, result)
  return result
}

test('el endpoint público rechaza métodos de escritura antes de cargar fuentes', async () => {
  let loads = 0
  const handler = makeHandler({ loadBundle: async () => { loads++; throw Error('No ejecutar') } })
  const response = await request(handler, '/blog', 'POST')
  assert.equal(response.statusCode, 405)
  assert.equal(response.headers.allow, 'GET, HEAD')
  assert.equal(loads, 0)
  assert.equal(JSON.parse(response.body).error, 'METHOD_NOT_ALLOWED')
})

test('la ruta pública permite documentos y slugs y bloquea rutas privadas y ambiguas', async () => {
  for (const path of ['/blog/../admin', '/blog//datos', '/blog/%2e%2e', '/admin', '/coord/map', '/field', '/api/health', '/blog/a\\b', 'https://otro.example/blog']) {
    assert.equal(publicRequestPath({ url: path }), null, path)
  }
  assert.equal(publicRequestPath({ url: '/api/marketing?path=/blog/datos' }), '/blog/datos')
  assert.equal(publicRequestPath({ url: '/api/marketing?path=/blog&path=/admin' }), null)
  assert.equal(publicRequestPath({ url: '/api/marketing', query: { path: ['/blog', '/admin'] } }), null)
  assert.equal(publicRequestPath({ url: '/blog/datos?utm_source=busqueda&path=/admin' }), '/blog/datos')
  assert.equal(publicRequestPath({ url: '/llms-full.txt' }), '/llms-full.txt')
  assert.equal((await request(makeHandler(), '/api/marketing?path=/admin')).statusCode, 404)
})

test('el HTML editorial integra título canonical y snapshot con escape de scripts', async () => {
  const remote = post('encuesta-nueva', 'Encuesta </script><script>alert(1)</script>')
  const response = await request(makeHandler({ fetchBlog: async () => ({ available: true, posts: [remote] }) }), '/blog/encuesta-nueva')
  assert.equal(response.statusCode, 200)
  assert.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  assert.match(response.body, /https:\/\/www\.controlg\.co\/blog\/encuesta-nueva/)
  assert.match(response.body, /control-g-blog-snapshot/)
  assert.doesNotMatch(response.body, /<script>alert\(1\)<\/script>/)
  assert.match(response.body, /\\u003c\/script>/)
  assert.equal(response.headers['x-control-g-editorial-source'], 'live')
  assert.equal(response.headers['vercel-cdn-cache-control'], 'no-store')
})

test('HEAD conserva estado metadatos y longitud sin devolver cuerpo', async () => {
  const handler = makeHandler()
  const get = await request(handler, '/blog/guia-local')
  const head = await request(handler, '/blog/guia-local', 'HEAD')
  assert.equal(head.statusCode, get.statusCode)
  assert.equal(head.headers['content-type'], get.headers['content-type'])
  assert.equal(head.headers['content-length'], Buffer.byteLength(get.body))
  assert.equal(head.body, undefined)
})

test('crear editar y archivar contenido CMS actualiza HTML y descubrimiento sin redeploy', async () => {
  let now = 0
  let remote = [post('guia-cms', 'Versión uno')]
  const handler = makeHandler({ now: () => now, fetchBlog: async () => ({ available: true, posts: remote }) })
  assert.match((await request(handler, '/blog/guia-cms')).body, /Versión uno/)
  remote = [post('guia-cms', 'Versión dos')]
  now += 30_001
  assert.match((await request(handler, '/blog/guia-cms')).body, /Versión dos/)
  assert.match((await request(handler, '/sitemap.xml')).body, /\/blog\/guia-cms/)
  assert.match((await request(handler, '/rss.xml')).body, /Versión dos/)
  assert.match((await request(handler, '/llms-full.txt')).body, /Versión dos/)
  remote = []
  now += 30_001
  assert.equal((await request(handler, '/blog/guia-cms')).statusCode, 404)
  assert.doesNotMatch((await request(handler, '/sitemap.xml')).body, /\/blog\/guia-cms/)
  assert.doesNotMatch((await request(handler, '/rss.xml')).body, /Versión dos/)
  assert.equal((await request(handler, '/blog/guia-local')).statusCode, 200)
})

test('un fallo CMS conserva la base local pero nunca expone un snapshot remoto obsoleto', async () => {
  const handler = makeHandler({
    loadSnapshot: async () => [post('guia-snapshot')],
    fetchBlog: async () => { throw Error('token-interno-prohibido') },
  })
  assert.equal((await request(handler, '/blog/guia-local')).statusCode, 200)
  const snapshot = await request(handler, '/blog/guia-snapshot')
  assert.equal(snapshot.statusCode, 503)
  const catalog = await request(handler, '/blog-catalog.json')
  assert.deepEqual(JSON.parse(catalog.body), { posts: [] })
  assert.equal(catalog.headers['x-control-g-editorial-source'], 'unavailable')
  assert.match(catalog.headers['x-robots-tag'], /noindex/)
  assert.equal(catalog.headers['cache-control'], 'no-store, max-age=0')
  assert.doesNotMatch((await request(handler, '/sitemap.xml')).body, /guia-snapshot/)
  const unknown = await request(handler, '/blog/publicacion-reciente')
  assert.equal(unknown.statusCode, 503)
  assert.equal(unknown.headers['retry-after'], '30')
  assert.equal(unknown.headers['cache-control'], 'no-store, max-age=0')
  assert.doesNotMatch(unknown.body, /token-interno-prohibido|stack|Error:/)
  assert.equal((await request(handler, '/ruta-no-existe')).statusCode, 404)
})

test('un post remoto archivado no reaparece cuando el proveedor falla después', async () => {
  let now = 0
  let mode = 'published'
  const handler = makeHandler({ now: () => now, fetchBlog: async () => {
    if (mode === 'failed') throw Error('Proveedor no disponible')
    return { available: true, posts: mode === 'published' ? [post('guia-remota')] : [] }
  } })
  assert.equal((await request(handler, '/blog/guia-remota')).statusCode, 200)
  mode = 'archived'; now += 30_001
  assert.equal((await request(handler, '/blog/guia-remota')).statusCode, 404)
  mode = 'failed'; now += 30_001
  assert.equal((await request(handler, '/blog/guia-remota')).statusCode, 503)
  assert.deepEqual(JSON.parse((await request(handler, '/blog-catalog.json')).body), { posts: [] })
  assert.equal((await request(handler, '/blog/guia-local')).statusCode, 200)
})

test('el catálogo solo devuelve posts remotos y solo se suministra configuración anónima', async () => {
  let receivedEnv
  const remote = post('guia-remota')
  const handler = makeHandler({
    env: { VITE_SUPABASE_URL: 'https://public.example', VITE_SUPABASE_ANON_KEY: 'anon-publica', SUPABASE_SERVICE_ROLE_KEY: 'privada-no-enviar' },
    fetchBlog: async ({ env }) => { receivedEnv = env; return { available: true, posts: [remote] } },
  })
  const response = await request(handler, '/blog-catalog.json')
  assert.deepEqual(JSON.parse(response.body), { posts: [remote] })
  assert.match(response.headers['x-robots-tag'], /noindex/)
  assert.equal(receivedEnv.VITE_SUPABASE_ANON_KEY, 'anon-publica')
  assert.equal(receivedEnv.SUPABASE_SERVICE_ROLE_KEY, undefined)
  assert.doesNotMatch(response.body, /privada-no-enviar|anon-publica/)
})

test('peticiones simultáneas comparten una lectura CMS de corta duración', async () => {
  let loads = 0
  const handler = makeHandler({ fetchBlog: async () => { loads++; await Promise.resolve(); return { available: true, posts: [] } } })
  await Promise.all(['/blog', '/sitemap.xml', '/rss.xml', '/llms.txt'].map(path => request(handler, path)))
  assert.equal(loads, 1)
})

test('las rutas Vercel mantienen APIs y SPA privadas y terminan en404 real', async () => {
  const config = JSON.parse(await readFile('vercel.json', 'utf8'))
  assert.equal(config.headers, undefined)
  assert.equal(config.rewrites, undefined)
  assert.equal(config.redirects, undefined)
  const filesystemIndex = config.routes.findIndex(route => route.handle === 'filesystem')
  const dynamicIndex = config.routes.findIndex(route => route.dest === '/api/marketing?path=/blog/$1')
  assert.ok(dynamicIndex >= 0 && dynamicIndex < filesystemIndex)
  const last = config.routes.at(-1)
  assert.equal(last.status, 404)
  assert.equal(last.dest, '/404.html')
  assert.ok(config.routes.slice(filesystemIndex + 1).some(route => route.dest === '/index.html' && route.src.includes('field')))
  assert.match(config.functions['api/marketing.mjs'].includeFiles, /\.server\/\*\*/)
  assert.equal(config.routes.find(route => route.headers?.Location === '/login').status, 307)
})
