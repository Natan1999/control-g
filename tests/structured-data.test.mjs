import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { validateStructuredData, checkSharedIdentities } from '../scripts/lib/structured-data-validation.mjs'
import { extractHtmlFacts } from '../scripts/seo-check.mjs'
import { renderMarketingDocument } from '../scripts/lib/marketing-html.mjs'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText).toString('base64')}`
const identityUrl = moduleUrl(await read('src/lib/structured-data.ts'))
const shared = await import(identityUrl)
let blogSource = await read('src/lib/blog.ts')
for (const [name, path] of [['blogPostsData', 'blog-posts.json'], ['editorialExpansion', 'blog-editorial-20261016.json'], ['businessExpansion', 'blog-business-20261031.json']]) {
  blogSource = blogSource.replace(new RegExp(`import ${name} from '[^']+'`), `const ${name} = ${await read(`src/config/${path}`)}`)
}
blogSource = blogSource.replace("'@/lib/structured-data'", JSON.stringify(identityUrl))
const blog = await import(moduleUrl(blogSource))
const origin = shared.SITE_URL
const clone = value => structuredClone(value)

function home() {
  return { '@context': 'https://schema.org', '@graph': [
    ...shared.buildIdentityGraph(), shared.buildServiceNode(), shared.buildSoftwareNode(),
    { '@type': 'WebPage', '@id': `${origin}/#webpage`, url: `${origin}/`, name: 'Control G', inLanguage: 'es-CO', about: { '@id': shared.SERVICE_ID } },
  ] }
}
function articleFixture(post = blog.BLOG_POSTS[0]) {
  const path = `/blog/${post.slug}`
  return {
    schema: blog.buildBlogStructuredData(post), options: {
      path, visibleText: `${shared.EDITORIAL_NAME} ${post.title}`,
      html: `<time datetime="${post.publishedAt}"></time><time datetime="${post.updatedAt}"></time>`,
      facts: { titles: [post.title], headings: [post.title], language: 'es-CO', links: ['/', '/blog', '/blog#equipo-editorial', ...post.sources.map(source => source.url)], images: [{ src: blog.blogCover(post) }] },
    },
  }
}
const codes = result => result.errors.map(error => error.code)

test('las identidades compartidas son estables y no inventan oficinas precios reseñas o idiomas de atención', () => {
  assert.deepEqual(shared.buildIdentityGraph(), shared.buildIdentityGraph())
  const schema = home()
  assert.deepEqual(validateStructuredData(schema).errors, [])
  assert.doesNotMatch(JSON.stringify(schema), /aggregateRating|streetAddress|ratingValue|priceCurrency|offers/)
  const app = shared.buildSoftwareNode()
  assert.equal(app.areaServed, undefined)
  const contact = shared.buildIdentityGraph().find(node => node['@id'] === shared.ORGANIZATION_ID).contactPoint
  assert.deepEqual(contact.availableLanguage, ['Spanish'])
})

test('el vocabulario oficial bloquea propiedades ajenas al tipo, tipos desconocidos y valores incompatibles', () => {
  const schema = home()
  schema['@graph'].find(node => node['@id'] === shared.SOFTWARE_ID).areaServed = 'Colombia'
  assert.ok(codes(validateStructuredData(schema)).includes('SCHEMA_PROPERTY'))
  const broken = home()
  broken['@graph'].find(node => node['@id'] === shared.SERVICE_ID).provider = 17
  assert.ok(codes(validateStructuredData(broken)).includes('SCHEMA_VALUE'))
  broken['@graph'][0]['@type'] = 'InventedImage'
  assert.ok(codes(validateStructuredData(broken)).includes('SCHEMA_TYPE'))
})

test('se rechazan referencias rotas, identificadores repetidos y un JSON sin grafo público', () => {
  const schema = home()
  schema['@graph'].at(-1).about = { '@id': `${origin}/#missing` }
  schema['@graph'].push(clone(schema['@graph'][0]))
  const result = codes(validateStructuredData(schema))
  assert.ok(result.includes('SCHEMA_REFERENCE'))
  assert.ok(result.includes('SCHEMA_DUPLICATE_ID'))
  assert.ok(codes(validateStructuredData({ '@type': 'WebPage' })).includes('SCHEMA_GRAPH'))
})

