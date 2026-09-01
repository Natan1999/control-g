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
const corePages = JSON.parse(await readFile(join(root, 'src/config/seo-pages.json'), 'utf8'))
const countryProfiles = JSON.parse(await readFile(join(root, 'src/config/country-landing-profiles.json'), 'utf8'))
const buildCountryPage = profile => {
  const portuguese = profile.code === 'BR'
  return {
    path: `/encuestas-offline/${profile.slug}`,
    title: portuguese ? `Pesquisas offline no ${profile.name} | Control G` : `Encuestas offline en ${profile.name} | Control G`,
    description: portuguese
      ? `Caracterização e pesquisas offline no ${profile.name}. Capture dados, GPS e evidências sem internet para operações de campo de órgãos públicos.`
      : `Caracterización y encuestas offline en ${profile.name}. Capture datos, GPS y evidencias sin internet para operativos territoriales de entidades públicas.`,
    eyebrow: portuguese ? `Operações de campo no ${profile.name}` : `Operación territorial en ${profile.name}`,
    heading: portuguese ? `Pesquisas e caracterização offline no ${profile.name}` : `Encuestas y caracterización offline en ${profile.name}`,
    lead: portuguese
      ? `Organize equipes por ${profile.admin1} e ${profile.admin2}, colete informações sem sinal e sincronize quando a conexão voltar.`
      : `Organice equipos por ${profile.admin1} y ${profile.admin2}, recolecte información sin señal y sincronice cuando regrese la conectividad.`,
    keywords: portuguese
      ? [`pesquisa offline ${profile.name}`, 'coleta de dados sem internet', `software para ${profile.institutions}`, 'formulários offline Android', 'caracterização territorial']
      : [`encuestas offline ${profile.name}`, `software de caracterización ${profile.name}`, 'recolección de datos sin internet', `software para ${profile.institutions}`, 'formularios offline Android'],
    whatsappMessage: portuguese
      ? `Olá, procuro uma plataforma de pesquisas offline para uma operação no ${profile.name}. Quero conhecer o Control G.`
      : `Hola, busco una plataforma de encuestas offline para un operativo en ${profile.name}. Quiero conocer Control G.`,
    sections: portuguese ? [
      { title: 'Coleta sem depender de cobertura', body: 'As equipes baixam formulários e atribuições antes de ir a campo. Respostas, GPS, fotos, áudio e assinaturas permanecem no dispositivo até que seja possível sincronizar.' },
      { title: `Operação organizada por ${profile.admin1}`, body: `A plataforma separa entidades, equipes, formulários e territórios. Coordenadores distribuem trabalho por ${profile.admin2}, prioridade, período e meta.` },
      { title: 'Dados prontos para controle e análise', body: 'Ao recuperar a conexão, evidências e respostas chegam ao Supabase com rastreabilidade. Painéis, mapas e relatórios ajudam a acompanhar cobertura e qualidade.' },
    ] : [
      { title: 'Captura sin depender de cobertura', body: 'Los equipos descargan formularios y asignaciones antes de salir. Respuestas, GPS, fotos, audio y firmas permanecen en el dispositivo hasta que sea posible sincronizar.' },
      { title: `Operación organizada por ${profile.admin1}`, body: `La plataforma separa entidades, equipos, instrumentos y territorios. Los coordinadores distribuyen trabajo por ${profile.admin2}, prioridad, vigencia y cuota.` },
      { title: 'Datos preparados para control y análisis', body: 'Al recuperar internet, evidencias y respuestas llegan a Supabase con trazabilidad. Los tableros, mapas e informes permiten seguir cobertura y calidad.' },
    ],
    benefits: portuguese
      ? ['Aplicativo Android offline', 'Formulários configuráveis', 'GPS, fotos, áudio e assinaturas', `Cobertura por ${profile.admin2}`, 'Sincronização automática', 'Mapas e relatórios institucionais']
      : ['Aplicación Android offline', 'Formularios configurables', 'GPS, fotografías, audio y firmas', `Cobertura por ${profile.admin2}`, 'Sincronización automática', 'Mapas e informes institucionales'],
    faqs: portuguese ? [
      { question: `O Control G funciona sem internet no ${profile.name}?`, answer: 'Sim. Depois de preparar a conta e baixar as atribuições, a coleta continua sem conexão e sincroniza quando o dispositivo volta a ter internet.' },
      { question: `Pode ser configurado para ${profile.institutions}?`, answer: 'Sim. Cada organização mantém seus próprios usuários, territórios, formulários, permissões e dados separados.' },
      { question: 'Os formulários podem ser adaptados à legislação local?', answer: 'Sim. Perguntas, consentimentos, validações, idioma e regras de tratamento de dados podem ser configurados antes da publicação.' },
      { question: 'Como solicitar uma demonstração?', answer: 'Envie uma mensagem pelo WhatsApp informando o tipo de operação, territórios, quantidade de usuários e formulários necessários.' },
    ] : [
      { question: `¿Control G funciona sin internet en ${profile.name}?`, answer: 'Sí. Después de preparar la cuenta y descargar las asignaciones, la captura continúa sin conexión y sincroniza cuando el dispositivo vuelve a tener internet.' },
      { question: `¿Se puede configurar para ${profile.institutions}?`, answer: 'Sí. Cada organización mantiene usuarios, territorios, formularios, permisos y datos propios separados de las demás entidades.' },
      { question: '¿Los formularios se adaptan a las normas del país?', answer: 'Sí. Las preguntas, consentimientos, validaciones, idioma y reglas de tratamiento de datos se configuran antes de publicar cada instrumento.' },
      { question: '¿Cómo solicito una demostración?', answer: 'Escriba por WhatsApp e indique el tipo de operativo, territorios, número de usuarios y formularios requeridos para preparar una demostración enfocada.' },
    ],
    countryCode: profile.code,
    locale: profile.locale,
  }
}
const pages = [...corePages, ...countryProfiles.map(buildCountryPage)]
const localBlogPosts = JSON.parse(await readFile(join(root, 'src/config/blog-posts.json'), 'utf8'))
let blogPosts = localBlogPosts

