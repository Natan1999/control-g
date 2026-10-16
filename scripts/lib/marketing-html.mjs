export const SITE_URL = 'https://www.controlg.co'
export const INDEX_DIRECTIVE = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
export const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
const safeJson = value => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029')

export function cleanMarketingShell(shell) {
  return shell.replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<meta[^>]+(?:name|property)=["'](?:description|keywords|robots|og:[^"']+|twitter:[^"']+|article:[^"']+)["'][^>]*>/gi, '')
}

export function renderMarketingDocument(shell, markup, metadata, snapshot = []) {
  const title = metadata?.title || 'Página no encontrada | Control G'
  const description = metadata?.description || 'Consulte las soluciones y guías disponibles de Control G.'
  const meta = (name, content, property = false) => `<meta ${property ? 'property' : 'name'}="${name}" content="${escapeHtml(content)}" />`
  const head = [
    `<title>${escapeHtml(title)}</title>`,
    meta('description', description),
    meta('robots', metadata ? INDEX_DIRECTIVE : 'noindex, follow, noarchive'),
    ...(metadata ? [
      `<link rel="canonical" href="${escapeHtml(metadata.canonical)}" />`,
      meta('og:type', metadata.type, true), meta('og:url', metadata.canonical, true),
      meta('og:title', title, true), meta('og:description', description, true),
      meta('og:image', metadata.image, true), meta('og:image:alt', metadata.imageAlt, true),
      meta('og:site_name', 'Control G', true), meta('og:locale', metadata.locale.replace('-', '_'), true),
      meta('twitter:card', 'summary_large_image'), meta('twitter:title', title),
      meta('twitter:description', description), meta('twitter:image', metadata.image),
      ...(metadata.publishedAt ? [meta('article:published_time', metadata.publishedAt, true)] : []),
      ...(metadata.updatedAt ? [meta('article:modified_time', metadata.updatedAt, true)] : []),
      `<script id="control-g-structured-data" type="application/ld+json">${safeJson(metadata.structuredData)}</script>`,
    ] : []),
  ].join('\n')
  return cleanMarketingShell(shell)
    .replace(/<html\s+lang=["'][^"']+["']/i, `<html lang="${escapeHtml(metadata?.locale || 'es-CO')}"`)
    .replace('</head>', `${head}\n</head>`)
    .replace('<div id="root"></div>', `<div id="root" data-seo-static="true">${markup}</div><script id="control-g-blog-snapshot" type="application/json">${safeJson(snapshot)}</script>`)
}

export function publicPagePaths(pages, posts) {
  return [...pages.map(page => page.path), '/blog', ...posts.map(post => `/blog/${post.slug}`)]
}

export function buildSitemap(pages, posts) {
  const lastBlogDate = posts.map(post => post.updatedAt).filter(Boolean).sort().at(-1)
  const rows = [
    ...pages.map(page => ({ path: page.path, updated: page.updatedAt })),
    { path: '/blog', updated: lastBlogDate },
    ...posts.map(post => ({ path: `/blog/${post.slug}`, updated: post.updatedAt })),
  ]
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.map(row => `  <url><loc>${SITE_URL}${escapeHtml(row.path)}</loc>${validDate(row.updated) ? `<lastmod>${row.updated}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`
}

export function buildSitemapHtml(pages, posts) {
  const list = items => `<ul>${items.map(item => `<li><a href="${SITE_URL}${escapeHtml(item.path)}">${escapeHtml(item.label)}</a></li>`).join('')}</ul>`
  const solutions = pages.filter(page => !page.countryCode).map(page => ({ path: page.path, label: page.heading }))
  const countries = pages.filter(page => page.countryCode).map(page => ({ path: page.path, label: page.heading }))
  const articles = [{ path: '/blog', label: 'Todas las guías y recursos' }, ...posts.map(post => ({ path: `/blog/${post.slug}`, label: post.title }))]
  return `<!doctype html><html lang="es-CO"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, follow"><title>Mapa del sitio | Control G</title><style>body{margin:0;background:#f4f8fa;color:#132b36;font:16px/1.7 system-ui,sans-serif}main{max-width:980px;margin:auto;padding:clamp(20px,5vw,64px)}a{color:#086776;overflow-wrap:anywhere}nav{display:flex;flex-wrap:wrap;gap:20px}h1{font-size:clamp(30px,5vw,48px);line-height:1.15}h2{margin-top:38px}li{margin:10px 0}.label{color:#526976}ul{padding-left:22px}</style></head><body><main><nav aria-label="Documentos públicos"><a href="/">Control G</a><a href="/sitemap.xml">Sitemap XML</a><a href="/robots.txt">Robots</a><a href="/llms.txt">Información para IA</a></nav><h1>Mapa del sitio</h1><p class="label">${publicPagePaths(pages, posts).length} páginas públicas de encuestas, caracterización y operación de campo. Prioridad comercial: Colombia; cobertura: Latinoamérica. Este índice no muestra paneles privados ni respuestas de formularios.</p><h2>Plataforma y soluciones</h2>${list(solutions)}<h2>Países de Latinoamérica</h2>${list(countries)}<h2>Guías y artículos</h2>${list(articles)}</main></body></html>`
}

export function buildRss(posts) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Blog Control G</title><link>${SITE_URL}/blog</link><description>Encuestas, caracterización y GIS para operaciones de campo.</description><language>es-CO</language>${posts.map(post => `<item><title>${escapeHtml(post.title)}</title><link>${SITE_URL}/blog/${post.slug}</link><guid>${SITE_URL}/blog/${post.slug}</guid><pubDate>${new Date(`${post.publishedAt}T12:00:00Z`).toUTCString()}</pubDate><description>${escapeHtml(post.description)}</description></item>`).join('')}</channel></rss>\n`
}

export function buildLlms(pages, posts, full = false) {
  const opening = `# Control G

> Software de caracterización, encuestas y levantamiento de información para empresas, corporaciones, entidades públicas y ONG. Prioridad: Colombia; cobertura: Latinoamérica. Desarrollado por DRAN Digital.

## Funcionamiento verificado

- Formularios configurables, asignaciones y revisión por roles.
- Asistente integrado para generar borradores, convertir cuestionarios pegados y pedir mejoras o traducciones con Gemini u OpenAI, según proveedor conectado y cuota disponible.
- La generación requiere internet y una cuenta de coordinación o superadministración. Solo se envía la solicitud y, al mejorar, la definición del cuestionario: no las respuestas de campo.
- La propuesta se revisa, simula y edita antes de guardar. La IA no publica ni asigna instrumentos automáticamente ni certifica validez metodológica.
- Captura Android sin internet después de iniciar sesión y descargar el paquete de trabajo; sincronización al recuperar conexión.
- Fotos, audio, firma manuscrita y ubicación GPS según permisos y señal disponible.
- Mapa territorial, capas GeoJSON, calor, grupos y cobertura.
- Exportación GIS e integración ArcGIS con conexión, mapeo y autorización previos.
- La precisión GPS depende del dispositivo y el entorno; no es una medición topográfica certificada.

## Documentos públicos

- [Mapa del sitio](https://www.controlg.co/sitemap.html)
- [Sitemap XML](https://www.controlg.co/sitemap.xml)
- [Robots](https://www.controlg.co/robots.txt)
- [Guías y recursos](https://www.controlg.co/blog)

## Contacto

WhatsApp comercial: +57 300 901 0300. Cotización según alcance, equipo, capacitación y soporte.

`
  const pageText = pages.map(page => `## ${page.heading}\n\n${SITE_URL}${page.path}\n\n${page.lead}${full ? `\n\n${page.sections.map(section => `### ${section.title}\n\n${section.body}`).join('\n\n')}\n\n${page.faqs.map(faq => `### ${faq.question}\n\n${faq.answer}`).join('\n\n')}` : ''}`).join('\n\n')
  const articleText = posts.map(post => full ? `## ${post.title}\n\n${SITE_URL}/blog/${post.slug}\n\nPublicado: ${post.publishedAt}. Actualizado: ${post.updatedAt}. Autor: equipo editorial Control G, DRAN Digital.\n\n${post.intro.join('\n\n')}\n\n${post.sections.map(section => `### ${section.title}\n\n${section.paragraphs.join('\n\n')}${section.bullets?.length ? `\n\n${section.bullets.map(item => `- ${item}`).join('\n')}` : ''}`).join('\n\n')}\n\n${post.sources.map(source => `${source.publisher}: ${source.url}`).join('\n')}` : `- [${post.title}](${SITE_URL}/blog/${post.slug}): ${post.description}`).join('\n\n')
  return `${opening}${pageText}\n\n# Guías y recursos\n\n${articleText}`.trimEnd() + '\n'
}
