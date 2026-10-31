import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import test from 'node:test'
import Dexie from 'dexie'
import { indexedDB, IDBKeyRange } from 'fake-indexeddb'
import ts from 'typescript'

async function moduleAt(path, replacements = []) {
  let js = ts.transpileModule(await readFile(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText
  for (const [pattern, value] of replacements) js = js.replace(pattern, value)
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
}

// Runs the real IndexedDB schema, atomic save and sync engine. Only the remote
// network/storage adapters are substituted; this is not a physical-device test.
test('captura offline con foto y firma sobrevive reinicio, reintenta y llega una sola vez a coordinación', async () => {
  Dexie.dependencies.indexedDB = indexedDB; Dexie.dependencies.IDBKeyRange = IDBKeyRange
  globalThis.__syncDexie = Dexie
  const { localDB } = await moduleAt('src/lib/dexie-db.ts', [[/import Dexie(?:, \{[^}]+\})? from ['"]dexie['"];?/, 'const Dexie = globalThis.__syncDexie']])
  const { saveCompletedCapture } = await moduleAt('src/lib/save-capture.ts')
  await localDB.delete(); await localDB.open()
  const values = new Map()
  const originalLocalStorage = globalThis.localStorage
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
  class BackendError extends Error { constructor(code) { super(String(code)); this.code = code } }
  const tables = new Map(); const uploads = new Map(); const events = []
  let online = false, photoFails = true, acknowledgementLost = true, sequence = 0
  const store = { pendingCount: 0, status: 'offline', setStatus(value) { this.status = value }, setPendingCount(value) { this.pendingCount = value }, setSyncComplete() { this.status = 'synced'; this.pendingCount = 0 } }
  globalThis.__syncHarness = {
    localDB, BackendError,
    organizationCacheValue: (await moduleAt('src/lib/organization-profile.ts')).organizationCacheValue,
    Network: {}, useSyncStore: { getState: () => store }, isOnline: async () => online,
    DATABASE_ID: 'test', COLLECTION_IDS: { FORM_RESPONSES: 'responses', EVIDENCE_FILES: 'evidence', ACTIVITIES: 'activities' },
    BUCKET_IDS: { FIELD_PHOTOS: 'photos', SIGNATURES: 'signatures', FIELD_AUDIO: 'audio', EXPORTS: 'exports' },
    ID: { unique: () => `id-${++sequence}` }, Query: {},
    sha256Blob: async blob => createHash('sha256').update(Buffer.from(await blob.arrayBuffer())).digest('hex'),
    storage: { createFile: async (bucket, id, file) => {
      assert.equal(online, true); events.push(`upload:${id}`)
      if (photoFails && id === 'photo') { photoFails = false; throw new BackendError(503) }
      uploads.set(id, { bucket, bytes: await file.text() })
      return { $id: `tenant/professional/${id}` }
    } },
    databases: { createDocument: async (_database, collection, id, payload) => {
      assert.equal(online, true); events.push(`write:${collection}`)
      const table = tables.get(collection) || new Map(); tables.set(collection, table)
      const key = payload.local_id || id
      if (table.has(key)) throw new BackendError('23505')
      table.set(key, { ...payload, $id: id })
      if (collection === 'responses' && acknowledgementLost) { acknowledgementLost = false; throw new BackendError(503) }
      return table.get(key)
    } },
  }
  const sync = await moduleAt('src/lib/sync-engine.ts', [
    [/import \{ Network \} from ['"]@capacitor\/network['"];?/, 'const { Network } = globalThis.__syncHarness'],
    [/import \{ useSyncStore \} from ['"]@\/stores\/syncStore['"];?/, 'const { useSyncStore } = globalThis.__syncHarness'],
    [/import \{[^}]+\} from ['"]\.\/backend['"];?/, 'const { databases, storage, DATABASE_ID, COLLECTION_IDS, BUCKET_IDS, ID, Query, BackendError } = globalThis.__syncHarness'],
    [/import \{ localDB \} from ['"]\.\/dexie-db['"];?/, 'const { localDB } = globalThis.__syncHarness'],
    [/import \{ isOnline \} from ['"]\.\/network['"];?/, 'const { isOnline } = globalThis.__syncHarness'],
    [/export \{ isOnline \} from ['"]\.\/network['"];?/, 'export { isOnline }'],
    [/import \{ sha256Blob \} from ['"]\.\/capture-integrity['"];?/, 'const { sha256Blob } = globalThis.__syncHarness'],
    [/import \{ organizationCacheValue \} from ['"]\.\/organization-profile['"];?/, 'const { organizationCacheValue } = globalThis.__syncHarness'],
  ])
  try {
    const now = Date.now()
    await saveCompletedCapture(localDB, {
      localId: 'visit', formId: 'assigned-commercial-form', entityId: 'tenant', professionalId: 'professional', familyId: null, municipalityId: 'commercial-zone',
      answers: { result: 'atendida', photo: { pendingMediaId: 'photo' }, signature: { pendingMediaId: 'signature' }, _metadata: { lat: null, lng: null, capturedAt: now } },
      status: 'completed', formVersion: 2, createdAt: now, updatedAt: now,
    }, ['photo','signature'].map(id => ({ id, activityLocalId: 'visit', answerFieldId: id, entityId: 'tenant', professionalId: 'professional', file: new Blob([`bytes:${id}`]), name: `${id}.png`, bucketId: id === 'photo' ? 'photos' : 'signatures', status: 'pending' })))
    localDB.close(); await localDB.open()
    const offline = await sync.processSyncQueue()
    assert.equal(offline.pendingCount, 3); assert.equal(events.length, 0)
    online = true
    await sync.processSyncQueue()
    assert.equal(tables.get('responses'), undefined, 'No enviar respuesta con evidencia pendiente')
    assert.equal((await localDB.formResponses.get('visit')).status, 'completed')
    await sync.processSyncQueue() // server commits, transport loses acknowledgement
    assert.equal(tables.get('responses').size, 1)
    assert.equal((await localDB.formResponses.get('visit')).status, 'completed')
    localDB.close(); await localDB.open()
    const a = sync.processSyncQueue(), b = sync.processSyncQueue()
    assert.equal(a, b, 'Dos acciones de sincronizar comparten la misma ejecución')
    assert.equal((await a).synced, true)
    assert.equal(tables.get('responses').size, 1, 'El reintento no duplica la visita')
    assert.equal((await localDB.formResponses.get('visit')).status, 'synced')
    assert.equal(uploads.size, 2)
    const received = [...tables.get('responses').values()][0]
    assert.equal(received.family_id, null); assert.equal(received.latitude, null); assert.equal(received.longitude, null)
    assert.equal(received.form_version, 2)
    assert.equal(received.municipality_id, 'commercial-zone', 'Conserva el territorio asignado para filtros e informes')
    assert.equal(received.answers.photo, 'tenant/professional/photo')
    assert.equal(received.answers.signature, 'tenant/professional/signature')
    assert.equal(JSON.parse(received.answers_json).result, 'atendida')
    assert.ok([...tables.get('evidence').values()].every(item => item.entity_id === 'tenant' && item.sha256.length === 64))
    const analytics = await moduleAt('src/lib/analytics.ts')
    const report = analytics.buildAnalyticsReport({ entityId: 'tenant', entityName: 'Empresa de prueba', forms: [], responses: [received], municipalities: [], filters: {}, minimumGroupSize: 1 })
    assert.equal(report.recordCount, 1, 'La misma fila recibida alimenta la analítica')
  } finally {
    await localDB.delete()
    if (originalLocalStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = originalLocalStorage
    delete globalThis.__syncHarness; delete globalThis.__syncDexie
  }
})
