import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const root = new URL('../', import.meta.url)
const read = path => readFile(new URL(path, root), 'utf8')

test('la aplicación usa Supabase y eliminó dependencias Appwrite', async () => {
  const pkg = JSON.parse(await read('package.json'))
  assert.ok(pkg.dependencies['@supabase/supabase-js'])
  assert.equal(pkg.dependencies.appwrite, undefined)
  assert.equal(pkg.dependencies['node-appwrite'], undefined)
})

test('la migración contiene aislamiento, almacenamiento e idempotencia offline', async () => {
  const sql = await read('supabase/migrations/202608070001_initial_control_g.sql')
  assert.match(sql, /enable row level security/)
  assert.match(sql, /local_id text not null unique/)
  assert.match(sql, /control_g_storage_insert/)
  assert.match(sql, /current_entity_id\(\)/)
  assert.match(sql, /gov-bolivar-2026/)
})

test('están definidos los cinco formularios y los contenidos de los tres momentos', async () => {
  const sql = await read('supabase/migrations/202608070001_initial_control_g.sql')
  for (const id of [
    'form_ex_antes_bolivar',
    'form_enc_1_bolivar',
    'form_enc_2_bolivar',
    'form_enc_3_bolivar',
    'form_ex_post_bolivar',
  ]) assert.match(sql, new RegExp(id))
  for (const term of ['buen trato', 'hábitos saludables', 'ambiente seguro', 'responsabilidad familiar', 'derechos', 'bullying']) {
    assert.ok(sql.toLowerCase().includes(term), `Falta el contenido: ${term}`)
  }
})

test('el motor sincroniza medios antes de enviar respuestas y actividades', async () => {
  const source = await read('src/lib/sync-engine.ts')
  const media = source.indexOf('await syncMediaQueue()')
  const activities = source.indexOf('await syncActivities()')
  const responses = source.indexOf('await syncFormResponses()')
  assert.ok(media > 0 && media < activities && activities < responses)
  assert.match(source, /isDuplicate/)
  assert.match(source, /hasUnresolvedMedia/)
  assert.match(source, /item\.status !== 'uploaded'/)
  assert.doesNotMatch(source, /attempts >= 5 \? 'failed'/)
})

test('el APK abre en login y la web conserva la landing', async () => {
  const source = await read('src/App.tsx')
  const main = await read('src/main.tsx')
  const activity = await read('android/app/src/main/java/com/drandigital/controlg/MainActivity.java')
  const apkBuild = await read('scripts/build-apk.sh')
  const vite = await read('vite.config.ts')
  assert.match(source, /Capacitor\.isNativePlatform\(\)/)
  assert.match(source, /\? <Navigate to="\/login" replace \/>/)
  assert.match(source, /: <LandingPage \/>/)
  assert.match(main, /window\.history\.replaceState\(null, '', '\/login'\)/)
  assert.match(activity, /bridge\.getLocalUrl\(\) \+ LOGIN_PATH/)
  assert.match(activity, /navigator\.serviceWorker\.getRegistrations/)
  assert.match(apkBuild, /VITE_NATIVE_BUILD=true npm run build/)
  assert.match(vite, /injectRegister: isNativeBuild \? null : 'auto'/)
})

test('la captura offline usa caché, conserva borradores y encola respuestas', async () => {
  const capture = await read('src/pages/professional/CapturePage.tsx')
  const responder = await read('src/pages/professional/FormResponderPage.tsx')
  const auth = await read('src/stores/authStore.ts')
  assert.match(capture, /getCachedFormAssignments/)
  assert.match(capture, /if \(!connected\)/)
  assert.match(responder, /status: 'draft'/)
  assert.match(responder, /status: 'completed'/)
  assert.match(responder, /localDB\.formResponses\.put/)
  assert.match(responder, /await processSyncQueue\(\)/)
  assert.match(responder, /savedResponse\?\.status === 'synced'/)
  assert.match(auth, /if \(!status\.connected\)/)
  assert.match(auth, /updateLocalCache\(user\.entityId, user\.id, user\.role\)/)
  assert.match(auth, /loadMapDataset\(user\)/)
  assert.match(auth, /Promise\.allSettled/)
})

