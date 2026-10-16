import seoPages from '@/config/seo-pages.json'
import countryProfiles from '@/config/country-landing-profiles.json'

// Basic consent: the Google script and its queue do not exist before acceptance.
// https://developers.google.com/tag-platform/security/concepts/consent-mode
// Enhanced Measurement must also be disabled in the GA4 web stream. In particular,
// send_page_view:false alone does not disable history-driven automatic pageviews.
export const MARKETING_CONSENT_KEY = 'control-g.marketing-consent.v1'
export const MARKETING_ANALYTICS_LAYER = 'controlGMarketingLayer'
const SCRIPT_ID = 'control-g-consented-analytics'
const SITE_ORIGIN = 'https://www.controlg.co'
const SITE_HOSTS = new Set(['www.controlg.co', 'controlg.co'])
const PUBLIC_PATHS = new Set([
  ...seoPages.map(page => page.path),
  ...countryProfiles.map(country => `/encuestas-offline/${country.slug}`),
  '/blog',
])
const EVENTS = new Set(['whatsapp_lead', 'whatsapp_funnel_complete'])
const ENTITY_VALUES = new Set(['Alcaldía', 'Gobernación', 'Entidad nacional', 'Operador o contratista', 'ONG o fundación', 'Empresa', 'Corporación o asociación', 'Universidad o centro de investigación'])
const PROJECT_VALUES = new Set(['Caracterización social', 'Encuestas o censos', 'Visitas técnicas', 'Seguimiento de beneficiarios', 'Inventario territorial', 'Otro levantamiento de información'])
const TEAM_VALUES = new Set(['1 a 10 profesionales', '11 a 50 profesionales', '51 a 200 profesionales', 'Más de 200 profesionales'])
const VOLUME_VALUES = new Set(['Hasta 1.000 encuestas', '1.001 a 10.000 encuestas', 'Más de 10.000 encuestas', 'Necesito definir el alcance'])
const COUNTRY_VALUES = new Set([...countryProfiles.flatMap(country => [country.name, country.code]), 'Otro país'])
const DENIED_CONSENT = { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }

export type MarketingConsent = 'accepted' | 'rejected' | null
type ConsentChoice = Exclude<MarketingConsent, null>
type AnalyticsWindow = Window & {
  controlGMarketingLayer?: unknown[]
  Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string }
}
type PublicPage = { path: string; canonical: string; referrer: string }

let cachedConsent: MarketingConsent | undefined
let initializedId: string | null = null
let lastPage: string | null = null
let guardsInstalled = false
const consentListeners = new Set<() => void>()

export function getMarketingMeasurementId() {
  const env = import.meta.env as { PROD?: boolean; VITE_GA4_MEASUREMENT_ID?: string }
  const id = env.VITE_GA4_MEASUREMENT_ID?.trim() || ''
  return env.PROD === true && /^G-[A-Z0-9]{6,20}$/.test(id) ? id : null
}

function browserWindow(): AnalyticsWindow | null {
  return typeof window !== 'undefined' && typeof document !== 'undefined' ? window as AnalyticsWindow : null
}

