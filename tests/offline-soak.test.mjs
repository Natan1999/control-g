import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import Dexie from 'dexie'
import { IDBKeyRange, indexedDB } from 'fake-indexeddb'
import ts from 'typescript'

async function loadApplicationDatabase() {
  Dexie.dependencies.indexedDB = indexedDB
  Dexie.dependencies.IDBKeyRange = IDBKeyRange
  globalThis.__CONTROL_G_TEST_DEXIE__ = Dexie
  const source = await readFile('src/lib/dexie-db.ts', 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/import Dexie(?:, \{[^}]+\})? from ['"]dexie['"];?/, 'const Dexie = globalThis.__CONTROL_G_TEST_DEXIE__')
  return import(`data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`)
}

test('IndexedDB conserva una jornada extensa tras cierre forzado y permite reanudar sincronización', async () => {
  const { localDB } = await loadApplicationDatabase()
  await localDB.delete()
  await localDB.open()

  const responseCount = 750
  const evidenceCount = 1_500
  const now = Date.now()
  const responses = Array.from({ length: responseCount }, (_, index) => ({
    localId: `offline-response-${index}`,
    formId: `form-${index % 5}`,
    familyId: null,
    entityId: 'soak-entity',
    professionalId: `professional-${index % 12}`,
    answers: { household: index, consent: true, _metadata: { capturedAt: new Date(now + index).toISOString(), offline: true } },
    status: 'completed',
    createdAt: now + index,
    updatedAt: now + index,
    retryCount: 0,
    formVersion: 3,
  }))
  const evidence = Array.from({ length: evidenceCount }, (_, index) => ({
    id: `offline-evidence-${index}`,
    activityLocalId: `offline-response-${index % responseCount}`,
    answerFieldId: `evidence-${index % 3}`,
    file: new Blob([new Uint8Array(2_048).fill(index % 251)], { type: 'image/jpeg' }),
    name: `evidence-${index}.jpg`,
    mimeType: 'image/jpeg',
    bucketId: 'field-photos',
    mediaType: 'photo',
    status: 'pending',
    retryCount: 0,
    entityId: 'soak-entity',
    professionalId: `professional-${index % 12}`,
    parentType: 'form_response',
    capturedAt: new Date(now + index).toISOString(),
  }))

  await localDB.transaction('rw', localDB.formResponses, localDB.mediaQueue, async () => {
    await localDB.formResponses.bulkPut(responses)
    await localDB.mediaQueue.bulkPut(evidence)
  })
  assert.equal(await localDB.formResponses.where('status').equals('completed').count(), responseCount)
  assert.equal(await localDB.mediaQueue.where('status').equals('pending').count(), evidenceCount)

  // Simula cierre forzado del APK: ninguna fila depende de memoria de React.
  localDB.close()
  await localDB.open()
  assert.equal(await localDB.formResponses.count(), responseCount)
  assert.equal(await localDB.mediaQueue.count(), evidenceCount)

  const firstWaveMedia = await localDB.mediaQueue.where('status').equals('pending').limit(1_000).toArray()
  await localDB.mediaQueue.bulkPut(firstWaveMedia.map(item => ({ ...item, status: 'uploaded', remotePath: `remote/${item.id}` })))
  assert.equal(await localDB.mediaQueue.where('status').equals('uploaded').count(), 1_000)
  assert.equal(await localDB.mediaQueue.where('status').equals('pending').count(), 500)

  const readyResponses = []
  for (const response of responses) {
    const unresolved = await localDB.mediaQueue.where('activityLocalId').equals(response.localId).filter(item => item.status !== 'uploaded').count()
    if (unresolved === 0) readyResponses.push(response.localId)
  }
  const releasedResponses = await localDB.formResponses.bulkGet(readyResponses)
  await localDB.formResponses.bulkPut(releasedResponses.filter(Boolean).map(response => ({ ...response, status: 'synced', updatedAt: Date.now() })))
  assert.ok(readyResponses.length > 0, 'La primera ola debe liberar respuestas cuyos medios ya subieron.')
  assert.equal(await localDB.formResponses.where('status').equals('synced').count(), readyResponses.length)
  assert.equal(await localDB.formResponses.where('status').equals('completed').count(), responseCount - readyResponses.length)

  await localDB.delete()
  delete globalThis.__CONTROL_G_TEST_DEXIE__
})

test('el ensayo de resistencia usa exactamente el esquema IndexedDB versionado de la aplicación', async () => {
  const source = await readFile('src/lib/dexie-db.ts', 'utf8')
  assert.match(source, /this\.version\(5\)/)
  assert.match(source, /formResponses: 'localId, formId, familyId, professionalId, status, createdAt'/)
  assert.match(source, /mediaQueue: 'id, activityLocalId, status, answerFieldId'/)
})