test('solo se descargan formularios asignados al profesional', async () => {
  const sql = await read('supabase/migrations/202608100001_form_assignments.sql')
  const capture = await read('src/pages/professional/CapturePage.tsx')
  const responder = await read('src/pages/professional/FormResponderPage.tsx')
  assert.match(sql, /create table if not exists public\.form_assignments/)
  assert.match(sql, /assignment\.professional_id = auth\.uid\(\)/)
  assert.match(sql, /validate_form_assignment/)
  assert.match(capture, /assignedFormIds\.has\(form\.\$id\)/)
  assert.match(responder, /Este formulario no está asignado a tu perfil/)
})

test('los errores de sincronización permanecen visibles y las respuestas tienen bandeja', async () => {
  const sync = await read('src/lib/sync-engine.ts')
  const routes = await read('src/App.tsx')
  const responses = await read('src/pages/shared/FormResponsesPage.tsx')
  assert.match(sync, /lastError: message/)
  assert.match(sync, /store\.setStatus\(errors\.length > 0 \? 'error' : 'offline'\)/)
  assert.doesNotMatch(sync, /localStorage\.setItem\(`cg_forms_\$\{entityId\}`[^]*setSyncComplete/)
  assert.match(routes, /path="responses" element=\{<FormResponsesPage \/>\}/)
  assert.match(responses, /COLLECTION_IDS\.FORM_RESPONSES/)
  assert.match(responses, /createSignedUrl/)
})

test('la verificación integral crea y elimina una asignación temporal', async () => {
  const verify = await read('scripts/verify-supabase.mjs')
  assert.match(verify, /from\('form_assignments'\)\.insert/)
  assert.match(verify, /visibleForms\.length === 1/)
  assert.match(verify, /from\('form_assignments'\)\.delete/)
})

test('el sitio tiene páginas SEO indexables y embudos hacia WhatsApp', async () => {
  const pages = JSON.parse(await read('src/config/seo-pages.json'))
  const app = await read('src/App.tsx')
  const marketing = await read('src/lib/marketing.ts')
  const robots = await read('public/robots.txt')
  const sitemap = await read('public/sitemap.xml')
  const generator = await read('scripts/generate-seo-pages.mjs')

  for (const path of [
    '/',
    '/software-caracterizacion-social',
    '/encuestas-offline',
    '/levantamiento-informacion-campo',
    '/software-entidades-gobierno',
  ]) {
    assert.ok(pages.some(page => page.path === path), `Falta la página SEO ${path}`)
    assert.ok(sitemap.includes(`https://www.controlg.co${path}`), `Falta ${path} en sitemap.xml`)
  }

  assert.match(app, /<MarketingSeo \/>/)
  assert.match(marketing, /WHATSAPP_NUMBER = '573009010300'/)
  assert.match(marketing, /FAQPage/)
  assert.match(marketing, /WebApplication/)
  assert.match(robots, /Disallow: \/admin/)
  assert.match(generator, /data-seo-static/)
  assert.match(generator, /VITE_NATIVE_BUILD === 'true'/)
  assert.ok(pages.every(page => page.title.length <= 60), 'Los títulos SEO deben ser concisos')
  assert.ok(pages.every(page => page.description.length <= 165), 'Las descripciones SEO deben ser concisas')
  assert.ok(pages.every(page => page.faqs.length >= 4), 'Cada intención necesita preguntas frecuentes')
})

test('el blog SEO tiene contenido profesional, rutas estáticas y datos estructurados', async () => {
  const posts = JSON.parse(await read('src/config/blog-posts.json'))
  const app = await read('src/App.tsx')
  const seo = await read('src/components/marketing/MarketingSeo.tsx')
  const generator = await read('scripts/generate-seo-pages.mjs')
  const sitemap = await read('public/sitemap.xml')
  const index = await read('index.html')

  assert.ok(posts.length >= 15, 'El lanzamiento editorial debe incluir al menos 15 artículos')
  assert.equal(new Set(posts.map(post => post.slug)).size, posts.length, 'Los slugs deben ser únicos')
  assert.ok(posts.every(post => post.title.length <= 60), 'Los títulos editoriales deben ser concisos')
  assert.ok(posts.every(post => post.description.length <= 165), 'Las descripciones editoriales deben ser concisas')
  assert.ok(posts.every(post => post.sections.length >= 3), 'Cada artículo debe desarrollar la intención de búsqueda')
  assert.ok(posts.every(post => post.faqs.length >= 3), 'Cada artículo debe responder preguntas frecuentes')
  assert.ok(posts.filter(post => post.category === 'Comparativas').every(post => post.comparison.length >= 5 && post.sources.length >= 1), 'Las comparativas requieren tabla y fuentes')
  for (const post of posts) assert.ok(sitemap.includes(`https://www.controlg.co/blog/${post.slug}`), `Falta ${post.slug} en el sitemap`)

  assert.match(app, /path="\/blog"/)
  assert.match(app, /path="\/blog\/:slug"/)
  assert.match(seo, /buildBlogStructuredData/)
  assert.match(generator, /BlogPosting/)
  assert.match(generator, /rss\.xml/)
  assert.match(index, /google-site-verification/)
})

test('la navegación pública es coherente y el blog se administra desde Supabase', async () => {
  const header = await read('src/components/marketing/PublicHeader.tsx')
  const landing = await read('src/pages/landing/LandingPage.tsx')
  const solution = await read('src/pages/landing/SolutionPage.tsx')
  const blogIndex = await read('src/pages/blog/BlogIndexPage.tsx')
  const blogPost = await read('src/pages/blog/BlogPostPage.tsx')
  const login = await read('src/pages/auth/LoginPage.tsx')
  const app = await read('src/App.tsx')
  const sidebar = await read('src/components/layout/Sidebar.tsx')
  const migration = await read('supabase/migrations/202608240001_blog_cms.sql')
  const generator = await read('scripts/generate-seo-pages.mjs')

  assert.match(header, /Plataforma/)
  assert.match(header, /Caracterización/)
  assert.match(header, /Encuestas offline/)
  assert.match(header, /Iniciar sesión/)
  for (const source of [landing, solution, blogIndex, blogPost, login]) assert.match(source, /<PublicHeader/)
  assert.equal((landing.match(/Blog profesional/g) || []).length, 0, 'La cabecera no debe duplicar enlaces del blog')
  assert.match(blogIndex, /blogCover\(post\)/)
  assert.match(blogPost, /blogCover\(post\)/)
  assert.match(generator, /absoluteBlogCover/)
  assert.match(app, /path="blog\/new"/)
  assert.match(app, /path="blog\/edit\/:id"/)
  assert.match(sidebar, /Blog y SEO/)
  assert.match(migration, /create table if not exists public\.blog_posts/)
  assert.match(migration, /blog_posts_public_read/)
  assert.match(migration, /blog_posts_admin_write/)
  assert.match(migration, /blog-images/)

  for (const image of ['comparativas-software-campo.jpg', 'encuestas-offline-rural.jpg', 'gestion-publica-territorial.jpg', 'evidencia-gps-campo.jpg']) {
    const info = await stat(new URL(`public/blog/${image}`, root))
    assert.ok(info.size > 100_000 && info.size < 500_000, `La portada ${image} debe estar optimizada`)
  }
})

test('la creación de usuarios se protege dentro de Supabase', async () => {
  const sql = await read('supabase/migrations/202608070001_initial_control_g.sql')
  const backend = await read('src/lib/backend.ts')
  assert.match(sql, /function public\.admin_create_user/)
  assert.match(sql, /caller_role not in \('admin', 'coordinator'\)/)
  assert.match(sql, /grant execute on function public\.admin_create_user/)
  assert.match(backend, /supabase\.rpc\('admin_create_user'/)
  assert.doesNotMatch(backend, /functions\.invoke\('admin-create-user'/)
})

test('el módulo GIS interno usa PostGIS, RLS y capas territoriales por entidad', async () => {
  const sql = await read('supabase/migrations/202608310001_latam_gis.sql')
  const backend = await read('src/lib/backend.ts')
  assert.match(sql, /create extension if not exists postgis/)
  assert.match(sql, /generated always as/)
  assert.match(sql, /using gist\(location\)/)
  assert.match(sql, /create table if not exists public\.map_layers/)
  assert.match(sql, /alter table public\.map_layers enable row level security/)
  assert.match(sql, /entity_id = public\.current_entity_id\(\)/)
  assert.match(sql, /country_code text not null default 'CO'/)
  assert.match(backend, /MAP_LAYERS:\s+'map_layers'/)
})

test('el mapa operativo está integrado para todos los roles y funciona desde caché', async () => {
  const routes = await read('src/App.tsx')
  const sidebar = await read('src/components/layout/Sidebar.tsx')
  const home = await read('src/pages/professional/HomePage.tsx')
  const page = await read('src/pages/shared/OperationalMapPage.tsx')
  const map = await read('src/components/gis/InternalMap.tsx')
  const service = await read('src/lib/gis-service.ts')
  const database = await read('src/lib/dexie-db.ts')

  for (const route of ['admin/map', 'coord/map', 'apoyo/map', 'field/map']) {
    const path = route.split('/')[1]
    assert.match(routes, new RegExp(`path="${path}" element=\\{<OperationalMapPage \\/>\\}`))
  }
  assert.match(sidebar, /Mapa territorial/)
  assert.match(home, /Mapa de mis capturas/)
  assert.match(map, /Mapa vectorial offline/)
  assert.match(page, /createMapLayer/)
  assert.match(map, /<svg/)
  assert.doesNotMatch(map, /google\.com\/maps|maps\.googleapis/)
  assert.match(page, /Colorear por variable/)
  assert.match(page, /GisInteroperabilityDialog/)
  assert.match(service, /cachedDataset/)
  assert.match(service, /localResponses/)
  assert.match(service, /mergeRecords/)
  assert.match(database, /this\.version\(5\)/)
  assert.match(database, /geoRecords/)
  assert.match(database, /mapLayers/)
})

test('GIS LATAM incluye mapa base offline e interoperabilidad ArcGIS', async () => {
  const baseMap = JSON.parse(await read('src/assets/latam-countries.json'))
  const service = await read('src/lib/gis-service.ts')
  const interop = await read('src/lib/gis-interop.ts')
  const vercel = await read('vercel.json')

  assert.equal(baseMap.type, 'FeatureCollection')
  assert.equal(baseMap.features.length, 20)
  assert.ok(baseMap.features.some(feature => feature.properties.country_code === 'CO'))
  assert.ok(baseMap.features.some(feature => feature.properties.country_code === 'GT'))
  assert.match(service, /Natural Earth 1:110m/)
  assert.match(service, /reportableDimensions/)
  assert.match(interop, /recordsToGeoJson/)
  assert.match(interop, /downloadWgs84Csv/)
  assert.match(interop, /buildPointShapefileArchive/)
  assert.match(interop, /fetchArcGisLayer/)
  assert.match(interop, /publishRecordsToArcGis/)
  assert.match(vercel, /https:\/\/\*\.arcgis\.com/)
  assert.match(vercel, /Content-Security-Policy/)
})

test('el constructor ofrece plantillas LATAM reutilizables sin reemplazar los formularios de Bolívar', async () => {
  const templates = await read('src/config/form-templates.ts')
  const builder = await read('src/pages/coordinator/FormBuilderPage.tsx')

  for (const id of [
    'demografica-socioeconomica',
    'discapacidad-cuidados',
    'etnica-comunitaria',
    'productiva-emprendimientos',
    'territorial-riesgo-servicios',
    'rural-agropecuaria',
    'cultura-deporte-turismo',
  ]) assert.match(templates, new RegExp(`id: '${id}'`))

  assert.match(templates, /Coordenada GPS de la visita/)
  assert.match(templates, /Firma o constancia de consentimiento/)
  assert.match(builder, /Biblioteca de caracterizaciones/)
  assert.match(builder, /cloneTemplatePages/)
})

async function filesUnder(path) {
  const ignored = new Set(['.git', 'node_modules', 'dist', 'tmp', '.env.local', 'android'])
  const absolute = new URL(path, root)
  const info = await stat(absolute)
  if (info.isFile()) return [absolute]
  const files = []
  for (const name of await readdir(absolute)) {
    if (ignored.has(name)) continue
    files.push(...await filesUnder(join(path, name)))
  }
  return files
}

test('ninguna credencial administrativa quedó incorporada al código', async () => {
  const files = await filesUnder('./')
  for (const file of files) {
    const content = await readFile(file, 'utf8').catch(() => '')
    assert.doesNotMatch(content, /POSTGRES_PASSWORD\s*=\s*[^\s]+/)
    assert.doesNotMatch(content, /SERVICE_ROLE_KEY\s*=\s*eyJ/)
    assert.doesNotMatch(content, /DASHBOARD_PASSWORD\s*=\s*[^\s]+/)
  }
})
