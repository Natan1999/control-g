import seoPagesData from '@/config/seo-pages.json'
import countryLandingProfiles from '@/config/country-landing-profiles.json'

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
  countryCode?: string
  locale?: string
}

interface CountryLandingProfile {
  code: string
  name: string
  slug: string
  locale: string
  admin1: string
  admin2: string
  institutions: string
}

export function buildCountrySeoPage(profile: CountryLandingProfile): SeoPage {
  const portuguese = profile.code === 'BR'
  if (portuguese) {
    return {
      path: `/encuestas-offline/${profile.slug}`,
      title: `Pesquisas offline no ${profile.name} | Control G`,
      description: `Caracterização e pesquisas offline no ${profile.name}. Capture dados, GPS e evidências sem internet para operações de campo de órgãos públicos.`,
      eyebrow: `Operações de campo no ${profile.name}`,
      heading: `Pesquisas e caracterização offline no ${profile.name}`,
      lead: `Organize equipes por ${profile.admin1} e ${profile.admin2}, colete informações sem sinal e sincronize quando a conexão voltar.`,
      keywords: [`pesquisa offline ${profile.name}`, `coleta de dados sem internet`, `software para ${profile.institutions}`, 'formulários offline Android', 'caracterização territorial'],
      whatsappMessage: `Olá, procuro uma plataforma de pesquisas offline para uma operação no ${profile.name}. Quero conhecer o Control G.`,
      sections: [
        { title: 'Coleta sem depender de cobertura', body: 'As equipes baixam formulários e atribuições antes de ir a campo. Respostas, GPS, fotos, áudio e assinaturas permanecem no dispositivo até que seja possível sincronizar.' },
        { title: `Operação organizada por ${profile.admin1}`, body: `A plataforma separa entidades, equipes, formulários e territórios. Coordenadores distribuem trabalho por ${profile.admin2}, prioridade, período e meta.` },
        { title: 'Dados prontos para controle e análise', body: 'Ao recuperar a conexão, evidências e respostas chegam ao Supabase com rastreabilidade. Painéis, mapas e relatórios ajudam a acompanhar cobertura e qualidade.' },
      ],
      benefits: ['Aplicativo Android offline', 'Formulários configuráveis', 'GPS, fotos, áudio e assinaturas', `Cobertura por ${profile.admin2}`, 'Sincronização automática', 'Mapas e relatórios institucionais'],
      faqs: [
        { question: `O Control G funciona sem internet no ${profile.name}?`, answer: 'Sim. Depois de preparar a conta e baixar as atribuições, a coleta continua sem conexão e sincroniza quando o dispositivo volta a ter internet.' },
        { question: `Pode ser configurado para ${profile.institutions}?`, answer: 'Sim. Cada organização mantém seus próprios usuários, territórios, formulários, permissões e dados separados.' },
        { question: 'Os formulários podem ser adaptados à legislação local?', answer: 'Sim. Perguntas, consentimentos, validações, idioma e regras de tratamento de dados podem ser configurados antes da publicação.' },
        { question: 'Como solicitar uma demonstração?', answer: 'Envie uma mensagem pelo WhatsApp informando o tipo de operação, territórios, quantidade de usuários e formulários necessários.' },
      ],
      countryCode: profile.code,
      locale: profile.locale,
    }
  }
  return {
    path: `/encuestas-offline/${profile.slug}`,
    title: `Encuestas offline en ${profile.name} | Control G`,
    description: `Caracterización y encuestas offline en ${profile.name}. Capture datos, GPS y evidencias sin internet para operativos territoriales de entidades públicas.`,
    eyebrow: `Operación territorial en ${profile.name}`,
    heading: `Encuestas y caracterización offline en ${profile.name}`,
    lead: `Organice equipos por ${profile.admin1} y ${profile.admin2}, recolecte información sin señal y sincronice cuando regrese la conectividad.`,
    keywords: [`encuestas offline ${profile.name}`, `software de caracterización ${profile.name}`, `recolección de datos sin internet`, `software para ${profile.institutions}`, 'formularios offline Android'],
    whatsappMessage: `Hola, busco una plataforma de encuestas offline para un operativo en ${profile.name}. Quiero conocer Control G.`,
    sections: [
      { title: 'Captura sin depender de cobertura', body: 'Los equipos descargan formularios y asignaciones antes de salir. Respuestas, GPS, fotos, audio y firmas permanecen en el dispositivo hasta que sea posible sincronizar.' },
      { title: `Operación organizada por ${profile.admin1}`, body: `La plataforma separa entidades, equipos, instrumentos y territorios. Los coordinadores distribuyen trabajo por ${profile.admin2}, prioridad, vigencia y cuota.` },
      { title: 'Datos preparados para control y análisis', body: 'Al recuperar internet, evidencias y respuestas llegan a Supabase con trazabilidad. Los tableros, mapas e informes permiten seguir cobertura y calidad.' },
    ],
    benefits: ['Aplicación Android offline', 'Formularios configurables', 'GPS, fotografías, audio y firmas', `Cobertura por ${profile.admin2}`, 'Sincronización automática', 'Mapas e informes institucionales'],
    faqs: [
      { question: `¿Control G funciona sin internet en ${profile.name}?`, answer: 'Sí. Después de preparar la cuenta y descargar las asignaciones, la captura continúa sin conexión y sincroniza cuando el dispositivo vuelve a tener internet.' },
      { question: `¿Se puede configurar para ${profile.institutions}?`, answer: 'Sí. Cada organización mantiene usuarios, territorios, formularios, permisos y datos propios separados de las demás entidades.' },
      { question: '¿Los formularios se adaptan a las normas del país?', answer: 'Sí. Las preguntas, consentimientos, validaciones, idioma y reglas de tratamiento de datos se configuran antes de publicar cada instrumento.' },
      { question: '¿Cómo solicito una demostración?', answer: 'Escriba por WhatsApp e indique el tipo de operativo, territorios, número de usuarios y formularios requeridos para preparar una demostración enfocada.' },
    ],
    countryCode: profile.code,
    locale: profile.locale,
  }
}

export const CORE_SEO_PAGES = seoPagesData as SeoPage[]
export const COUNTRY_SEO_PAGES = (countryLandingProfiles as CountryLandingProfile[]).map(buildCountrySeoPage)
export const SEO_PAGES = [...CORE_SEO_PAGES, ...COUNTRY_SEO_PAGES]

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
      areaServed: [page.countryCode || 'Colombia', 'Latinoamérica'],
    },
    {
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: page.title,
      description: page.description,
      inLanguage: page.locale || 'es-CO',
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
