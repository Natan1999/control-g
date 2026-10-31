import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function load(path) {
  const code = ts.transpileModule(await readFile(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
}
const organization = await load('src/lib/organization-profile.ts')
const templates = await load('src/config/form-templates.ts')
const runtime = await load('src/lib/form-runtime.ts')

test('las organizaciones heredadas conservan familias; las empresas no se convierten en alcaldías', () => {
  for (const value of [undefined, null, [], 'invalid', { entity_kind: 'unknown' }]) {
    assert.equal(organization.getOrganizationProfile(value).unit, 'family')
  }
  const company = organization.getOrganizationProfile({ entity_kind: 'private_company', organization_sector: 'fuels' })
  assert.equal(company.unit, 'establishment')
  assert.equal(company.sector, 'fuels')
  assert.equal(company.coverageMode, 'operational_zones')
  assert.equal(organization.getOrganizationProfile({ entity_kind: 'public_entity' }).unit, 'record')
  assert.equal(organization.getOrganizationProfile({ entity_kind: 'ngo', capture_unit: 'asset' }).unit, 'asset')
})

test('la configuración empresarial rechaza enumeraciones desconocidas', () => {
  const valid = { entity_kind: 'private_company', organization_sector: 'fuels', capture_unit: 'establishment', coverage_mode: 'operational_zones' }
  assert.equal(organization.validateOrganizationSettings(valid), null)
  for (const key of Object.keys(valid)) assert.equal(typeof organization.validateOrganizationSettings({ ...valid, [key]: 'invalid' }), 'string')
})

test('el paquete offline guarda país y perfil operativo, sin secretos o datos de usuarios', () => {
  const value = organization.organizationCacheValue({ name:'Empresa demo', country_code:'GT', department:'Nacional', regional_settings:{ entity_kind:'private_company', organization_sector:'fuels', secret:'private-canary' }, password:'private-canary', users:['private-canary'] })
  assert.equal(value.countryCode, 'GT')
  assert.equal(value.settings.capture_unit, 'establishment')
  assert.equal(value.version, 1)
  assert.equal(JSON.stringify(value).includes('private-canary'), false)
})

test('las zonas comerciales admiten alcance nacional sin inventar códigos oficiales', () => {
  const zones = organization.parseOperationalZones('Región Caribe; Región Andina\n región caribe ; Ciudad, Distrito centro;\n')
  assert.deepEqual(zones, [{ id: '', name: 'Región Caribe' }, { id: '', name: 'Región Andina' }, { id: '', name: 'Ciudad, Distrito centro' }])
  assert.equal(organization.validateOperationTerritories(zones), null)
  for (const invalid of [[], [{ name: ' ' }], [{ name: 'a'.repeat(161) }], [{ name: 'a\u0000b' }], [{ name: 'Andina' }, { name: 'andina' }], Array.from({length:501}, (_, i) => ({ name: `Zona ${i}` }))]) {
    assert.equal(typeof organization.validateOperationTerritories(invalid), 'string')
  }
})

test('los tres instrumentos nuevos son editables y permiten terminar sin GPS ni fotografías', () => {
  const ids = ['necesidades-comerciales', 'visita-comercial', 'servicios-publicos-territorial']
  for (const id of ids) {
    const template = templates.FORM_TEMPLATES.find(item => item.id === id)
    assert.ok(template)
    const fields = template.pages.flatMap(page => page.fields)
    assert.equal(new Set(fields.map(field => field.id)).size, fields.length)
    assert.ok(fields.some(field => field.type === 'gps'))
    assert.ok(fields.filter(field => ['gps','photo','signature','phone','email'].includes(field.type)).every(field => !field.required))
    assert.ok(fields.every(field => field.id && field.label))
    for (const field of fields.filter(field => field.options)) assert.equal(new Set(field.options.map(option => option.value)).size, field.options.length)
    const copy = templates.cloneTemplatePages(template)
    copy[0].fields[0].label = 'Modificado por el coordinador'
    assert.notEqual(template.pages[0].fields[0].label, copy[0].fields[0].label)
  }
  const volume = templates.FORM_TEMPLATES[0].pages.flatMap(page => page.fields).find(field => field.id === 'com_monthly_volume')
  assert.ok(runtime.validateFieldValue(volume, -1))
  assert.equal(runtime.validateFieldValue(volume, 0), null)
})

test('la creación guarda perfil, sector, cobertura y unidad sin modificar la demo municipal', async () => {
  const source = await readFile('src/pages/admin/EntitiesPage.tsx', 'utf8')
  assert.match(source, /entity_kind: form\.entity_kind/)
  assert.match(source, /capture_unit: form\.capture_unit, coverage_mode: form\.coverage_mode/)
  assert.match(source, /validateOperationTerritories\(territories\)/)
  assert.match(source, /disabled=\{demoMode\}/)
  assert.match(source, /buildMunicipalProvisionBundle\(center\)/)
})

test('empresas usan captura directa y analítica; no se renombran familias como clientes', async () => {
  const home = await readFile('src/pages/professional/HomePage.tsx', 'utf8')
  const company = await readFile('src/components/shared/ProfessionalOperationsHome.tsx', 'utf8')
  const coordinator = await readFile('src/pages/coordinator/DashboardPage.tsx', 'utf8')
  assert.match(home, /operation\.unit === 'family'/)
  assert.match(coordinator, /operation\.unit !== 'family'/)
  assert.match(coordinator, /<AnalyticsPage \/>/)
  assert.match(company, /item\.entityId === user\?\.entityId && item\.professionalId === user\?\.id/)
  assert.match(company, /to="\/field\/capture"/)
  assert.doesNotMatch(company, /COLLECTION_IDS\.FAMILIES|first_name|familyId/)
})

test('el constructor usa país y moneda reales para coordinación y superadministración', async () => {
  const builder = await readFile('src/pages/coordinator/FormBuilderPage.tsx', 'utf8')
  assert.match(builder, /builderUserRole === 'admin' \|\| builderUserEntityId/)
  assert.match(builder, /countryCode: String\(entity\.country_code/)
  assert.match(builder, /currencyCode: String\(entity\.currency_code/)
  assert.match(builder, /regionalSettings: entity\.regional_settings/)
})

test('el panel de superadministración no inventa crecimiento y las firmas permanecen privadas', async () => {
  const dashboard = await readFile('src/pages/admin/DashboardPage.tsx', 'utf8')
  assert.doesNotMatch(dashboard, /\+12%|Crecimiento/)
  assert.match(dashboard, /COLLECTION_IDS\.USER_PROFILES/)
  assert.match(dashboard, /publishedForms: forms\?\.total/)
  const ignore = await readFile('.gitignore', 'utf8')
  assert.match(ignore, /\.android-signing\//)
  assert.match(ignore, /\*\.aab/)
  const keyScript = await readFile('scripts/create-android-upload-key.mjs', 'utf8')
  assert.match(keyScript, /if \(existsSync\(directory\)\) throw/)
  assert.match(keyScript, /-storepass:env/)
  assert.doesNotMatch(keyScript, /console\.log\(password/)
})

test('Android 2.19 actualiza API36 y nunca firma producción con clave de debug', async () => {
  const variables = await readFile('android/variables.gradle', 'utf8')
  const gradle = await readFile('android/app/build.gradle', 'utf8')
  const manifest = await readFile('android/app/src/main/AndroidManifest.xml', 'utf8')
  const builder = await readFile('scripts/build-apk.sh', 'utf8')
  const pkg = JSON.parse(await readFile('package.json', 'utf8'))
  const activity = await readFile('android/app/src/main/java/com/drandigital/controlg/MainActivity.java', 'utf8')
  assert.match(variables, /targetSdkVersion = 36/)
  assert.match(gradle, new RegExp(`versionName "${pkg.version.replaceAll('.', '\\.')}"`))
  assert.match(gradle, /!releaseSigningReady/)
  assert.doesNotMatch(gradle, /signingConfig signingConfigs\.debug/)
  assert.doesNotMatch(manifest, /READ_MEDIA_IMAGES|READ_MEDIA_VIDEO|READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE/)
  assert.match(builder, /bundleRelease/)
  assert.match(builder, /CONTROL_G_ANDROID_KEYSTORE/)
  assert.match(activity, /WindowInsetsCompat\.Type\.systemBars\(\) \| WindowInsetsCompat\.Type\.displayCutout\(\)/)
  assert.match(activity, /Math\.max\(bars\.bottom, keyboard\.bottom\)/)
})
