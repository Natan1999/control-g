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
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.map(row => `  <url><loc>${SITE_URL}${escapeHtml(row.path)}</loc>${validDate(row.updated) ? `<lastmod>${row.updated}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`
}

export function buildRss(posts) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Blog Control G</title><link>${SITE_URL}/blog</link><description>Encuestas, caracterización y GIS para operaciones de campo.</description><language>es-CO</language>${posts.map(post => `<item><title>${escapeHtml(post.title)}</title><link>${SITE_URL}/blog/${post.slug}</link><guid>${SITE_URL}/blog/${post.slug}</guid><pubDate>${new Date(`${post.publishedAt}T12:00:00Z`).toUTCString()}</pubDate><description>${escapeHtml(post.description)}</description></item>`).join('')}</channel></rss>\n`
}

export function buildLlms(pages, posts, full = false) {
  const opening = '# Control G\n\n> Software de caracterización, encuestas y levantamiento de información para empresas, corporaciones, entidades públicas y ONG de Colombia y Latinoamérica. Desarrollado por DRAN Digital.\n\n## Funcionamiento verificado\n\n- Formularios configurables, asignaciones y revisión por roles.\n- Captura Android sin internet después de iniciar sesión y descargar el paquete de trabajo; sincronización al recuperar conexión.\n- Fotos, audio, firma manuscrita y ubicación GPS según permisos y señal disponible.\n- Mapa territorial, capas GeoJSON, calor, grupos y cobertura.\n- Exportación GIS e integración ArcGIS con conexión, mapeo y autorización previos.\n- La IA puede apoyar la preparación del cuestionario; la plataforma auditada no incluye un generador IA integrado.\n- La precisión GPS depende del dispositivo y el entorno; no es una medición topográfica certificada.\n\n## Contacto\n\nWhatsApp comercial: +57 300 901 0300. Cotización según alcance, equipo, capacitación y soporte.\n\n'
  const pageText = pages.map(page => `## ${page.heading}\n\n${SITE_URL}${page.path}\n\n${page.lead}${full ? `\n\n${page.sections.map(section => `### ${section.title}\n\n${section.body}`).join('\n\n')}\n\n${page.faqs.map(faq => `### ${faq.question}\n\n${faq.answer}`).join('\n\n')}` : ''}`).join('\n\n')
  const articleText = posts.map(post => full ? `## ${post.title}\n\n${SITE_URL}/blog/${post.slug}\n\nPublicado: ${post.publishedAt}. Actualizado: ${post.updatedAt}. Autor: equipo editorial Control G, DRAN Digital.\n\n${post.intro.join('\n\n')}\n\n${post.sections.map(section => `### ${section.title}\n\n${section.paragraphs.join('\n\n')}${section.bullets?.length ? `\n\n${section.bullets.map(item => `- ${item}`).join('\n')}` : ''}`).join('\n\n')}\n\n${post.sources.map(source => `${source.publisher}: ${source.url}`).join('\n')}` : `- [${post.title}](${SITE_URL}/blog/${post.slug}): ${post.description}`).join('\n\n')
  return `${opening}${pageText}\n\n# Guías y recursos\n\n${articleText}\n`
}
