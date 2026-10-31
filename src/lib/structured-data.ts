// Shared identities must describe the same entity on every public route.
// Do not add prices, ratings, offices or social profiles without public evidence.
export const SITE_URL = 'https://www.controlg.co'
export const ORGANIZATION_ID = `${SITE_URL}/#organization`
export const WEBSITE_ID = `${SITE_URL}/#website`
export const SERVICE_ID = `${SITE_URL}/#service`
export const SOFTWARE_ID = `${SITE_URL}/#software`
export const EDITORIAL_ID = `${SITE_URL}/blog#equipo-editorial`
export const EDITORIAL_NAME = 'Equipo editorial Control G'

export type SchemaNode = Record<string, unknown>

export function buildIdentityGraph(): SchemaNode[] {
  return [
    {
      '@type': 'ImageObject', '@id': `${SITE_URL}/#logo`,
      url: `${SITE_URL}/pwa-512x512.png`, contentUrl: `${SITE_URL}/pwa-512x512.png`,
      width: 512, height: 512, caption: 'Control G',
    },
    {
      '@type': 'Organization', '@id': `${SITE_URL}/#dran-digital`, name: 'DRAN Digital S.A.S.',
    },
    {
      '@type': 'Organization', '@id': ORGANIZATION_ID,
      name: 'Control G', alternateName: ['ControlG', 'Control G by DRAN Digital'],
      url: `${SITE_URL}/`, logo: { '@id': `${SITE_URL}/#logo` },
      parentOrganization: { '@id': `${SITE_URL}/#dran-digital` },
      description: 'Plataforma de caracterización, encuestas y levantamiento de información en campo de DRAN Digital para Colombia y Latinoamérica.',
      contactPoint: {
        '@type': 'ContactPoint', telephone: '+57-300-901-0300',
        contactType: 'sales', availableLanguage: ['Spanish'],
        url: 'https://wa.me/573009010300',
      },
      areaServed: [{ '@type': 'Country', name: 'Colombia' }, { '@type': 'Place', name: 'Latinoamérica' }],
    },
    {
      '@type': 'WebSite', '@id': WEBSITE_ID, url: `${SITE_URL}/`,
      name: 'Control G', alternateName: 'ControlG',
      description: 'Software de caracterización, encuestas y levantamiento de información en campo.',
      inLanguage: ['es-CO', 'pt-BR'], publisher: { '@id': ORGANIZATION_ID },
    },
  ]
}

export function buildServiceNode(): SchemaNode {
  // The commercial offer is configured/quoted per project. It is not a free
  // app-store listing with public prices and independently verifiable ratings.
  // Service describes that scope separately from the actual application.
  return {
    '@type': 'Service', '@id': SERVICE_ID, name: 'Control G', url: `${SITE_URL}/`,
    serviceType: 'Plataforma de caracterización, encuestas y captura de información en campo',
    description: 'Formularios configurables con asistencia de IA y revisión humana, captura Android offline después de preparar el equipo y sincronización al recuperar conexión. Configuración y acompañamiento según el proyecto.',
    provider: { '@id': ORGANIZATION_ID },
    areaServed: [{ '@type': 'Country', name: 'Colombia' }, { '@type': 'Place', name: 'Latinoamérica' }],
  }
}

export function buildSoftwareNode(): SchemaNode {
  // Keep the application's factual description on its canonical home page.
  // Missing public offers/reviews must not be "fixed" with fabricated values.
  return {
    '@type': ['WebApplication', 'MobileApplication'], '@id': SOFTWARE_ID,
    name: 'Control G', url: `${SITE_URL}/`, applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, Android', inLanguage: 'es',
    description: 'Aplicación web y Android de Control G para caracterización, encuestas y levantamiento de información en campo, con captura offline después de preparar el dispositivo y sincronización al recuperar conexión.',
    featureList: [
      'Formularios configurables y borradores con asistencia de IA y revisión humana',
      'Captura Android offline de instrumentos preparados y asignados',
      'Fotos, audio, firma manuscrita y ubicación según permisos',
      'Sincronización al recuperar conexión',
      'Asignaciones y revisión por roles',
      'Mapas territoriales, capas GIS y exportaciones',
    ],
    image: { '@id': `${SITE_URL}/#logo` },
    author: { '@id': `${SITE_URL}/#dran-digital` }, publisher: { '@id': ORGANIZATION_ID },
  }
}

export function buildEditorialNode(): SchemaNode {
  return {
    '@type': 'Organization', '@id': EDITORIAL_ID, name: EDITORIAL_NAME,
    url: EDITORIAL_ID, parentOrganization: { '@id': ORGANIZATION_ID },
  }
}

export function buildBreadcrumbNode(canonical: string, items: Array<{ name: string; url: string }>): SchemaNode {
  return {
    '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.name, item: item.url,
    })),
  }
}

export function buildImageNode(canonical: string, image: string, caption: string): SchemaNode {
  return {
    '@type': 'ImageObject', '@id': `${canonical}#primaryimage`,
    url: new URL(image, SITE_URL).href, contentUrl: new URL(image, SITE_URL).href,
    caption,
  }
}
