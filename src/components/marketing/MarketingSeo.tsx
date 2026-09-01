import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { buildStructuredData, getSeoPage, SITE_URL } from '@/lib/marketing'
import { BLOG_META, blogCover, buildBlogIndexStructuredData, buildBlogStructuredData, getBlogPost } from '@/lib/blog'
import { usePublishedBlogPosts } from '@/hooks/useBlogContent'

function setMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }
  Object.entries(attributes).forEach(([name, value]) => element?.setAttribute(name, value))
}

function setCanonical(url: string | null) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!url) {
    link?.remove()
    return
  }
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.href = url
}

export function MarketingSeo() {
  const { pathname } = useLocation()
  const blogSlug = pathname.match(/^\/blog\/([^/]+)\/?$/)?.[1]
  const { posts: availableBlogPosts } = usePublishedBlogPosts(Boolean(blogSlug))
  const availableBlogPost = blogSlug ? availableBlogPosts.find(post => post.slug === blogSlug) : undefined

  useEffect(() => {
    const page = getSeoPage(pathname)
    const blogPost = availableBlogPost ?? (blogSlug ? getBlogPost(blogSlug) : undefined)
    const isBlogIndex = pathname === '/blog' || pathname === '/blog/'
    const structuredDataId = 'control-g-structured-data'
    document.getElementById(structuredDataId)?.remove()

    if (!page && !isBlogIndex && !blogPost) {
      document.title = pathname === '/login' ? 'Iniciar sesión | Control G' : 'Control G | Plataforma institucional'
      setMeta('meta[name="robots"]', { name: 'robots', content: 'noindex, nofollow, noarchive' })
      setCanonical(null)
      return
    }

    const canonical = blogPost
      ? `${SITE_URL}/blog/${blogPost.slug}`
      : isBlogIndex
        ? `${SITE_URL}/blog`
        : `${SITE_URL}${page!.path === '/' ? '/' : page!.path}`
    const title = blogPost?.title ?? (isBlogIndex ? BLOG_META.title : page!.title)
    const description = blogPost?.description ?? (isBlogIndex ? BLOG_META.description : page!.description)
    const keywords = blogPost?.keywords ?? (isBlogIndex ? ['encuestas offline', 'caracterización social', 'levantamiento de información', 'trabajo de campo'] : page!.keywords)
    const structuredData = blogPost
      ? buildBlogStructuredData(blogPost)
      : isBlogIndex
        ? buildBlogIndexStructuredData()
        : buildStructuredData(page!)
    const socialImage = blogPost
      ? (blogCover(blogPost).startsWith('http') ? blogCover(blogPost) : `${SITE_URL}${blogCover(blogPost)}`)
      : `${SITE_URL}/og-image.png`
    const pageLocale = page?.locale || 'es-CO'
    document.documentElement.lang = pageLocale
    document.title = title
    setMeta('meta[name="description"]', { name: 'description', content: description })
    setMeta('meta[name="keywords"]', { name: 'keywords', content: keywords.join(', ') })
    setMeta('meta[name="robots"]', { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' })
    setMeta('meta[property="og:type"]', { property: 'og:type', content: blogPost ? 'article' : 'website' })
    setMeta('meta[property="og:url"]', { property: 'og:url', content: canonical })
    setMeta('meta[property="og:title"]', { property: 'og:title', content: title })
    setMeta('meta[property="og:description"]', { property: 'og:description', content: description })
    setMeta('meta[property="og:image"]', { property: 'og:image', content: socialImage })
    setMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: 'Control G, plataforma de caracterización y encuestas offline' })
    setMeta('meta[property="og:locale"]', { property: 'og:locale', content: pageLocale.replace('-', '_') })
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title })
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description })
    setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: socialImage })
    setCanonical(canonical)

    const script = document.createElement('script')
    script.id = structuredDataId
    script.type = 'application/ld+json'
    script.text = JSON.stringify(structuredData)
    document.head.appendChild(script)
  }, [pathname, blogSlug, availableBlogPost])

  return null
}
