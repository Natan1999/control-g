import seoPagesData from '@/config/seo-pages.json'

export const SITE_URL = 'https://www.controlg.co'
export const WHATSAPP_NUMBER = '573009010300'
export const WHATSAPP_DISPLAY = '+57 300 901 0300'

export interface SeoFaq {
  question: string
  answer: string
}

export interface SeoSection {
  title: string
  body: string
}

export interface SeoPage {
  path: string
  title: string
  description: string
  eyebrow: string
  heading: string
  lead: string
  keywords: string[]
  whatsappMessage: string
  sections: SeoSection[]
  benefits: string[]
  faqs: SeoFaq[]
}

export const SEO_PAGES = seoPagesData as SeoPage[]

export function getSeoPage(pathname: string) {
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  return SEO_PAGES.find(page => page.path === normalized)
}

export function whatsappUrl(message: string, placement = 'website') {
  const attributedMessage = `${message}\n\nOrigen: controlg.co · ${placement}`
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(attributedMessage)}`
}

export function trackMarketingEvent(eventName: string, data: Record<string, string> = {}) {
  const event = { event: eventName, ...data }
  const target = window as Window & { dataLayer?: Array<Record<string, string>> }
  target.dataLayer = target.dataLayer || []
  target.dataLayer.push(event)
}

export function buildStructuredData(page: SeoPage) {
  const canonical = `${SITE_URL}${page.path === '/' ? '/' : page.path}`
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Control G by DRAN Digital',
      alternateName: 'Control G',
      url: SITE_URL,
      logo: `${SITE_URL}/pwa-512x512.png`,
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
      '@id': `${SITE_URL}/#software`,
      name: 'Control G',
      url: SITE_URL,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, Android',
      inLanguage: 'es',
      description: page.description,
      featureList: page.benefits,
      author: { '@id': `${SITE_URL}/#organization` },
      provider: { '@id': `${SITE_URL}/#organization` },
      areaServed: ['Colombia', 'Latinoamérica'],
    },
    {
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: page.title,
      description: page.description,
      inLanguage: 'es-CO',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#software` },
    },
    {
      '@type': 'FAQPage',
      '@id': `${canonical}#faq`,
      mainEntity: page.faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    },
  ]

  graph.push({
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: 'Control G',
    description: 'Software de caracterización, encuestas y levantamiento de información en campo.',
    inLanguage: 'es-CO',
    publisher: { '@id': `${SITE_URL}/#organization` },
  })

  if (page.path !== '/') {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: page.heading, item: canonical },
      ],
    })
  }

  return { '@context': 'https://schema.org', '@graph': graph }
}
