import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationPath = 'supabase/migrations/202608310012_advanced_assignments_and_audio.sql'

test('las asignaciones avanzadas conservan auditoría y soportan operación territorial', async () => {
  const [sql, dialog, capture, responder, sync] = await Promise.all([
    readFile(migrationPath, 'utf8'),
    readFile('src/components/forms/FormAssignmentDialog.tsx', 'utf8'),
    readFile('src/pages/professional/CapturePage.tsx', 'utf8'),
    readFile('src/pages/professional/FormResponderPage.tsx', 'utf8'),
    readFile('src/lib/sync-engine.ts', 'utf8'),
  ])
  for (const column of ['priority', 'quota', 'completed_count', 'territory_id', 'group_code', 'instructions']) {
    assert.match(sql, new RegExp(`add column if not exists ${column}`))
  }
  assert.match(sql, /increment_form_assignment_completed_count/)
  assert.match(sql, /assignment\.starts_at <= form_responses\.captured_at/)
  assert.match(sql, /Quotas are operational targets/i)
  assert.match(dialog, /status: 'inactive'/)
  assert.doesNotMatch(dialog, /deleteDocument/)
  assert.match(dialog, /COLLECTION_IDS\.PROFESSIONAL_ASSIGNMENTS/)
  assert.match(dialog, /territory_id/)
  assert.match(dialog, /group_code/)
  assert.match(capture, /completed_count/)
  assert.match(capture, /PRIORITY_LABELS/)
  assert.match(responder, /La cuota asignada/)
  assert.match(sync, /assignments\.filter\(assignmentIsCurrent\)/)
})

test('el audio usa bucket privado y cola offline dedicada', async () => {
  const [sql, backend, dexie, audioField, manifest, capacitorChrome] = await Promise.all([
    readFile(migrationPath, 'utf8'),
    readFile('src/lib/backend.ts', 'utf8'),
    readFile('src/lib/dexie-db.ts', 'utf8'),
    readFile('src/components/forms/fields/AudioField.tsx', 'utf8'),
    readFile('android/app/src/main/AndroidManifest.xml', 'utf8'),
    readFile('node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/BridgeWebChromeClient.java', 'utf8'),
  ])
  assert.match(sql, /'field-audio'/)
  assert.match(sql, /false,\s*26214400/)
  assert.match(sql, /audio\/webm/)
  assert.match(backend, /FIELD_AUDIO:\s+'field-audio'/)
  assert.match(dexie, /'audio'/)
  assert.match(audioField, /getUserMedia\(\{ audio: true \}\)/)
  assert.match(audioField, /URL\.createObjectURL/)
  assert.match(manifest, /android\.permission\.RECORD_AUDIO/)
  assert.match(manifest, /android\.permission\.MODIFY_AUDIO_SETTINGS/)
  assert.match(capacitorChrome, /android\.webkit\.resource\.AUDIO_CAPTURE/)
  assert.match(capacitorChrome, /Manifest\.permission\.MODIFY_AUDIO_SETTINGS/)
})