test('los 53 artículos reales conectan autor portada fuentes fechas y página sin FAQ o resultados retirados', () => {
  assert.equal(blog.BLOG_POSTS.length, 53)
  const documents = []
  for (const post of blog.BLOG_POSTS) {
    const { schema, options } = articleFixture(post)
    assert.deepEqual(validateStructuredData(schema, options).errors, [], post.slug)
    const article = schema['@graph'].find(node => node['@type'] === 'BlogPosting')
    const webpage = schema['@graph'].find(node => node['@id'] === `${origin}/blog/${post.slug}#webpage`)
    assert.equal(webpage.datePublished, post.publishedAt)
    assert.equal(webpage.dateModified, post.updatedAt)
    assert.equal(article.datePublished, undefined, 'No inventar la hora de publicación')
    assert.equal(article.dateModified, undefined, 'No inventar la hora de modificación')
    assert.equal(article.author['@id'], shared.EDITORIAL_ID)
    assert.doesNotMatch(JSON.stringify(schema), /FAQPage|HowTo|SearchAction/)
    documents.push({ path: options.path, schema })
  }
  assert.deepEqual(checkSharedIdentities(documents), [])
})

test('la autoría las fuentes y la imagen deben existir en el contenido visible', () => {
  const { schema, options } = articleFixture()
  options.facts.links = ['/', '/blog']
  options.facts.images = [{ src: '/otra.jpg' }]
  options.visibleText = 'Autor desconocido'
  const result = codes(validateStructuredData(schema, options))
  for (const code of ['SCHEMA_AUTHOR', 'SCHEMA_ARTICLE_IMAGE', 'SCHEMA_CITATION']) assert.ok(result.includes(code), code)
})

test('fechas inexistentes o no visibles y titulares ajenos al H1 bloquean la publicación', () => {
  const { schema, options } = articleFixture()
  const article = schema['@graph'].find(node => node['@type'] === 'BlogPosting')
  schema['@graph'].find(node => node['@id'] === `${origin}${options.path}#webpage`).datePublished = '2026-02-30'
  article.headline = 'Otro título'
  const result = codes(validateStructuredData(schema, options))
  for (const code of ['SCHEMA_ARTICLE_DATES', 'SCHEMA_DATE_VISIBILITY', 'SCHEMA_ARTICLE']) assert.ok(result.includes(code), code)
})

test('el índice editorial respeta las 53 entradas y el orden visible de la selección editorial', () => {
  const schema = blog.buildBlogIndexStructuredData()
  const list = schema['@graph'].find(node => node['@type'] === 'ItemList')
  assert.equal(list.numberOfItems, 53)
  assert.equal(list.itemListElement[0].url, `${origin}/blog/${blog.orderedBlogPosts(blog.BLOG_POSTS)[0].slug}`)
  const options = { path: '/blog', facts: { titles: [blog.BLOG_META.title], headings: ['Guías'], language: 'es-CO', links: ['/', ...blog.BLOG_POSTS.map(post => `/blog/${post.slug}`)], images: [] } }
  assert.deepEqual(validateStructuredData(schema, options).errors, [])
  list.itemListElement[1].position = 18
  assert.ok(codes(validateStructuredData(schema, options)).includes('SCHEMA_LIST_ITEM'))
})

test('la misma entidad no puede cambiar de identidad entre países, páginas y artículos', () => {
  const first = home(), second = home()
  second['@graph'].find(node => node['@id'] === shared.ORGANIZATION_ID).name = 'Otra identidad'
  assert.ok(checkSharedIdentities([{ path: '/', schema: first }, { path: '/encuestas-offline/brasil', schema: second }]).some(error => error.code === 'SCHEMA_IDENTITY_CONFLICT'))
})

test('la serialización SSR conserva texto legítimo e impide cerrar el script JSON-LD', () => {
  const payload = '</script><script>alert(1)</script>'
  const schema = home()
  schema['@graph'].at(-1).description = payload
  const document = renderMarketingDocument('<html lang="es"><head></head><body><div id="root"></div></body></html>', '<main><h1>Control G</h1></main>', { title: 'Control G', description: 'Guía', canonical: `${origin}/`, locale: 'es-CO', image: `${origin}/pwa-512x512.png`, imageAlt: 'Control G', type: 'website', structuredData: schema })
  const facts = extractHtmlFacts(document)
  assert.equal(facts.schemas.length, 1)
  assert.equal(JSON.parse(facts.schemas[0])['@graph'].at(-1).description, payload)
  assert.equal(document.includes(payload), false)
})

test('el flujo público y privado conserva una única fuente JSON-LD y valida al publicar', async () => {
  const client = await read('src/components/marketing/MarketingSeo.tsx')
  assert.match(client, /document\.getElementById\(structuredDataId\)\?\.remove\(\)/)
  assert.match(client, /noindex, nofollow, noarchive/)
  const workflow = await read('.github/workflows/seo-quality.yml')
  assert.match(workflow, /npm run schema:check/)
  assert.match(workflow, /npm run schema:probe/)
  const index = await read('src/pages/blog/BlogIndexPage.tsx')
  assert.match(index, /id="equipo-editorial"/)
  assert.match(await read('src/pages/blog/BlogPostPage.tsx'), /<a href="\/blog#equipo-editorial" rel="author"/)
})
