const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export function colombiaCalendarDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}
const publicUrl = value => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : '' } catch { return '' }
}

// Explicit allowlist: never serialize creator IDs, internal notes or auth metadata.
export function publicBlogPost(row, { today = colombiaCalendarDate() } = {}) {
  if (row.status !== 'published' || !SLUG.test(row.slug || '') || !row.title || !Array.isArray(row.sections) || !Array.isArray(row.intro)) return null
  const publishedAt = String(row.published_at || '').slice(0,10)
  const updatedAt = String(row.updated_at || publishedAt).slice(0,10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedAt) || publishedAt > today) return null
  return {
    slug: row.slug, title: row.title, description: row.description || row.excerpt || '', excerpt: row.excerpt || '',
    category: row.category || 'Guías', country: row.country || 'Latinoamérica', publishedAt, updatedAt,
    readingMinutes: Math.min(60,Math.max(1,Number(row.reading_minutes) || 7)),
    keywords: Array.isArray(row.keywords) ? row.keywords.map(String) : [],
    whatsappMessage: row.whatsapp_message || `Hola, leí ${row.title} en Control G y quiero una demostración.`,
    intro: row.intro.map(String),
    sections: row.sections.filter(section => section && section.title && Array.isArray(section.paragraphs)).map(section => ({ title: String(section.title), paragraphs: section.paragraphs.map(String), ...(Array.isArray(section.bullets) ? {bullets:section.bullets.map(String)} : {}) })),
    comparison: Array.isArray(row.comparison) ? row.comparison.filter(item=>item && item.label).map(item=>({label:String(item.label),controlG:String(item.controlG||''),alternative:String(item.alternative||'')})) : [],
    verdict: row.verdict || '',
    faqs: Array.isArray(row.faqs) ? row.faqs.filter(item=>item && item.question && item.answer).map(item=>({question:String(item.question),answer:String(item.answer)})) : [],
    sources: Array.isArray(row.sources) ? row.sources.filter(source => source && publicUrl(source.url)).map(source=>({title:String(source.title||''),publisher:String(source.publisher||''),url:publicUrl(source.url)})) : [],
    image: publicUrl(row.image_url), imageAlt: row.image_alt || '',
  }
}

export function mergePublicPosts(local, remote) {
  const posts = new Map(local.map(post => [post.slug,post]))
  remote.forEach(post => posts.set(post.slug,post))
  return [...posts.values()].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.title.localeCompare(b.title))
}

export async function fetchPublicBlog({ env = process.env, fetcher = fetch, timeoutMs = 6000, today = colombiaCalendarDate() } = {}) {
  const base = env.VITE_SUPABASE_URL || env.SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY
  if (!base || !key) return { posts: [], available: false }
  const url = new URL(base)
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Public blog requires an HTTPS origin')
  const rows = []
  for (let offset=0; offset<10000; offset+=500) {
    const endpoint = new URL('/rest/v1/blog_posts',url.origin)
    endpoint.searchParams.set('status','eq.published')
    endpoint.searchParams.set('select','slug,title,description,excerpt,category,country,status,published_at,updated_at,reading_minutes,keywords,whatsapp_message,intro,sections,comparison,verdict,faqs,sources,image_url,image_alt')
    endpoint.searchParams.set('order','published_at.desc,slug.asc')
    endpoint.searchParams.set('limit','500'); endpoint.searchParams.set('offset',String(offset))
    const response = await fetcher(endpoint, { headers:{apikey:key,Authorization:`Bearer ${key}`,Accept:'application/json'},signal:AbortSignal.timeout(timeoutMs) })
    if (!response.ok) throw new Error('Public editorial source unavailable')
    const batch = await response.json()
    if (!Array.isArray(batch)) throw new Error('Invalid public editorial response')
    rows.push(...batch.map(row => publicBlogPost(row, { today })).filter(Boolean))
    if (batch.length<500) return { posts: rows, available:true }
  }
  throw new Error('Editorial catalog requires pagination beyond the configured limit')
}