export function isPublicMarketingPath(path: string) {
  if (typeof path !== 'string' || !path.startsWith('/') || /[%?#\\]/.test(path) || path.includes('//')) return false
  const normalized = path.length > 1 ? path.replace(/\/$/, '') : path
  return PUBLIC_PATHS.has(normalized) || /^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) && normalized.length <= 170
}

function isProductionWeb() {
  const target = browserWindow()
  if (!target || !getMarketingMeasurementId() || target.location.protocol !== 'https:' || !SITE_HOSTS.has(target.location.hostname) || target.location.port && target.location.port !== '443') return false
  try {
    if (target.Capacitor?.isNativePlatform?.() || target.Capacitor?.getPlatform && target.Capacitor.getPlatform() !== 'web') return false
  } catch { return false }
  return true
}

function publicPage(): PublicPage | null {
  if (!isProductionWeb()) return null
  const target = browserWindow()!
  if (!isPublicMarketingPath(target.location.pathname)) return null
  const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.getAttribute('content')
  const href = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href')
  if (!href || !robots || /(?:^|[\s,])(?:noindex|none)(?:$|[\s,])/i.test(robots)) return null
  try {
    const canonical = new URL(href)
    const path = target.location.pathname.length > 1 ? target.location.pathname.replace(/\/$/, '') : '/'
    if (canonical.origin !== SITE_ORIGIN || canonical.pathname !== path || canonical.search || canonical.hash || canonical.username || canonical.password) return null
    let referrer = ''
    try {
      const source = new URL(document.referrer)
      if (source.protocol === 'https:' || source.protocol === 'http:') referrer = source.origin
    } catch { /* A direct visit has no referrer. */ }
    return { path, canonical: `${SITE_ORIGIN}${path}`, referrer }
  } catch { return null }
}

export function canOfferMarketingAnalytics() {
  return publicPage() !== null
}

export function getMarketingConsent(): MarketingConsent {
  const target = browserWindow()
  if (!target) return null
  if (cachedConsent !== undefined) return cachedConsent
  try {
    const value: unknown = JSON.parse(target.localStorage.getItem(MARKETING_CONSENT_KEY) || 'null')
    if (value && typeof value === 'object' && 'version' in value && value.version === 1 && 'choice' in value && (value.choice === 'accepted' || value.choice === 'rejected')) cachedConsent = value.choice
    else cachedConsent = null
  } catch { cachedConsent = null }
  return cachedConsent
}

function disabled(value: boolean) {
  const target = browserWindow()
  const id = getMarketingMeasurementId()
  if (target && id) (target as unknown as Record<string, unknown>)[`ga-disable-${id}`] = value
}

export function stopMarketingAnalytics() {
  disabled(true)
  lastPage = null
}

function deleteAnalyticsCookies() {
  if (!browserWindow()) return
  // Only our GA cookie family. Keep authentication, application storage and Dexie intact.
  const names = document.cookie.split(';').map(cookie => cookie.trim().split('=')[0]).filter(name => /^_ga(?:_[A-Za-z0-9_]+)?$/.test(name))
  const domains = ['', 'www.controlg.co', '.www.controlg.co', 'controlg.co', '.controlg.co']
  for (const name of names) for (const domain of domains) {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure${domain ? `; Domain=${domain}` : ''}`
  }
}

export function setMarketingConsent(choice: ConsentChoice) {
  if (!browserWindow() || choice !== 'accepted' && choice !== 'rejected') return
  cachedConsent = choice
  try {
    window.localStorage.setItem(MARKETING_CONSENT_KEY, JSON.stringify({ version: 1, choice, updatedAt: new Date().toISOString() }))
  } catch { /* The in-memory choice still applies if storage is unavailable. */ }
  if (choice === 'rejected') {
    stopMarketingAnalytics()
    deleteAnalyticsCookies()
    // Drop only this tag's queued commands, never the application's dataLayer.
    const queue = (window as AnalyticsWindow).controlGMarketingLayer
    if (queue) queue.length = 0
    initializedId = null
  } else syncMarketingPageView()
  consentListeners.forEach(listener => listener())
}

export function subscribeMarketingConsent(listener: () => void) {
  consentListeners.add(listener)
  return () => { consentListeners.delete(listener) }
}

function installNavigationGuards() {
  const target = browserWindow()
  if (!target || guardsInstalled) return
  guardsInstalled = true
  // Install before gtag.js. Pause before History changes so an old public document
  // cannot measure a new private URL while React updates its route and metadata.
  for (const method of ['pushState', 'replaceState'] as const) {
    const original = target.history[method]
    target.history[method] = function (...args: Parameters<History[typeof method]>) {
      disabled(true)
      return original.apply(this, args)
    }
  }
  target.addEventListener('popstate', () => disabled(true), true)
  document.addEventListener('click', event => {
    const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
    const href = anchor?.getAttribute('href')
    if (!href) return
    try {
      const destination = new URL(href, target.location.href)
      if (destination.origin === target.location.origin && !isPublicMarketingPath(destination.pathname)) disabled(true)
    } catch { /* Malformed links must not interfere with navigation. */ }
  }, true)
  target.addEventListener('storage', event => {
    if (event.key !== MARKETING_CONSENT_KEY) return
    cachedConsent = undefined
    if (getMarketingConsent() !== 'accepted') {
      stopMarketingAnalytics()
      deleteAnalyticsCookies()
      const queue = target.controlGMarketingLayer
      if (queue) queue.length = 0
      initializedId = null
    }
    consentListeners.forEach(listener => listener())
  })
}

function command(..._arguments: unknown[]) {
  const target = browserWindow()
  if (!target) return
  target.controlGMarketingLayer = target.controlGMarketingLayer || []
  // The Arguments object is the documented gtag command format. The dedicated
  // layer avoids replaying any application events recorded before consent.
  // eslint-disable-next-line prefer-rest-params -- Preserve the documented gtag Arguments command format.
  target.controlGMarketingLayer.push(arguments)
}

function pageParameters(page: PublicPage) {
  return { page_location: page.canonical, page_path: page.path, page_referrer: page.referrer, page_title: 'Control G' }
}

function ensureTag(page: PublicPage) {
  const id = getMarketingMeasurementId()!
  installNavigationGuards()
  disabled(false)
  if (initializedId !== id) {
    command('consent', 'default', { ...DENIED_CONSENT })
    command('consent', 'update', { ...DENIED_CONSENT, analytics_storage: 'granted' })
    command('set', { ...pageParameters(page), allow_google_signals: false, allow_ad_personalization_signals: false, ads_data_redaction: true, url_passthrough: false })
    command('js', new Date())
    command('config', id, {
      ...pageParameters(page), send_page_view: false,
      allow_google_signals: false, allow_ad_personalization_signals: false,
      ads_data_redaction: true, url_passthrough: false,
      cookie_domain: 'controlg.co', cookie_path: '/', cookie_flags: 'SameSite=Lax;Secure',
    })
    initializedId = id
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement('script')
      script.id = SCRIPT_ID
      script.async = true
      script.referrerPolicy = 'no-referrer'
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}&l=${MARKETING_ANALYTICS_LAYER}`
      document.head.appendChild(script)
    }
  }
}

