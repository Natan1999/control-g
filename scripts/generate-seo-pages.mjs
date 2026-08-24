import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

if (process.env.VITE_NATIVE_BUILD === 'true') {
  console.log('SEO estático omitido en la compilación nativa de Capacitor.')
  process.exit(0)
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const siteUrl = 'https://www.controlg.co'
const pages = JSON.parse(await readFile(join(root, 'src/config/seo-pages.json'), 'utf8'))
const shell = await readFile(join(dist, 'index.html'), 'utf8')

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')

const structuredData = page => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'Control G by DRAN Digital',
      alternateName: 'Control G',
      url: siteUrl,
      logo: `${siteUrl}/pwa-512x512.png`,
      description: 'Plataforma de caracterización, encuestas y levantamiento de información en campo para entidades públicas y organizaciones.',
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+57-300-901-0300',
        contactType: 'sales',
        availableLanguage: ['Spanish'],
        areaServed: ['CO', 'LATAM'],
      },
      areaServed: [
        { '@type': 'Country', name: 'Colombia' },
        { '@type': 'Place', name: 'Latinoamérica' },
      ],
    },
    {
      '@type': ['WebApplication', 'MobileApplication'],
      '@id': `${siteUrl}/#software`,
      name: 'Control G',
      url: siteUrl,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, Android',
      inLanguage: 'es',
      description: page.description,
      featureList: page.benefits,
      provider: { '@id': `${siteUrl}/#organization` },
      areaServed: ['Colombia', 'Latinoamérica'],
    },
    {
      '@type': 'WebPage',
      url: `${siteUrl}${page.path}`,
      name: page.title,
      description: page.description,
      inLanguage: 'es-CO',
      about: { '@id': `${siteUrl}/#software` },
    },
    {
      '@type': 'FAQPage',
      mainEntity: page.faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'Control G',
      inLanguage: 'es-CO',
      publisher: { '@id': `${siteUrl}/#organization` },
    },
    ...(page.path === '/' ? [] : [{
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: page.heading, item: `${siteUrl}${page.path}` },
      ],
    }]),
  ],
})

const staticContent = page => `
  <main data-seo-static="true" style="font-family:Inter,system-ui,sans-serif;max-width:1040px;margin:auto;padding:48px 24px;color:#102d3e">
    <nav aria-label="Soluciones de Control G" style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:48px">
      <a href="/">Control G</a>
      ${pages.filter(item => item.path !== '/').map(item => `<a href="${escapeHtml(item.path)}">${escapeHtml(item.eyebrow)}</a>`).join('')}
    </nav>
    <p>${escapeHtml(page.eyebrow)}</p>
    <h1>${escapeHtml(page.heading)}</h1>
    <p>${escapeHtml(page.lead)}</p>
    ${page.sections.map(section => `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.body)}</p></section>`).join('')}
    <section><h2>Capacidades de Control G</h2><ul>${page.benefits.map(benefit => `<li>${escapeHtml(benefit)}</li>`).join('')}</ul></section>
    <section><h2>Preguntas frecuentes</h2>${page.faqs.map(faq => `<article><h3>${escapeHtml(faq.question)}</h3><p>${escapeHtml(faq.answer)}</p></article>`).join('')}</section>
    <p><a href="https://wa.me/573009010300?text=${encodeURIComponent(page.whatsappMessage)}">Solicitar demostración de Control G por WhatsApp</a></p>
  </main>`

function renderPage(page) {
  const canonical = `${siteUrl}${page.path}`
  let html = shell
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<meta[^>]+(?:name|property)=["'](?:description|keywords|robots|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi, '')

  const head = `
    <title>${escapeHtml(page.title)}</title>
    <meta name="description" content="${escapeHtml(page.description)}" />
    <meta name="keywords" content="${escapeHtml(page.keywords.join(', '))}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${escapeHtml(page.title)}" />
    <meta property="og:description" content="${escapeHtml(page.description)}" />
    <meta property="og:image" content="${siteUrl}/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Control G, caracterización y encuestas offline" />
    <meta property="og:site_name" content="Control G" />
    <meta property="og:locale" content="es_CO" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(page.title)}" />
    <meta name="twitter:description" content="${escapeHtml(page.description)}" />
    <meta name="twitter:image" content="${siteUrl}/og-image.png" />
    <script id="control-g-structured-data" type="application/ld+json">${JSON.stringify(structuredData(page)).replaceAll('<', '\\u003c')}</script>`

  html = html.replace('</head>', `${head}\n  </head>`)
  html = html.replace('<div id="root"></div>', `<div id="root">${staticContent(page)}</div>`)
  return html
}

for (const page of pages) {
  const output = page.path === '/' ? join(dist, 'index.html') : join(dist, page.path, 'index.html')
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, renderPage(page))
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url><loc>${siteUrl}${page.path}</loc><changefreq>${page.path === '/' ? 'weekly' : 'monthly'}</changefreq><priority>${page.path === '/' ? '1.0' : '0.8'}</priority></url>`).join('\n')}
</urlset>
`
await writeFile(join(dist, 'sitemap.xml'), sitemap)
await writeFile(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /login\nDisallow: /admin\nDisallow: /coord\nDisallow: /apoyo\nDisallow: /field\n\nSitemap: ${siteUrl}/sitemap.xml\n`)

console.log(`SEO estático generado para ${pages.length} páginas.`)