// Articles created in the admin CMS join the static editorial base on every
// deployment. If Supabase is unavailable, the build remains deterministic.
if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
  try {
    const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/blog_posts?status=eq.published&select=*&order=published_at.desc`, {
      headers: { apikey: process.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}` },
    })
    if (response.ok) {
      const remote = (await response.json()).map(row => ({
        id: row.id, slug: row.slug, title: row.title, description: row.description, excerpt: row.excerpt,
        category: row.category, country: row.country, publishedAt: row.published_at,
        updatedAt: row.updated_at?.slice(0, 10) || row.published_at, readingMinutes: row.reading_minutes,
        keywords: row.keywords || [], whatsappMessage: row.whatsapp_message, intro: row.intro || [],
        sections: row.sections || [], comparison: row.comparison || [], verdict: row.verdict || '',
        faqs: row.faqs || [], sources: row.sources || [], image: row.image_url, imageAlt: row.image_alt,
      }))
      const merged = new Map(localBlogPosts.map(post => [post.slug, post]))
      remote.forEach(post => merged.set(post.slug, post))
      blogPosts = [...merged.values()]
    }
  } catch {
    console.warn('Supabase no respondió durante el prerender; se usó el contenido editorial local.')
  }
}
const shell = await readFile(join(dist, 'index.html'), 'utf8')

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')

const blogCover = post => post.image || (post.category === 'Comparativas'
  ? '/blog/comparativas-software-campo.jpg'
  : post.slug.includes('offline') || post.slug.includes('rural')
    ? '/blog/encuestas-offline-rural.jpg'
    : post.slug.includes('censo') || post.slug.includes('levantamiento') || post.slug.includes('terreno')
      ? '/blog/evidencia-gps-campo.jpg'
      : '/blog/gestion-publica-territorial.jpg')

const absoluteBlogCover = post => blogCover(post).startsWith('http') ? blogCover(post) : `${siteUrl}${blogCover(post)}`

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
        availableLanguage: page.countryCode === 'BR' ? ['Portuguese', 'Spanish'] : ['Spanish'],
        areaServed: [page.countryCode || 'CO', 'LATAM'],
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
      areaServed: [page.countryCode || 'Colombia', 'Latinoamérica'],
    },
    {
      '@type': 'WebPage',
      url: `${siteUrl}${page.path}`,
      name: page.title,
      description: page.description,
      inLanguage: page.locale || 'es-CO',
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
    .replace(/<html\s+lang=["'][^"']+["']/i, `<html lang="${escapeHtml(page.locale || 'es-CO')}"`)
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
    <meta property="og:locale" content="${escapeHtml((page.locale || 'es-CO').replace('-', '_'))}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(page.title)}" />
    <meta name="twitter:description" content="${escapeHtml(page.description)}" />
    <meta name="twitter:image" content="${siteUrl}/og-image.png" />
    <script id="control-g-structured-data" type="application/ld+json">${JSON.stringify(structuredData(page)).replaceAll('<', '\\u003c')}</script>`

  html = html.replace('</head>', `${head}\n  </head>`)
  html = html.replace('<div id="root"></div>', `<div id="root">${staticContent(page)}</div>`)
  return html
}

const cleanMarketingShell = () => shell
  .replace(/<title>[\s\S]*?<\/title>/i, '')
  .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '')
  .replace(/<meta[^>]+(?:name|property)=["'](?:description|keywords|robots|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi, '')

const blogOrganization = {
  '@type': 'Organization',
  '@id': `${siteUrl}/#organization`,
  name: 'Control G by DRAN Digital',
  url: siteUrl,
  logo: { '@type': 'ImageObject', url: `${siteUrl}/pwa-512x512.png` },
}

