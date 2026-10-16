import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile('src/lib/marketing-analytics.ts', 'utf8')
const pages = JSON.parse(await readFile('src/config/seo-pages.json', 'utf8'))
const countries = JSON.parse(await readFile('src/config/country-landing-profiles.json', 'utf8'))
let sequence = 0

async function loadAnalytics({ production = true, measurementId = 'G-TEST123456' } = {}) {
  let js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText
  js = js.replace(/import seoPages from ['"][^'"]+['"];?/, `const seoPages = ${JSON.stringify(pages)};`)
  js = js.replace(/import countryProfiles from ['"][^'"]+['"];?/, `const countryProfiles = ${JSON.stringify(countries)};`)
  js = js.replace(/import\.meta\.env/g, JSON.stringify({ PROD: production, VITE_GA4_MEASUREMENT_ID: measurementId }))
  js += `\n// Isolated runtime ${++sequence}`
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
}

function browser({ url = 'https://www.controlg.co/', canonical, robots = 'index, follow', referrer = 'https://www.google.com/search?q=nombre%40example.com', native = false, storageThrows = false, savedConsent } = {}) {
  const location = new URL(url)
  const storage = new Map([['existing-app-preference', 'keep-me']])
  if (savedConsent !== undefined) storage.set('control-g.marketing-consent.v1', JSON.stringify(savedConsent))
  const cookieJar = new Map([['_ga', 'analytics-id'], ['_ga_TEST123456', 'stream-id'], ['auth-session', 'do-not-touch'], ['other_preference', 'keep']])
  const windowListeners = new Map(), documentListeners = new Map()
  const scripts = []
  let currentCanonical = canonical === undefined ? `https://www.controlg.co${location.pathname.replace(/\/$/, '') || '/'}` : canonical
  let currentRobots = robots
  let disabledAtHistoryCall = null
  const target = {
    location,
    Capacitor: { isNativePlatform: () => native, getPlatform: () => native ? 'android' : 'web' },
    localStorage: {
      getItem(key) { if (storageThrows) throw Error('Storage blocked'); return storage.get(key) ?? null },
      setItem(key, value) { if (storageThrows) throw Error('Storage blocked'); storage.set(key, value) },
    },
    addEventListener(name, listener) { const listeners = windowListeners.get(name) || []; listeners.push(listener); windowListeners.set(name, listeners) },
    dataLayer: [{ event: 'whatsapp_lead', placement: 'before-consent' }],
  }
  target.history = Object.fromEntries(['pushState', 'replaceState'].map(method => [method, function (_state, _title, path) {
    disabledAtHistoryCall = target['ga-disable-G-TEST123456']
    if (path) target.location = new URL(String(path), target.location.href)
  }]))
  const document = {
    referrer,
    querySelector(selector) {
      if (selector === 'meta[name="robots"]') return currentRobots === null ? null : { getAttribute: name => name === 'content' ? currentRobots : null }
      if (selector === 'link[rel="canonical"]') return currentCanonical === null ? null : { getAttribute: name => name === 'href' ? currentCanonical : null }
      return null
    },
    getElementById(id) { return scripts.find(script => script.id === id) || null },
    createElement(tag) { assert.equal(tag, 'script'); return {} },
    head: { appendChild(script) { scripts.push(script) } },
    addEventListener(name, listener) { const listeners = documentListeners.get(name) || []; listeners.push(listener); documentListeners.set(name, listeners) },
    get cookie() { return [...cookieJar].map(([name, value]) => `${name}=${value}`).join('; ') },
    set cookie(value) { const [pair] = value.split(';'); const [name, data] = pair.split('='); if (/Max-Age=0/.test(value)) cookieJar.delete(name); else cookieJar.set(name, data) },
  }
  Object.defineProperty(target, 'indexedDB', { get() { throw Error('Analytics must not access offline storage') } })
  globalThis.window = target
  globalThis.document = document
  const commands = () => (target.controlGMarketingLayer || []).map(command => Array.from(command))
  return {
    target, document, scripts, storage, cookieJar, commands,
    events: () => commands().filter(command => command[0] === 'event'),
    setCanonical(value) { currentCanonical = value },
    setRobots(value) { currentRobots = value },
    get disabledAtHistoryCall() { return disabledAtHistoryCall },
    dispatchStorage(choice) { storage.set('control-g.marketing-consent.v1', JSON.stringify({ version: 1, choice })); for (const listener of windowListeners.get('storage') || []) listener({ key: 'control-g.marketing-consent.v1' }) },
    dispatchPopstate() { for (const listener of windowListeners.get('popstate') || []) listener({}) },
  }
}