export function syncMarketingPageView() {
  const page = publicPage()
  if (!page || getMarketingConsent() !== 'accepted') {
    stopMarketingAnalytics()
    return false
  }
  ensureTag(page)
  if (lastPage !== page.canonical) {
    command('set', pageParameters(page))
    command('event', 'page_view', { ...pageParameters(page), send_to: getMarketingMeasurementId() })
    lastPage = page.canonical
  }
  return true
}

function sanitizedAttributes(data: Record<string, unknown>, page: PublicPage) {
  const result: Record<string, string> = { page_path: page.path }
  for (const key of ['placement', 'source'] as const) {
    const value = data[key]
    if (typeof value === 'string' && /^(?=.*[a-z])[a-z0-9/_-]{1,160}$/i.test(value) && !/\d{7}/.test(value)) result[key] = value
  }
  for (const [key, allowed] of [['entity', ENTITY_VALUES], ['project', PROJECT_VALUES], ['team', TEAM_VALUES], ['country', COUNTRY_VALUES], ['volume', VOLUME_VALUES]] as const) {
    const value = data[key]
    if (typeof value === 'string' && allowed.has(value)) result[key] = value
  }
  return result
}

export function trackConsentedMarketingEvent(eventName: string, data: Record<string, unknown> = {}) {
  if (!EVENTS.has(eventName)) return false
  const page = publicPage()
  if (!page || getMarketingConsent() !== 'accepted') {
    stopMarketingAnalytics()
    return false
  }
  ensureTag(page)
  command('set', pageParameters(page))
  command('event', eventName, { ...sanitizedAttributes(data, page), send_to: getMarketingMeasurementId() })
  return true
}
