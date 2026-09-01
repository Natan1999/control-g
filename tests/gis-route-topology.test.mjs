import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function importTypeScriptModule(path) {
  const source = await readFile(path, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`)
}

const route = await importTypeScriptModule('src/lib/field-route.ts')
const geo = await importTypeScriptModule('src/lib/geo.ts')

const record = (id, latitude, longitude) => ({
  id,
  entityId: 'entity',
  source: 'response',
  status: 'pending',
  latitude,
  longitude,
  capturedAt: '2026-08-31T00:00:00.000Z',
  label: id,
  isPending: false,
})

test('la ruta de campo empieza por la visita más cercana y funciona sin servicios externos', () => {
  const plan = route.planFieldRoute([
    record('lejos', 10.10, -75),
    record('cerca', 10.01, -75),
    record('medio', 10.05, -75),
  ], { latitude: 10, longitude: -75, label: 'Origen' }, 25)

  assert.deepEqual(plan.stops.map(stop => stop.record.id), ['cerca', 'medio', 'lejos'])
  assert.equal(plan.coordinates.length, 4)
  assert.ok(plan.totalDistanceMeters > 10_000)
  assert.ok(plan.totalDistanceMeters <= plan.baselineDistanceMeters)
})

test('la ruta limita carga, elimina duplicados y descarta coordenadas imposibles', () => {
  const plan = route.planFieldRoute([
    record('a', 10, -75),
    record('a', 10.01, -75),
    record('invalido', 200, -75),
    record('b', 10.02, -75),
    record('c', 10.03, -75),
  ], null, 2)
  assert.deepEqual(plan.stops.map(stop => stop.record.id), ['a', 'b'])
  assert.equal(plan.truncated, true)
  assert.match(route.formatRouteDistance(1_500), /1\.5 km/)
})

test('la inspección topológica acepta polígonos WGS84 cerrados', () => {
  const report = geo.analyzeGeoJsonTopology({
    type: 'Polygon',
    coordinates: [[[-75, 10], [-74.9, 10], [-74.9, 10.1], [-75, 10.1], [-75, 10]]],
  })
  assert.equal(report.valid, true)
  assert.equal(report.geometryCount, 1)
  assert.equal(report.vertexCount, 5)
})

test('la inspección topológica bloquea anillos abiertos y autointersecciones', () => {
  const open = geo.analyzeGeoJsonTopology({
    type: 'Polygon',
    coordinates: [[[-75, 10], [-74.9, 10], [-74.9, 10.1], [-75, 10.1]]],
  })
  const crossed = geo.analyzeGeoJsonTopology({
    type: 'Polygon',
    coordinates: [[[-75, 10], [-74.9, 10.1], [-75, 10.1], [-74.9, 10], [-75, 10]]],
  })
  assert.equal(open.valid, false)
  assert.ok(open.issues.some(issue => issue.code === 'RING_NOT_CLOSED'))
  assert.equal(crossed.valid, false)
  assert.ok(crossed.issues.some(issue => issue.code === 'RING_SELF_INTERSECTION'))
  assert.throws(() => geo.assertValidGeoJsonTopology(crossed), /Topología inválida/)
})

test('la inspección topológica detecta huecos fuera del polígono', () => {
  const report = geo.analyzeGeoJsonTopology({
    type: 'Polygon',
    coordinates: [
      [[-75, 10], [-74.8, 10], [-74.8, 10.2], [-75, 10.2], [-75, 10]],
      [[-76, 11], [-75.9, 11], [-75.9, 11.1], [-76, 11.1], [-76, 11]],
    ],
  })
  assert.equal(report.valid, false)
  assert.ok(report.issues.some(issue => issue.code === 'HOLE_OUTSIDE_POLYGON'))
})

test('el mapa integra la ruta offline y la web autoriza audio del mismo origen', async () => {
  const [page, map, vercel] = await Promise.all([
    readFile('src/pages/shared/OperationalMapPage.tsx', 'utf8'),
    readFile('src/components/gis/InternalMap.tsx', 'utf8'),
    readFile('vercel.json', 'utf8'),
  ])
  assert.match(page, /planFieldRoute/)
  assert.match(page, /Planear ruta offline/)
  assert.match(page, /assertValidGeoJsonTopology/)
  assert.match(map, /Ruta de campo con/)
  assert.match(vercel, /microphone=\(self\)/)
  assert.doesNotMatch(vercel, /microphone=\(\)/)
})