test('SSR y entornos sin ID, preview, desarrollo o APK no cargan ni miden', async () => {
  delete globalThis.window; delete globalThis.document
  const server = await loadAnalytics()
  assert.equal(server.getMarketingConsent(), null)
  assert.equal(server.syncMarketingPageView(), false)
  assert.equal(server.trackConsentedMarketingEvent('whatsapp_lead'), false)
  for (const settings of [
    { environment: { measurementId: '' } },
    { environment: { measurementId: 'G-INVALID<script>' } },
    { environment: { production: false } },
    { browser: { url: 'https://control-g-preview.vercel.app/' } },
    { browser: { url: 'http://localhost/' } },
    { browser: { url: 'https://www.controlg.co:8443/' } },
    { browser: { native: true } },
  ]) {
    const current = browser(settings.browser)
    const analytics = await loadAnalytics(settings.environment)
    analytics.setMarketingConsent('accepted')
    assert.equal(analytics.canOfferMarketingAnalytics(), false)
    assert.equal(current.scripts.length, 0)
    assert.equal(current.events().length, 0)
  }
})

test('no hay etiqueta, cola Google ni reenvío de clics anteriores al consentimiento', async () => {
  const current = browser()
  const analytics = await loadAnalytics()
  const appQueue = current.target.dataLayer
  assert.equal(analytics.syncMarketingPageView(), false)
  assert.equal(analytics.trackConsentedMarketingEvent('whatsapp_lead', { placement: 'antes' }), false)
  assert.equal(current.scripts.length, 0)
  assert.equal(current.target.controlGMarketingLayer, undefined)
  analytics.setMarketingConsent('accepted')
  assert.deepEqual(current.events().map(event => event[1]), ['page_view'])
  assert.equal(current.target.dataLayer, appQueue)
  assert.deepEqual(appQueue, [{ event: 'whatsapp_lead', placement: 'before-consent' }])
})

