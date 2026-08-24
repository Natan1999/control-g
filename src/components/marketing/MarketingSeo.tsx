import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { buildStructuredData, getSeoPage, SITE_URL } from '@/lib/marketing'

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

  useEffect(() => {
    const page = getSeoPage(pathname)
    const structuredDataId = 'control-g-structured-data'
    document.getElementById(structuredDataId)?.remove()

    if (!page) {
      document.title = pathname === '/login' ? 'Iniciar sesión | Control G' : 'Control G | Plataforma institucional'
      setMeta('meta[name="robots"]', { name: 'robots', content: 'noindex, nofollow, noarchive' })
      setCanonical(null)
      return
    }

    const canonical = `${SITE_URL}${page.path === '/' ? '/' : page.path}`
    document.documentElement.lang = 'es-CO'
    document.title = page.title
    setMeta('meta[name="description"]', { name: 'description', content: page.description })
    setMeta('meta[name="keywords"]', { name: 'keywords', content: page.keywords.join(', ') })
    setMeta('meta[name="robots"]', { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' })
    setMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' })
    setMeta('meta[property="og:url"]', { property: 'og:url', content: canonical })
    setMeta('meta[property="og:title"]', { property: 'og:title', content: page.title })
    setMeta('meta[property="og:description"]', { property: 'og:description', content: page.description })
    setMeta('meta[property="og:image"]', { property: 'og:image', content: `${SITE_URL}/og-image.png` })
    setMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: 'Control G, plataforma de caracterización y encuestas offline' })
    setMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'es_CO' })
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: page.title })
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: page.description })
    setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: `${SITE_URL}/og-image.png` })
    setCanonical(canonical)

    const script = document.createElement('script')
    script.id = structuredDataId
    script.type = 'application/ld+json'
    script.text = JSON.stringify(buildStructuredData(page))
    document.head.appendChild(script)
  }, [pathname])

  return null
}