const blogPostStructuredData = post => {
  const canonical = `${siteUrl}/blog/${post.slug}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      blogOrganization,
      {
        '@type': 'BlogPosting',
        '@id': `${canonical}#article`,
        headline: post.title,
        description: post.description,
        url: canonical,
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        image: [absoluteBlogCover(post)],
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        inLanguage: 'es',
        author: { '@id': `${siteUrl}/#organization` },
        publisher: { '@id': `${siteUrl}/#organization` },
        articleSection: post.category,
        keywords: post.keywords.join(', '),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl}/blog` },
          { '@type': 'ListItem', position: 3, name: post.title, item: canonical },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: post.faqs.map(faq => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })),
      },
    ],
  }
}

const blogIndexStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    blogOrganization,
    {
      '@type': 'Blog',
      '@id': `${siteUrl}/blog#blog`,
      url: `${siteUrl}/blog`,
      name: 'Blog de encuestas offline y trabajo de campo | Control G',
      description: 'Guías y comparaciones profesionales sobre caracterización social, encuestas offline y levantamiento de información en Latinoamérica.',
      inLanguage: 'es',
      publisher: { '@id': `${siteUrl}/#organization` },
      blogPost: blogPosts.map(post => ({ '@id': `${siteUrl}/blog/${post.slug}#article` })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl}/blog` },
      ],
    },
  ],
}

function blogHead({ title, description, canonical, keywords, structured, type = 'website', publishedAt, updatedAt }) {
  return `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="keywords" content="${escapeHtml(keywords.join(', '))}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="${type}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${type === 'article' && structured?.['@graph']?.[1]?.image?.[0] ? structured['@graph'][1].image[0] : `${siteUrl}/og-image.png`}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="Control G" />
    <meta property="og:locale" content="es_CO" />
    ${publishedAt ? `<meta property="article:published_time" content="${publishedAt}" />` : ''}
    ${updatedAt ? `<meta property="article:modified_time" content="${updatedAt}" />` : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${siteUrl}/og-image.png" />
    <script id="control-g-structured-data" type="application/ld+json">${JSON.stringify(structured).replaceAll('<', '\\u003c')}</script>`
}

function renderBlogIndex() {
  const title = 'Blog de encuestas offline y trabajo de campo | Control G'
  const description = 'Guías y comparaciones profesionales sobre caracterización social, encuestas offline y levantamiento de información en Latinoamérica.'
  const head = blogHead({ title, description, canonical: `${siteUrl}/blog`, keywords: ['encuestas offline', 'caracterización social', 'levantamiento de información', 'trabajo de campo'], structured: blogIndexStructuredData })
  const content = `<main data-seo-static="true" style="font-family:Inter,system-ui,sans-serif;max-width:1040px;margin:auto;padding:48px 24px;color:#102d3e">
    <nav><a href="/">Control G</a> · <a href="/software-caracterizacion-social">Soluciones</a></nav>
    <h1>Blog profesional de caracterización y trabajo de campo</h1>
    <p>${escapeHtml(description)}</p>
    <section><h2>Guías y comparaciones recientes</h2>${blogPosts.map(post => `<article><img src="${escapeHtml(blogCover(post))}" alt="${escapeHtml(post.imageAlt || `Trabajo de campo en ${post.country}`)}" width="720" height="480" loading="lazy"><p>${escapeHtml(post.category)} · ${escapeHtml(post.country)}</p><h3><a href="/blog/${escapeHtml(post.slug)}">${escapeHtml(post.title)}</a></h3><p>${escapeHtml(post.excerpt)}</p></article>`).join('')}</section>
    <p><a href="https://wa.me/573009010300?text=${encodeURIComponent('Hola, llegué desde el blog de Control G. Quiero orientación para un proyecto de recolección de información en campo.')}">Solicitar demostración por WhatsApp</a></p>
  </main>`
  return cleanMarketingShell().replace('</head>', `${head}\n  </head>`).replace('<div id="root"></div>', `<div id="root">${content}</div>`)
}

function renderBlogPost(post) {
  const canonical = `${siteUrl}/blog/${post.slug}`
  const head = blogHead({ title: post.title, description: post.description, canonical, keywords: post.keywords, structured: blogPostStructuredData(post), type: 'article', publishedAt: post.publishedAt, updatedAt: post.updatedAt })
  const comparison = post.comparison.length ? `<section><h2>Comparación funcional</h2><table><thead><tr><th>Criterio</th><th>Control G</th><th>Alternativa analizada</th></tr></thead><tbody>${post.comparison.map(row => `<tr><th>${escapeHtml(row.label)}</th><td>${escapeHtml(row.controlG)}</td><td>${escapeHtml(row.alternative)}</td></tr>`).join('')}</tbody></table></section>` : ''
  const sources = post.sources.length ? `<section><h2>Fuentes consultadas</h2><ul>${post.sources.map(source => `<li><a href="${escapeHtml(source.url)}">${escapeHtml(source.publisher)}: ${escapeHtml(source.title)}</a></li>`).join('')}</ul></section>` : ''
  const content = `<main data-seo-static="true" style="font-family:Inter,system-ui,sans-serif;max-width:840px;margin:auto;padding:48px 24px;color:#102d3e">
    <nav><a href="/">Inicio</a> · <a href="/blog">Blog</a></nav>
    <article><p>${escapeHtml(post.category)} · ${escapeHtml(post.country)}</p><h1>${escapeHtml(post.title)}</h1><img src="${escapeHtml(blogCover(post))}" alt="${escapeHtml(post.imageAlt || `Trabajo de campo en ${post.country}`)}" width="1440" height="960"><p>Actualizado: <time datetime="${post.updatedAt}">${post.updatedAt}</time> · ${post.readingMinutes} min</p>
      ${post.intro.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
      ${post.sections.map(section => `<section><h2>${escapeHtml(section.title)}</h2>${section.paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}${section.bullets ? `<ul>${section.bullets.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}</section>`).join('')}
      ${comparison}<section><h2>Conclusión</h2><p>${escapeHtml(post.verdict)}</p></section>
      <section><h2>Preguntas frecuentes</h2>${post.faqs.map(faq => `<h3>${escapeHtml(faq.question)}</h3><p>${escapeHtml(faq.answer)}</p>`).join('')}</section>${sources}
      <p><a href="https://wa.me/573009010300?text=${encodeURIComponent(post.whatsappMessage)}">Solicitar demostración por WhatsApp</a></p>
    </article>
  </main>`
  return cleanMarketingShell().replace('</head>', `${head}\n  </head>`).replace('<div id="root"></div>', `<div id="root">${content}</div>`)
}

for (const page of pages) {
  const output = page.path === '/' ? join(dist, 'index.html') : join(dist, page.path, 'index.html')
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, renderPage(page))
}

await mkdir(join(dist, 'blog'), { recursive: true })
await writeFile(join(dist, 'blog', 'index.html'), renderBlogIndex())
for (const post of blogPosts) {
  const output = join(dist, 'blog', post.slug, 'index.html')
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, renderBlogPost(post))
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url><loc>${siteUrl}${page.path}</loc><changefreq>${page.path === '/' ? 'weekly' : 'monthly'}</changefreq><priority>${page.path === '/' ? '1.0' : '0.8'}</priority></url>`).join('\n')}
  <url><loc>${siteUrl}/blog</loc><lastmod>${blogPosts[0].updatedAt}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>
${blogPosts.map(post => `  <url><loc>${siteUrl}/blog/${post.slug}</loc><lastmod>${post.updatedAt}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`).join('\n')}
</urlset>
`
await writeFile(join(dist, 'sitemap.xml'), sitemap)
await writeFile(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /login\nDisallow: /admin\nDisallow: /coord\nDisallow: /apoyo\nDisallow: /field\n\nSitemap: ${siteUrl}/sitemap.xml\n`)

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Blog Control G</title><link>${siteUrl}/blog</link><description>Guías sobre caracterización, encuestas offline y trabajo de campo.</description><language>es</language>
${[...blogPosts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).map(post => `<item><title>${escapeHtml(post.title)}</title><link>${siteUrl}/blog/${post.slug}</link><guid>${siteUrl}/blog/${post.slug}</guid><pubDate>${new Date(`${post.publishedAt}T12:00:00Z`).toUTCString()}</pubDate><description>${escapeHtml(post.description)}</description></item>`).join('\n')}
</channel></rss>
`
await writeFile(join(dist, 'rss.xml'), rss)

console.log(`SEO estático generado para ${pages.length} páginas y ${blogPosts.length} artículos.`)
