import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'

const readJson = async path => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'))
const base = await readJson('src/config/blog-posts.json')
const expansion = await readJson('src/config/blog-editorial-20261016.json')
const solutions = await readJson('src/config/seo-pages.json')
const words = post => [...post.intro, ...post.sections.flatMap(section => [...section.paragraphs, ...(section.bullets || [])]), ...post.faqs.map(faq => faq.answer)].join(' ').split(/\s+/).length

test('la expansión editorial añade 14 intenciones distintas sin duplicar URLs ni títulos existentes', () => {
  const all = [...base, ...expansion]
  assert.equal(expansion.length, 14)
  for (const key of ['slug', 'title', 'description']) assert.equal(new Set(all.map(post => post[key])).size, all.length, key)
  for (const post of expansion) {
    assert.match(post.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    assert.ok(post.title.length <= 60)
    assert.ok(post.description.length <= 165)
    assert.equal(post.publishedAt, '2026-10-16')
    assert.equal(post.updatedAt, '2026-10-16')
    assert.ok(post.keywords.length >= 4)
    assert.ok(post.sections.length >= 6)
    assert.ok(post.faqs.length >= 3)
    assert.ok(words(post) >= 700, `${post.slug}: desarrollo insuficiente`)
    assert.match(post.whatsappMessage, /Control G/)
    assert.doesNotMatch(JSON.stringify(post), /primer puesto garantizado|resultados garantizados|clientes ficticios satisfechos/i)
  }
  const paragraphs = expansion.flatMap(post => [...post.intro, ...post.sections.flatMap(section => section.paragraphs)])
  assert.equal(new Set(paragraphs).size, paragraphs.length, 'No reutilizar párrafos de relleno entre artículos')
})

test('cada artículo tiene enlaces de clúster válidos y una ruta hacia una solución comercial', () => {
  const paths = new Set([...base, ...expansion].map(post => `/blog/${post.slug}`))
  const solutionPaths = new Set(solutions.map(page => page.path))
  for (const post of expansion) {
    assert.ok(post.relatedLinks.filter(link => paths.has(link.path)).length >= 2, post.slug)
    assert.ok(post.relatedLinks.some(link => solutionPaths.has(link.path)), post.slug)
    for (const link of post.relatedLinks) assert.ok(paths.has(link.path) || solutionPaths.has(link.path), `${post.slug}: ${link.path}`)
  }
})

test('las fuentes son primarias y las portadas locales tienen alt y divulgación de IA', async () => {
  const hosts = ['www.dane.gov.co', 'www.mincit.gov.co', 'www.funcionpublica.gov.co', 'www.mininterior.gov.co', 'sedeelectronica.sic.gov.co', 'aapor.org']
  for (const post of expansion) {
    assert.ok(post.sources.length >= 1)
    for (const source of post.sources) { const url = new URL(source.url); assert.equal(url.protocol, 'https:'); assert.ok(hosts.includes(url.hostname)) }
    assert.match(post.image, /^\/blog\/[a-z0-9-]+\.jpg$/)
    assert.ok(post.imageAlt.length >= 40)
    assert.match(post.imageCaption, /generada con IA/)
    const imagePath = new URL(`../public${post.image}`, import.meta.url)
    const info = await stat(imagePath)
    assert.ok(info.size > 10_000 && info.size < 400_000, post.image)
    const bytes = await readFile(imagePath)
    assert.equal(bytes.readUInt16BE(0), 0xffd8)
  }
})

test('la guía principal de software se amplía sin alterar su URL ni fingir una publicación nueva', () => {
  const guide = base.find(post => post.slug === 'software-caracterizacion-social-colombia')
  assert.equal(guide.publishedAt, '2026-08-24')
  assert.equal(guide.updatedAt, '2026-10-16')
  assert.ok(guide.sections.length >= 8)
  assert.ok(words(guide) >= 750)
  assert.ok(guide.sources.length >= 2)
  assert.ok(guide.relatedLinks.some(link => link.path === '/blog/plataforma-caracterizacion-como-elegir'))
})

test('la navegación editorial no queda atrapada en un catálogo antiguo de la PWA', async () => {
  const config = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8')
  const denylist = config.split('navigateFallbackDenylist: [')[1].split('],')[0]
  assert.ok(denylist.includes('/^\\/blog(?:\\/|$)/'))
  assert.equal(denylist.includes('/^\\/field'), false, 'La captura offline privada conserva su fallback')
})
