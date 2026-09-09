import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'
import Dexie from 'dexie'
import { indexedDB, IDBKeyRange } from 'fake-indexeddb'

async function moduleAt(path, replacements = []) {
  let js = ts.transpileModule(await readFile(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText
  for (const [pattern, replacement] of replacements) js = js.replace(pattern, replacement)
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
}
const demo = await moduleAt('src/lib/municipal-demo.ts')
const viewport = await moduleAt('src/lib/map-viewport.ts')
const { saveCompletedCapture } = await moduleAt('src/lib/save-capture.ts')

test('demo reproducible, aislada y con formularios asignados por profesional', () => {
  const a = demo.buildMunicipalDemo(), b = demo.buildMunicipalDemo()
  assert.deepEqual(a, b)
  assert.equal(a.records.length, 240)
  assert.equal(a.layers.length, 3)
  assert.equal(demo.DEMO_TEAM.filter(user => user.role === 'professional').length, 3)
  for (const record of a.records) {
    assert.equal(record.entityId, demo.DEMO_ENTITY_ID)
    assert.ok(demo.demoAssignedForms(record.professionalId).some(form => form.id === record.formId))
    assert.ok(Number.isFinite(record.latitude) && Number.isFinite(record.longitude))
  }
  assert.equal(demo.demoAssignedForms('unknown').length, 0)
  for (const form of demo.DEMO_FORMS) assert.ok(form.pages[0].fields.some(field => field.type === 'gps' && !field.required))
})

test('Mercator encuadra datos municipales en escritorio y móvil sin distorsionar ejes', () => {
  const points = demo.buildMunicipalDemo().records.map(record => [record.longitude, record.latitude])
  for (const [width, height] of [[1280, 720], [360, 620]]) {
    const projection = viewport.fitMap(points, width, height)
    assert.ok(projection.metersPerPixel > 0)
    for (const point of points) {
      const [x, y] = projection.point(point)
      assert.ok(x >= 0 && x <= width && y >= 0 && y <= height)
    }
    const center = viewport.fitMap([[-75, 10]], width, height).point([-75, 10])
    assert.deepEqual(center, [width / 2, height / 2])
  }
  assert.equal(viewport.fitMap([[NaN, 0], [200, 0]], 500, 500), null)
  assert.ok(viewport.mercator([0, 90]).every(Number.isFinite))
})

test('captura y foto se guardan atómicamente y sobreviven al cierre; falla sin dejar huérfanos', async () => {
  Dexie.dependencies.indexedDB = indexedDB
  Dexie.dependencies.IDBKeyRange = IDBKeyRange
  const db = new Dexie('atomic-capture-test')
  db.version(1).stores({ formResponses: 'localId', mediaQueue: 'id' })
  db.formResponses = db.table('formResponses'); db.mediaQueue = db.table('mediaQueue')
  const response = { localId: 'record', entityId: 'tenant', professionalId: 'field', formId: 'form', familyId: null, answers: { photo: { pendingMediaId: 'photo' } }, status: 'completed', createdAt: 1, updatedAt: 1 }
  const media = [{ id: 'photo', activityLocalId: 'record', entityId: 'tenant', professionalId: 'field', file: new Blob(['evidence']), status: 'pending' }]
  await saveCompletedCapture(db, response, media)
  db.close(); await db.open()
  assert.equal((await db.formResponses.get('record')).answers.photo.pendingMediaId, 'photo')
  assert.equal(await (await db.mediaQueue.get('photo')).file.text(), 'evidence')
  await assert.rejects(saveCompletedCapture(db, { ...response, localId: 'wrong' }, media))
  // Structured clone failure occurs after bulkPut; the media write must roll back.
  await assert.rejects(saveCompletedCapture(db, { ...response, localId: 'failed', answers: { invalid: () => {} } }, [{ ...media[0], id: 'failed-photo', activityLocalId: 'failed' }]))
  assert.equal(await db.mediaQueue.get('failed-photo'), undefined)
  assert.equal(await db.formResponses.count(), 1)
  await db.delete()
})

test('omitir GPS no invoca el dispositivo y conserva coordenadas nulas', async () => {
  const integrity = await moduleAt('src/lib/capture-integrity.ts', [
    [/import \{ Capacitor \} from ['"]@capacitor\/core['"];?/, 'const Capacitor = { isNativePlatform: () => true }'],
    [/import \{ Geolocation \} from ['"]@capacitor\/geolocation['"];?/, 'const Geolocation = { getCurrentPosition: () => { throw new Error("unexpected GPS call") } }'],
  ])
  const result = await integrity.captureGeoMetadata(50, false)
  assert.equal(result.latitude, null)
  assert.equal(result.longitude, null)
  assert.match(result.qualityNotes, /omitida/)
})

test('paquete ArcGIS conserva puntos, líneas y polígonos sin atributos personales', async () => {
  globalThis.__demoGeo = await moduleAt('src/lib/geo.ts')
  globalThis.__demoZip = await moduleAt('src/lib/zip.ts')
  const interop = await moduleAt('src/lib/gis-interop.ts', [
    [/import \{[^}]+\} from ['"]@\/lib\/geo['"];?/, 'const { parseGeoJson, geoJsonFeatures } = globalThis.__demoGeo'],
    [/import \{[^}]+\} from ['"]@\/lib\/zip['"];?/, 'const { concatBytes, utf8, zipStored } = globalThis.__demoZip'],
  ])
  const data = demo.buildMunicipalDemo()
  data.layers[0].geojson.features[0].properties.secret = 'private-canary'
  const bytes = interop.buildTerritorialArchive(data.records, data.layers)
  const view = new DataView(bytes.buffer)
  const files = new Map()
  for (let cursor = 0; view.getUint32(cursor, true) === 0x04034b50;) {
    const length = view.getUint32(cursor + 18, true), nameLength = view.getUint16(cursor + 26, true), extraLength = view.getUint16(cursor + 28, true)
    const name = new TextDecoder().decode(bytes.slice(cursor + 30, cursor + 30 + nameLength))
    const start = cursor + 30 + nameLength + extraLength
    files.set(name, new TextDecoder().decode(bytes.slice(start, start + length)))
    cursor = start + length
  }
  assert.equal(files.size, 5)
  assert.equal(JSON.parse(files.get('capturas.geojson')).features.length, 240)
  assert.deepEqual(JSON.parse(files.get('capturas.geojson')).features[0].geometry.coordinates, [data.records[0].longitude, data.records[0].latitude])
  assert.match(files.get('LEEME.txt'), /EPSG:4326/)
  assert.ok(![...files.values()].join('').includes('private-canary'))
  const geometryTypes = [...files.entries()].filter(([name]) => name.startsWith('capas/')).flatMap(([, text]) => JSON.parse(text).features.map(feature => feature.geometry.type))
  assert.deepEqual([...new Set(geometryTypes)].sort(), ['LineString', 'Point', 'Polygon'])
  const coverage = await moduleAt('src/lib/coverage.ts', [[/import \{[^}]+\} from ['"]@\/lib\/geo['"];?/, 'const { geoJsonFeatures, pointInGeoJsonGeometry } = globalThis.__demoGeo']])
  const summary = coverage.calculateCoverageSummary(data.records, [...data.layers, { ...data.layers[0], id: 'base:CO' }], 5, 35)
  assert.equal(summary.totalZones, 6)
})
