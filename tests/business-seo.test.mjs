import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const json = async path => JSON.parse(await read(path))
const [base, earlier, business, core, sectors, plan, vercel] = await Promise.all([
  'src/config/blog-posts.json', 'src/config/blog-editorial-20261016.json', 'src/config/blog-business-20261031.json',
  'src/config/seo-pages.json', 'src/config/seo-sectors-20261031.json', 'docs/seo-sectorial-colombia-20261031.json', 'vercel.json',
].map(json))
const text = post => [...post.intro, ...post.sections.flatMap(section => [...section.paragraphs, ...(section.bullets || [])]), ...post.faqs.map(faq => faq.answer)].join(' ')
const allPosts = [...base, ...earlier, ...business]
const paths = new Set([...core, ...sectors].map(page => page.path).concat(allPosts.map(post => `/blog/${post.slug}`)))

test('doce guías empresariales añaden intenciones y contenido original, no variaciones por ciudad', () => {
  assert.equal(business.length, 12)
  for (const key of ['slug', 'title', 'description']) assert.equal(new Set(allPosts.map(post => post[key])).size, allPosts.length, key)
  const paragraphs = business.flatMap(post => [...post.intro, ...post.sections.flatMap(section => section.paragraphs)])
  assert.equal(new Set(paragraphs).size, paragraphs.length)
  for (const post of business) {
    assert.ok(post.title.length <= 60, post.slug)
    assert.ok(post.description.length >= 120 && post.description.length <= 165, post.slug)
    assert.ok(text(post).split(/\s+/).length >= 600, post.slug)
    assert.ok(post.sections.length >= 5)
    assert.ok(post.sections.some(section => section.bullets?.length >= 5))
    assert.ok(post.faqs.length >= 3)
    assert.ok(post.keywords.length >= 4)
    assert.equal(post.country, 'Colombia')
    assert.equal(post.publishedAt, '2026-10-31')
    assert.match(post.whatsappMessage, /Control G/)
    assert.ok(post.sources.length)
    for (const source of post.sources) assert.equal(new URL(source.url).protocol, 'https:')
    assert.doesNotMatch(text(post), /primer puesto garantizado|somos (?:los mejores|número uno)|clientes satisfechos ficticios/i)
  }
})

test('el clúster tiene diez páginas, ocho sectores y enlaces comerciales/editoriales válidos', () => {
  assert.equal(sectors.length, 10)
  assert.equal(sectors.filter(page => page.sector).length, 8)
  assert.equal(new Set([...core, ...sectors].map(page => page.path)).size, core.length + sectors.length)
  for (const page of sectors) {
    assert.ok(page.title.length <= 60 && page.description.length <= 165, page.path)
    assert.ok(page.sections.length >= 5 && page.faqs.length >= 3)
    assert.match(page.whatsappMessage, /Control G/)
    for (const link of page.relatedLinks) assert.ok(paths.has(link.path), `${page.path}: ${link.path}`)
  }
  for (const post of business) {
    assert.ok(post.relatedLinks.some(link => sectors.some(page => page.path === link.path) || core.some(page => page.path === link.path)))
    assert.ok(post.relatedLinks.filter(link => allPosts.some(candidate => `/blog/${candidate.slug}` === link.path)).length >= 2, post.slug)
    for (const link of post.relatedLinks) assert.ok(paths.has(link.path), `${post.slug}: ${link.path}`)
  }
  const hub = sectors.find(page => page.path === '/sectores')
  for (const page of sectors.filter(page => page.sector)) assert.ok(hub.relatedLinks.some(link => link.path === page.path))
})

test('las cuatro portadas son JPEG locales optimizados con alt y divulgación de IA', async () => {
  const images = new Set(business.map(post => post.image))
  assert.equal(images.size, 4)
  for (const post of business) {
    assert.ok(post.imageAlt.length >= 40)
    assert.match(post.imageCaption, /generada con IA/)
  }
  for (const path of images) {
    assert.match(path, /^\/blog\/sector-[a-z]+-control-g\.jpg$/)
    const asset = new URL(`../public${path}`, import.meta.url)
    const info = await stat(asset)
    assert.ok(info.size > 10_000 && info.size < 400_000, `${path}: ${info.size}`)
    assert.equal((await readFile(asset)).readUInt16BE(0), 0xffd8)
  }
})

