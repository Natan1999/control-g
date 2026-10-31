import { readFile } from 'node:fs/promises'

const vocabulary = JSON.parse(await readFile(new URL('./schema-vocabulary.json', import.meta.url), 'utf8'))
const origin = 'https://www.controlg.co'
const array = value => value === undefined ? [] : Array.isArray(value) ? value : [value]
const types = node => array(node?.['@type'])
const isA = (type, ancestor, seen = new Set()) => {
  if (type === ancestor) return true
  if (seen.has(type)) return false
  seen.add(type)
  return (vocabulary.types[type] || []).some(parent => isA(parent, ancestor, seen))
}
const absolute = value => { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password } catch { return false } }
const date = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return false
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00Z` : value)
  const calendar = new Date(`${value.slice(0, 10)}T12:00:00Z`)
  return !Number.isNaN(parsed.valueOf()) && !Number.isNaN(calendar.valueOf()) && calendar.toISOString().slice(0, 10) === value.slice(0, 10)
}

// This checks the vocabulary and the site's factual graph contract. It does
// not claim to reproduce Google's ranking systems or its Rich Results Test.
export function validateStructuredData(schema, { path = '/', facts, visibleText = '', html = '' } = {}) {
  const errors = [], warnings = []
  const add = (code, message) => errors.push({ path, code, message })
  const graph = schema?.['@graph']
  if (schema?.['@context'] !== 'https://schema.org' || !Array.isArray(graph) || !graph.length) {
    add('SCHEMA_GRAPH', 'Se requiere un grafo JSON-LD con contexto Schema.org.'); return { errors, warnings }
  }
  const nodes = new Map()
  for (const node of graph) {
    if (!absolute(node?.['@id']) || !types(node).length) add('SCHEMA_NODE', 'Cada entidad principal necesita tipo e identificador HTTPS absoluto.')
    if (nodes.has(node?.['@id'])) add('SCHEMA_DUPLICATE_ID', `Identificador repetido: ${node['@id']}`)
    nodes.set(node?.['@id'], node)
  }
  const valueMatches = (value, ranges, property) => {
    if (typeof value === 'string') return ranges.includes('Text') || ranges.some(t => ['URL', 'Thing'].includes(t)) && absolute(value) || ranges.some(t => ['Date', 'DateTime'].includes(t)) && date(value)
    if (typeof value === 'boolean') return ranges.includes('Boolean')
    if (typeof value === 'number') return Number.isFinite(value) && (ranges.includes('Number') || ranges.includes('Integer') && Number.isInteger(value) || ['width', 'height'].includes(property) && value > 0)
    const resolved = value?.['@id'] ? nodes.get(value['@id']) || value : value
    return types(resolved).some(type => ranges.some(range => isA(type, range)))
  }
  const visit = node => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) { node.forEach(visit); return }
    if (node['@id'] && (!absolute(node['@id']) || !nodes.has(node['@id']))) add('SCHEMA_REFERENCE', `Referencia no resuelta o inválida: ${node['@id']}`)
    const nodeTypes = types(node)
    for (const type of nodeTypes) if (!Object.hasOwn(vocabulary.types, type)) add('SCHEMA_TYPE', `Tipo no revisado en el vocabulario oficial: ${type}`)
    for (const [property, value] of Object.entries(node)) {
      if (property.startsWith('@')) continue
      const definition = vocabulary.properties[property]
      if (!definition || !nodeTypes.some(type => definition.domains.some(domain => isA(type, domain)))) add('SCHEMA_PROPERTY', `${property} no corresponde al tipo ${nodeTypes.join(', ')}.`)
      else for (const item of array(value)) if (!valueMatches(item, definition.ranges, property)) add('SCHEMA_VALUE', `Valor o referencia incompatible con ${property}.`)
      if (['url', 'contentUrl'].includes(property) && !absolute(value)) add('SCHEMA_URL', `URL no absoluta en ${property}.`)
      if (['datePublished', 'dateModified'].includes(property) && !date(value)) add('SCHEMA_DATE', `Fecha inválida en ${property}.`)
      if (['offers', 'aggregateRating', 'review'].includes(property)) add('SCHEMA_COMMERCIAL_EVIDENCE', 'No publicar precio o reseña sin evidencia pública y revisión del contrato de datos.')
      visit(value)
    }
  }
  graph.forEach(visit)
  const canonical = `${origin}${path}`
  const webpage = nodes.get(`${canonical}#webpage`)
  if (!webpage || !types(webpage).some(type => isA(type, 'WebPage')) || webpage.url !== canonical) add('SCHEMA_WEBPAGE', 'Falta la página canónica conectada al grafo.')
  if (facts && (webpage?.name !== facts.titles[0] || webpage?.inLanguage !== facts.language)) add('SCHEMA_PAGE_MATCH', 'Título o idioma estructurado distinto del HTML visible.')
  for (const id of ['/#organization', '/#website', '/#logo', '/#dran-digital']) if (!nodes.has(`${origin}${id}`)) add('SCHEMA_IDENTITY', `Identidad compartida ausente: ${id}`)
  const breadcrumbs = graph.find(node => types(node).includes('BreadcrumbList'))
  if (path !== '/' && (!breadcrumbs || webpage?.breadcrumb?.['@id'] !== breadcrumbs['@id'])) add('SCHEMA_BREADCRUMB', 'Falta la ruta de navegación enlazada desde la página.')
  const links = new Set((facts?.links || []).map(href => { try { return new URL(href, canonical).href } catch { return '' } }))
  for (const list of graph.filter(node => types(node).some(type => ['BreadcrumbList', 'ItemList'].includes(type)))) {
    const items = list.itemListElement || []
    if (!items.length || list.numberOfItems !== undefined && list.numberOfItems !== items.length) add('SCHEMA_LIST_COUNT', 'Lista vacía o número de elementos inconsistente.')
    for (const [index, item] of items.entries()) {
      if (item.position !== index + 1 || !item.name?.trim() || !absolute(item.item || item.url)) add('SCHEMA_LIST_ITEM', 'La lista necesita posiciones consecutivas, nombres y URLs absolutas.')
      // The final breadcrumb is the current document, not necessarily a link.
      if (facts && (item.item || item.url) !== canonical && !links.has(item.item || item.url)) add('SCHEMA_LIST_VISIBILITY', 'La lista anuncia un enlace que no aparece en el HTML.')
    }
  }
  const article = graph.find(node => types(node).includes('BlogPosting'))
  if (path.startsWith('/blog/')) {
    if (!article || article.url !== canonical || article.headline !== facts?.headings[0]) add('SCHEMA_ARTICLE', 'Falta un artículo con titular y URL correspondientes al contenido visible.')
    if (article) {
      if (!date(webpage?.datePublished) || !date(webpage?.dateModified) || webpage.dateModified < webpage.datePublished) add('SCHEMA_ARTICLE_DATES', 'Fechas editoriales inválidas o anteriores a la publicación.')
      for (const value of [webpage?.datePublished, webpage?.dateModified]) if (html && !html.includes(`dateTime="${value}"`) && !html.includes(`datetime="${value}"`)) add('SCHEMA_DATE_VISIBILITY', 'La fecha editorial no aparece en un elemento time del HTML.')
      for (const field of ['datePublished', 'dateModified']) if (article[field] !== undefined && (!date(article[field]) || !article[field].includes('T') || article[field] !== webpage?.[field])) add('SCHEMA_ARTICLE_TIME', 'El artículo solo admite una hora y zona reales, coherentes con la fuente editorial.')
      const author = nodes.get(article.author?.['@id'])
      if (!author?.name || !absolute(author.url) || facts && !links.has(author.url) || visibleText && !visibleText.includes(author.name)) add('SCHEMA_AUTHOR', 'El autor debe tener nombre, URL identificable y atribución visible.')
      const image = nodes.get(article.image?.['@id'])
      if (!image || !absolute(image.contentUrl) || facts && !facts.images.some(item => new URL(item.src, origin).href === image.contentUrl)) add('SCHEMA_ARTICLE_IMAGE', 'La imagen principal estructurada debe corresponder a la portada visible.')
      for (const citation of article.citation || []) if (facts && !links.has(citation.url)) add('SCHEMA_CITATION', 'La fuente estructurada no aparece enlazada en el artículo.')
    }
  }
  return { errors, warnings }
}

export function checkSharedIdentities(documents) {
  const seen = new Map(), errors = []
  const shared = new Set(['/#logo', '/#organization', '/#dran-digital', '/#website', '/#service', '/#software', '/blog#blog', '/blog#equipo-editorial'].map(id => `${origin}${id}`))
  for (const { path, schema } of documents) for (const node of schema?.['@graph'] || []) {
    const id = node['@id']
    if (!shared.has(id)) continue
    const value = JSON.stringify(node)
    if (seen.has(id) && seen.get(id).value !== value) errors.push({ path, code: 'SCHEMA_IDENTITY_CONFLICT', message: `${id} cambia respecto a ${seen.get(id).path}.` })
    else seen.set(id, { value, path })
  }
  return errors
}