test('aceptar configura consentimiento básico sin publicidad y solo URL canonical sin query/hash', async () => {
  const current = browser({ url: 'https://www.controlg.co/?email=persona%40example.com#firma', referrer: 'https://www.google.com/search?q=datos-personales' })
  const analytics = await loadAnalytics()
  analytics.setMarketingConsent('accepted')
  assert.equal(current.scripts.length, 1)
  assert.equal(current.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-TEST123456&l=controlGMarketingLayer')
  assert.equal(current.scripts[0].referrerPolicy, 'no-referrer')
  const commands = current.commands()
  assert.deepEqual(commands[0], ['consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }])
  assert.equal(commands[1][2].analytics_storage, 'granted')
  assert.equal(commands[1][2].ad_user_data, 'denied')
  const config = commands.find(command => command[0] === 'config')[2]
  assert.equal(config.send_page_view, false)
  assert.equal(config.allow_google_signals, false)
  assert.equal(config.allow_ad_personalization_signals, false)
  assert.equal(config.page_location, 'https://www.controlg.co/')
  assert.equal(config.page_referrer, 'https://www.google.com')
  assert.equal(config.page_title, 'Control G')
  assert.equal(JSON.stringify(commands).includes('persona@example.com'), false)
  assert.equal(JSON.stringify(commands).includes('persona%40example.com'), false)
  assert.equal(JSON.stringify(commands).includes('datos-personales'), false)
  assert.equal(current.events()[0][2].page_path, '/')
})

test('eventos solo aceptan campos y categorías de proyecto permitidos; nunca datos personales', async () => {
  const current = browser({ url: 'https://www.controlg.co/encuestas-georreferenciadas?token=privado' })
  const analytics = await loadAnalytics()
  analytics.setMarketingConsent('accepted')
  assert.equal(analytics.trackConsentedMarketingEvent('whatsapp_funnel_complete', {
    source: 'encuestas-georreferenciadas', placement: 'hero-inicio', entity: 'Empresa',
    project: 'Encuestas o censos', team: '1 a 10 profesionales', country: 'Colombia', volume: 'Hasta 1.000 encuestas',
    page_path: '/admin/responses?email=privado', email: 'persona@example.com', phone: '+573009010300', message: 'Datos de una familia', latitude: 10.39,
  }), true)
  const event = current.events().at(-1)
  assert.deepEqual(event[2], {
    page_path: '/encuestas-georreferenciadas', placement: 'hero-inicio', source: 'encuestas-georreferenciadas',
    entity: 'Empresa', project: 'Encuestas o censos', team: '1 a 10 profesionales', country: 'Colombia', volume: 'Hasta 1.000 encuestas', send_to: 'G-TEST123456',
  })
  analytics.trackConsentedMarketingEvent('whatsapp_lead', { placement: 'persona@example.com', source: 'telefono-3009010300', entity: 'Nombre de una persona', country: 'Dirección particular' })
  assert.deepEqual(current.events().at(-1)[2], { page_path: '/encuestas-georreferenciadas', send_to: 'G-TEST123456' })
  assert.equal(analytics.trackConsentedMarketingEvent('beneficiary_response', { id: 'private' }), false)
})

test('revocar deshabilita la medición y elimina solo cookies GA, conservando datos de la app', async () => {
  const current = browser()
  const analytics = await loadAnalytics()
  analytics.setMarketingConsent('accepted')
  analytics.setMarketingConsent('rejected')
  assert.equal(current.target['ga-disable-G-TEST123456'], true)
  assert.equal(analytics.getMarketingConsent(), 'rejected')
  assert.equal(current.cookieJar.has('_ga'), false)
  assert.equal(current.cookieJar.has('_ga_TEST123456'), false)
  assert.equal(current.cookieJar.get('auth-session'), 'do-not-touch')
  assert.equal(current.cookieJar.get('other_preference'), 'keep')
  assert.equal(current.storage.get('existing-app-preference'), 'keep-me')
  assert.equal(JSON.parse(current.storage.get(analytics.MARKETING_CONSENT_KEY)).choice, 'rejected')
  assert.equal(current.commands().length, 0)
  assert.equal(analytics.trackConsentedMarketingEvent('whatsapp_lead'), false)
  assert.equal(current.commands().length, 0)
})

test('solo una vista manual por canonical; los cambios de query no duplican vistas', async () => {
  const current = browser()
  const analytics = await loadAnalytics()
  analytics.setMarketingConsent('accepted')
  analytics.syncMarketingPageView()
  assert.equal(current.events().length, 1)
  current.target.history.pushState({}, '', '/?email=privado#hash')
  assert.equal(current.disabledAtHistoryCall, true)
  analytics.syncMarketingPageView()
  assert.equal(current.events().length, 1)
  current.target.history.pushState({}, '', '/blog')
  assert.equal(current.target['ga-disable-G-TEST123456'], true)
  current.setCanonical('https://www.controlg.co/blog')
  analytics.syncMarketingPageView()
  assert.deepEqual(current.events().map(event => event[2].page_path), ['/', '/blog'])
})

test('History se bloquea antes de entrar a rutas privadas aunque el canonical siga público', async () => {
  for (const path of ['/login', '/admin', '/coord/responses', '/apoyo/map', '/field/capture', '/recuperar-contrasena', '/restablecer-contrasena', '/demo']) {
    const current = browser()
    const analytics = await loadAnalytics()
    analytics.setMarketingConsent('accepted')
    const previousEvents = current.events().length
    current.target.history.pushState({}, '', path)
    assert.equal(current.disabledAtHistoryCall, true, path)
    assert.equal(analytics.trackConsentedMarketingEvent('whatsapp_lead', { placement: 'hero' }), false, path)
    assert.equal(analytics.syncMarketingPageView(), false, path)
    assert.equal(current.target['ga-disable-G-TEST123456'], true, path)
    assert.equal(current.events().length, previousEvents, path)
  }
})

test('robots noindex o canonical inexistente, externo o distinto impiden cualquier envío', async () => {
  for (const settings of [
    { robots: 'noindex, nofollow' }, { robots: 'NOINDEX' }, { robots: 'none' }, { robots: null },
    { canonical: null }, { canonical: 'https://evil.example/' }, { canonical: 'https://www.controlg.co/blog' },
    { canonical: 'https://www.controlg.co/?email=privado' }, { canonical: 'https://www.controlg.co/#privado' },
  ]) {
    const current = browser(settings)
    const analytics = await loadAnalytics()
    analytics.setMarketingConsent('accepted')
    assert.equal(current.events().length, 0)
    assert.equal(current.scripts.length, 0)
    assert.equal(analytics.canOfferMarketingAnalytics(), false)
  }
})

test('la revocación de otra pestaña deshabilita inmediatamente sin borrar almacenamiento de campo', async () => {
  const current = browser()
  const analytics = await loadAnalytics()
  analytics.setMarketingConsent('accepted')
  current.dispatchStorage('rejected')
  assert.equal(current.target['ga-disable-G-TEST123456'], true)
  assert.equal(analytics.getMarketingConsent(), 'rejected')
  assert.equal(current.commands().length, 0)
  assert.equal(current.storage.get('existing-app-preference'), 'keep-me')
  assert.equal(analytics.trackConsentedMarketingEvent('whatsapp_lead'), false)
})

test('bloqueo por popstate y cambios de metadatos detiene eventos antes de medir otra ruta', async () => {
  const current = browser()
  const analytics = await loadAnalytics()
  analytics.setMarketingConsent('accepted')
  current.dispatchPopstate()
  assert.equal(current.target['ga-disable-G-TEST123456'], true)
  current.setRobots('noindex, nofollow')
  const previousEvents = current.events().length
  assert.equal(analytics.syncMarketingPageView(), false)
  assert.equal(current.events().length, previousEvents)
})

test('preferencias versionadas y almacenamiento inaccesible fallan sin cargar Google', async () => {
  for (const savedConsent of [{ version: 0, choice: 'accepted' }, { version: 1, choice: 'invented' }, null]) {
    const current = browser({ savedConsent })
    const analytics = await loadAnalytics()
    assert.equal(analytics.getMarketingConsent(), null)
    assert.equal(analytics.syncMarketingPageView(), false)
    assert.equal(current.scripts.length, 0)
  }
  const current = browser({ storageThrows: true })
  const analytics = await loadAnalytics()
  assert.equal(analytics.getMarketingConsent(), null)
  assert.equal(current.scripts.length, 0)
  assert.doesNotThrow(() => analytics.setMarketingConsent('accepted'))
  assert.equal(analytics.getMarketingConsent(), 'accepted')
  assert.equal(current.events().length, 1)
  assert.doesNotThrow(() => analytics.setMarketingConsent('rejected'))
  assert.equal(current.target['ga-disable-G-TEST123456'], true)
})

test('las rutas medibles están delimitadas y no admiten nombres privados ni URLs ambiguas', async () => {
  const analytics = await loadAnalytics()
  for (const path of ['/', '/blog', '/blog/crear-encuestas-ia-validacion-humana', '/encuestas-offline/colombia', '/encuestas-para-ong']) assert.equal(analytics.isPublicMarketingPath(path), true, path)
  for (const path of ['/admin', '/coord', '/login', '/api/health', '/blog/persona@example.com', '/blog/%2e%2e/admin', '//blog/post', '/blog/post?email=x', '/blog/a\\b', 'https://www.controlg.co/']) assert.equal(analytics.isPublicMarketingPath(path), false, path)
})