test('las rutas sectoriales tienen entrega HTML y no alteran el fallback privado offline', async () => {
  for (const page of sectors) {
    const route = vercel.routes.find(route => route.src && new RegExp(route.src).test(page.path))
    // Global header routes match first; resolve the first terminal destination.
    const destination = vercel.routes.find(route => route.src && route.dest && new RegExp(route.src).test(page.path))
    assert.ok(route)
    assert.equal(destination.dest, '/$1/index.html', page.path)
  }
  const config = await read('vite.config.ts')
  const denylist = config.split('navigateFallbackDenylist: [')[1].split('],')[0]
  for (const page of sectors) assert.ok(denylist.includes(page.path.slice(1)), page.path)
  assert.equal(denylist.includes('/^\\/field'), false)
  const marketing = await read('src/lib/marketing.ts')
  const blog = await read('src/lib/blog.ts')
  assert.match(marketing, /\.\.\.seoPagesData, \.\.\.SECTOR_SEO_PAGES/)
  assert.match(blog, /\.\.\.businessExpansion/)
})

test('los límites de preventa, IA y certificaciones aparecen en texto público y documentos LLM', async () => {
  const preventa = sectors.find(page => page.path === '/formularios-preventistas-offline')
  assert.match(JSON.stringify(preventa), /inventario|existencias/)
  assert.match(JSON.stringify(preventa), /no reserva|no confirma|no se confirma/i)
  const ai = business.find(post => post.slug === 'formulario-visita-comercial-ia')
  assert.match(text(ai), /requiere conexión/)
  assert.match(text(ai), /revisión/)
  const machine = await read('scripts/lib/marketing-html.mjs')
  assert.match(machine, /no reserva inventario ni confirma precio/)
  assert.match(machine, /no certifican conformidad técnica/)
  assert.equal(plan.methodology.monthlySearchVolume, null)
  assert.equal(plan.methodology.keywordDifficulty, null)
  assert.equal(plan.markets.length, 25)
  assert.equal(plan.editorial.length, business.length)
  for (const item of plan.editorial) assert.equal(item.titleCandidates.length, 10)
})

test('la ampliación mejora guías existentes sin cambiar su publicación o URLs', () => {
  for (const slug of ['caracterizacion-empresas-clientes-establecimientos', 'crear-encuestas-ia-validacion-humana']) {
    const post = base.find(item => item.slug === slug)
    assert.ok(post)
    assert.equal(post.updatedAt, '2026-10-31')
    assert.ok(post.publishedAt < post.updatedAt)
    assert.ok(post.relatedLinks.some(link => link.path === '/sectores'))
  }
})

test('el embudo cualifica sector y necesidad sin publicar credenciales o datos reales de prospectos', async () => {
  const funnel = await read('src/components/marketing/LeadFunnel.tsx')
  assert.match(funnel, /Sector de actividad/)
  assert.match(funnel, /Solicitudes preliminares de pedido/)
  assert.match(funnel, /Sector: \$\{sector\}/)
  assert.match(funnel, /useState\(initialSector \? 'Empresa'/)
  assert.match(funnel, /useState\(initialSector \|\| 'Por definir'\)/)
  assert.match(funnel, /SECTOR_SEO_PAGES\.flatMap/)
  const solution = await read('src/pages/landing/SolutionPage.tsx')
  assert.match(solution, /<LeadFunnel key=\{topic\} source=\{topic\} initialSector=\{page\.sector\}/)
  const catalog = JSON.stringify([...business, ...sectors])
  assert.doesNotMatch(catalog, /admin@drandigital|SERVICE_ROLE|3218290711|12\.000\.000/)
})
