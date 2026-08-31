import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import {
  attachmentFilename,
  evidencePolicyError,
  groupAuthorizedEvidence,
  MAX_ATTACHMENTS_PER_FEATURE,
  verifyEvidenceBlob,
} from '../api/arcgis/attachments.mjs'

const ENTITY_ID = 'gov-bolivar-2026'
const JPEG_CONTENT = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from('foto-control-g')])

function evidence(overrides = {}) {
  return {
    id: 'evidence-1',
    entity_id: ENTITY_ID,
    parent_type: 'form_response',
    parent_local_id: 'local-response-1',
    bucket_id: 'field-photos',
    storage_path: `${ENTITY_ID}/professional/evidence-1/foto.jpg`,
    media_type: 'photo',
    mime_type: 'image/jpeg',
    size_bytes: JPEG_CONTENT.length,
    sha256: createHash('sha256').update(JPEG_CONTENT).digest('hex'),
    captured_at: '2026-08-31T10:00:00.000Z',
    ...overrides,
  }
}

test('la política ArcGIS autoriza solo fotos íntegramente acotadas a la entidad', () => {
  assert.equal(evidencePolicyError(evidence(), ENTITY_ID), null)
  assert.equal(evidencePolicyError(evidence({ media_type: 'signature', bucket_id: 'signatures' }), ENTITY_ID), 'ATTACHMENT_MEDIA_NOT_ALLOWED')
  assert.equal(evidencePolicyError(evidence({ mime_type: 'application/pdf' }), ENTITY_ID), 'ATTACHMENT_MIME_NOT_ALLOWED')
  assert.equal(evidencePolicyError(evidence({ storage_path: 'other-entity/user/evidence/foto.jpg' }), ENTITY_ID), 'ATTACHMENT_SCOPE_MISMATCH')
  assert.equal(evidencePolicyError(evidence({ size_bytes: 10 * 1024 * 1024 + 1 }), ENTITY_ID), 'ATTACHMENT_SIZE_NOT_ALLOWED')
})

test('la selección limita adjuntos por registro y nunca utiliza el nombre original', () => {
  const records = [{ id: 'response-1', local_id: 'local-response-1' }]
  const rows = Array.from({ length: MAX_ATTACHMENTS_PER_FEATURE + 2 }, (_, index) => evidence({
    id: `evidence-${index + 1}`,
    storage_path: `${ENTITY_ID}/professional/evidence-${index + 1}/nombre-personal-${index + 1}.jpg`,
    captured_at: `2026-08-31T10:00:0${index}.000Z`,
  }))
  const grouped = groupAuthorizedEvidence(rows, records, ENTITY_ID)
  assert.equal(grouped.byRecord.get('response-1').length, MAX_ATTACHMENTS_PER_FEATURE)
  assert.equal(grouped.rejected.length, 2)
  assert.ok(grouped.rejected.every(item => item.code === 'ATTACHMENT_LIMIT_EXCEEDED'))
  assert.equal(attachmentFilename(rows[0]), 'control-g-evidence-1.jpg')
  assert.equal(attachmentFilename({ ...rows[0], mime_type: 'IMAGE/JPEG' }), 'control-g-evidence-1.jpg')
  assert.doesNotMatch(attachmentFilename(rows[0]), /nombre-personal/)
})

test('la huella SHA-256 se verifica antes de transmitir una foto', async () => {
  const manifest = evidence()
  assert.deepEqual(await verifyEvidenceBlob(new Blob([JPEG_CONTENT], { type: 'image/jpeg' }), manifest), { ok: true, code: null })
  assert.deepEqual(await verifyEvidenceBlob(new Blob([Buffer.from('foto-alterada')], { type: 'image/jpeg' }), manifest), { ok: false, code: 'ATTACHMENT_SIZE_MISMATCH' })
  const sameSizeAltered = Buffer.from(JPEG_CONTENT)
  sameSizeAltered[sameSizeAltered.length - 1] = 0x78
  assert.equal(sameSizeAltered.length, JPEG_CONTENT.length)
  assert.deepEqual(await verifyEvidenceBlob(new Blob([sameSizeAltered], { type: 'image/jpeg' }), manifest), { ok: false, code: 'ATTACHMENT_HASH_MISMATCH' })
  const spoofed = Buffer.alloc(JPEG_CONTENT.length, 0x41)
  assert.deepEqual(await verifyEvidenceBlob(new Blob([spoofed], { type: 'image/jpeg' }), manifest), { ok: false, code: 'ATTACHMENT_CONTENT_MISMATCH' })
})
