import { readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { fetchPublicBlog, mergePublicPosts } from '../scripts/lib/public-blog.mjs'
import { buildLlms, buildRss, buildSitemap, buildSitemapHtml, renderMarketingDocument } from '../scripts/lib/marketing-html.mjs'

const PUBLIC_DOCUMENTS = new Set(['/sitemap.xml', '/sitemap.html', '/rss.xml', '/llms.txt', '/llms-full.txt', '/blog-catalog.json'])
const PRIVATE_PREFIX = /^\/(?:api|admin|coord|apoyo|field|login|demo|recuperar-contrasena|restablecer-contrasena)(?:\/|$)/
const CACHE_TTL_MS = 30_000

export function publicRequestPath(req) {
  const requestUrl = String(req.url || '')
  const pathname = requestUrl.split('?')[0]
  let path = pathname
  if (pathname === '/api/marketing' || pathname === '/api/marketing.mjs') {
    const query = new URLSearchParams(requestUrl.split('?').slice(1).join('?'))
    const values = query.getAll('path')
    if (values.length > 1 || Array.isArray(req.query?.path)) return null
    path = req.query?.path ?? values[0]
  }
  if (typeof path !== 'string' || path.length > 320 || /\.\.|\/\/|\\|%|\?|#/.test(path)) return null
  if (PUBLIC_DOCUMENTS.has(path)) return path
  if (!/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?\/?$/.test(path)
    || PRIVATE_PREFIX.test(path)) return null
  return path.length > 1 ? path.replace(/\/$/, '') : path
}

function reply(req, res, status, body, contentType, { source, noindex = status >= 400, noStore = false } = {}) {
  res.statusCode = status
  res.setHeader('Content-Type', `${contentType}; charset=utf-8`)
  res.setHeader('Content-Length', Buffer.byteLength(body))
  res.setHeader('Allow', 'GET, HEAD')
  // A CDN must not keep an archived article beyond the source cache lifetime.
  res.setHeader('Cache-Control', noStore ? 'no-store, max-age=0' : 'public, max-age=0, must-revalidate')
  res.setHeader('CDN-Cache-Control', 'no-store')
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (source) res.setHeader('X-Control-G-Editorial-Source', source)
  if (noindex) res.setHeader('X-Robots-Tag', 'noindex, follow, noarchive')
  if (status === 503) {
    res.setHeader('Cache-Control', 'no-store, max-age=0')
    res.setHeader('Retry-After', '30')
  }
  return req.method === 'HEAD' ? res.end() : res.end(body)
}

function serviceUnavailable(req, res) {
  return reply(req, res, 503, '<!doctype html><html lang="es-CO"><head><meta name="robots" content="noindex, follow"><title>Contenido temporalmente no disponible | Control G</title></head><body><main><h1>Contenido temporalmente no disponible</h1><p>Inténtelo de nuevo en unos momentos.</p><a href="/">Ir a Control G</a></main></body></html>', 'text/html')
}

export function createMarketingHandler({
  loadBundle = () => import('../.server/marketing.mjs'),
  loadShell = () => readFile(join(process.cwd(), 'dist/marketing-shell.html'), 'utf8'),
  fetchBlog = fetchPublicBlog,
  env = process.env,
  now = Date.now,
  logger = console,
} = {}) {
  let artifactsPromise
  // A best-effort public source cache, not durable or shared application state.
  let sourceCache
  let sourcePending

  const artifacts = () => {
    if (!artifactsPromise) {
      artifactsPromise = Promise.all([loadBundle(), loadShell()])
        .then(([renderer, shell]) => ({ renderer, shell }))
        .catch(error => { artifactsPromise = undefined; throw error })
    }
    return artifactsPromise
  }

  const publicCatalog = async () => {
    if (sourceCache && sourceCache.expiresAt > now()) return sourceCache
    if (!sourcePending) {
      sourcePending = (async () => {
        let result
        try {
          const publicEnv = {
            VITE_SUPABASE_URL: env.VITE_SUPABASE_URL,
            VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY,
            SUPABASE_URL: env.SUPABASE_URL,
            SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
          }
          result = await fetchBlog({ env: publicEnv, timeoutMs: 6000 })
        } catch {
          logger.warn?.('CONTROL_G_PUBLIC_EDITORIAL_SOURCE_UNAVAILABLE')
        }
        sourceCache = result?.available && Array.isArray(result.posts)
          ? { posts: result.posts, available: true, source: 'live', expiresAt: now() + CACHE_TTL_MS }
          : { posts: [], available: false, source: 'unavailable', expiresAt: now() + CACHE_TTL_MS }
        return sourceCache
      })().finally(() => { sourcePending = undefined })
    }
    return sourcePending
  }

  return async function marketingHandler(req, res) {
    if (!['GET', 'HEAD'].includes(req.method)) {
      return reply(req, res, 405, JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), 'application/json')
    }
    const path = publicRequestPath(req)
    if (!path) return reply(req, res, 404, 'Página no encontrada.', 'text/plain')

    try {
      const { renderer, shell } = await artifacts()
      const catalog = await publicCatalog()
      const posts = mergePublicPosts(renderer.BLOG_POSTS, catalog.posts)
      const responseOptions = { source: catalog.source }
      if (path === '/sitemap.xml') return reply(req, res, 200, buildSitemap(renderer.SEO_PAGES, posts), 'application/xml', responseOptions)
      if (path === '/sitemap.html') return reply(req, res, 200, buildSitemapHtml(renderer.SEO_PAGES, posts), 'text/html', { ...responseOptions, noindex: true })
      if (path === '/rss.xml') return reply(req, res, 200, buildRss(posts), 'application/rss+xml', responseOptions)
      if (path === '/llms.txt' || path === '/llms-full.txt') {
        return reply(req, res, 200, buildLlms(renderer.SEO_PAGES, posts, path === '/llms-full.txt'), 'text/plain', responseOptions)
      }
      if (path === '/blog-catalog.json') {
        return reply(req, res, 200, JSON.stringify({ posts: catalog.posts }), 'application/json', { ...responseOptions, noindex: true, noStore: !catalog.available })
      }
      const metadata = renderer.marketingMetadata(path, posts)
      if (!metadata && /^\/blog\/[^/]+$/.test(path) && !catalog.available) return serviceUnavailable(req, res)
      const markup = await renderer.renderMarketingRoute(path, posts)
      const document = renderMarketingDocument(shell, markup, metadata, catalog.posts)
      return reply(req, res, metadata ? 200 : 404, document, 'text/html', responseOptions)
    } catch (error) {
      // Diagnostic identifiers only: no request body, env, URL queries or stack.
      logger.error?.('CONTROL_G_PUBLIC_MARKETING_RENDER_UNAVAILABLE', {
        code: error?.code || error?.name || 'UNKNOWN',
        file: typeof error?.path === 'string' ? basename(error.path) : undefined,
        module: typeof error?.url === 'string' && error.url.startsWith('file:') ? basename(new URL(error.url).pathname) : undefined,
      })
      return serviceUnavailable(req, res)
    }
  }
}

export default createMarketingHandler()
