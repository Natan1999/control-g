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
  assert.match(source, /Capacitor\.isNativePlatform\(\)/)
  assert.match(source, /\? <Navigate to="\/login" replace \/>/)
  assert.match(source, /: <LandingPage \/>/)
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
  assert.match(auth, /await updateLocalCache\(user\.entityId, user\.id, user\.role\)/)
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

test('la creación de usuarios se protege dentro de Supabase', async () => {
  const sql = await read('supabase/migrations/202608070001_initial_control_g.sql')
  const backend = await read('src/lib/backend.ts')
  assert.match(sql, /function public\.admin_create_user/)
  assert.match(sql, /caller_role not in \('admin', 'coordinator'\)/)
  assert.match(sql, /grant execute on function public\.admin_create_user/)
  assert.match(backend, /supabase\.rpc\('admin_create_user'/)
  assert.doesNotMatch(backend, /functions\.invoke\('admin-create-user'/)
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
