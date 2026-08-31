import { createHash } from 'node:crypto'

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
export const MAX_ATTACHMENTS_PER_FEATURE = 3
export const ATTACHMENT_BATCH_SIZE = 10
export const ALLOWED_ATTACHMENT_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const EXTENSION_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function scopedStoragePath(path, entityId) {
  const [scope] = String(path || '').split('/')
  return scope === entityId
}

export function attachmentFilename(evidence) {
  const safeId = String(evidence?.id || 'evidence').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || 'evidence'
  const extension = EXTENSION_BY_MIME[String(evidence?.mime_type || '').toLowerCase()] || 'bin'
  return `control-g-${safeId}.${extension}`
}

function hasExpectedMagicBytes(bytes, mimeType) {
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mimeType === 'image/png') {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value)
  }
  if (mimeType === 'image/webp') {
    return bytes.length >= 12
      && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
      && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  }
  return false
}

export function evidencePolicyError(evidence, entityId) {
  if (evidence?.entity_id !== entityId || !scopedStoragePath(evidence?.storage_path, entityId)) return 'ATTACHMENT_SCOPE_MISMATCH'
  if (evidence?.parent_type !== 'form_response') return 'ATTACHMENT_PARENT_NOT_ALLOWED'
  if (evidence?.bucket_id !== 'field-photos' || evidence?.media_type !== 'photo') return 'ATTACHMENT_MEDIA_NOT_ALLOWED'
  if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(String(evidence?.mime_type || '').toLowerCase())) return 'ATTACHMENT_MIME_NOT_ALLOWED'
  const size = Number(evidence?.size_bytes)
  if (!Number.isInteger(size) || size < 1 || size > MAX_ATTACHMENT_BYTES) return 'ATTACHMENT_SIZE_NOT_ALLOWED'
  if (!/^[a-f0-9]{64}$/.test(String(evidence?.sha256 || ''))) return 'ATTACHMENT_HASH_INVALID'
  return null
}

export function groupAuthorizedEvidence(evidenceRows, records, entityId) {
  const recordByParent = new Map()
  for (const record of records) {
    recordByParent.set(String(record.id), record)
    recordByParent.set(String(record.local_id || record.id), record)
  }
  const byRecord = new Map(records.map(record => [String(record.id), []]))
  const rejected = []
  const ordered = [...evidenceRows].sort((left, right) => (
    String(left.captured_at || left.created_at || '').localeCompare(String(right.captured_at || right.created_at || ''))
    || String(left.id).localeCompare(String(right.id))
  ))
  for (const evidence of ordered) {
    const record = recordByParent.get(String(evidence.parent_local_id || ''))
    const policyError = evidencePolicyError(evidence, entityId)
    if (!record || policyError) {
      rejected.push({ evidence, code: policyError || 'ATTACHMENT_PARENT_NOT_FOUND' })
      continue
    }
    const group = byRecord.get(String(record.id))
    if (group.length >= MAX_ATTACHMENTS_PER_FEATURE) {
      rejected.push({ evidence, code: 'ATTACHMENT_LIMIT_EXCEEDED' })
      continue
    }
    group.push(evidence)
  }
  return { byRecord, rejected }
}

export async function verifyEvidenceBlob(blob, evidence) {
  if (!(blob instanceof Blob)) return { ok: false, code: 'ATTACHMENT_DOWNLOAD_INVALID' }
  if (blob.size !== Number(evidence.size_bytes) || blob.size < 1 || blob.size > MAX_ATTACHMENT_BYTES) {
    return { ok: false, code: 'ATTACHMENT_SIZE_MISMATCH' }
  }
  const expectedMimeType = String(evidence.mime_type).toLowerCase()
  if (blob.type && blob.type.toLowerCase() !== expectedMimeType) {
    return { ok: false, code: 'ATTACHMENT_MIME_MISMATCH' }
  }
  const buffer = Buffer.from(await blob.arrayBuffer())
  if (!hasExpectedMagicBytes(buffer.subarray(0, 16), expectedMimeType)) {
    return { ok: false, code: 'ATTACHMENT_CONTENT_MISMATCH' }
  }
  const digest = createHash('sha256').update(buffer).digest('hex')
  if (digest !== evidence.sha256) return { ok: false, code: 'ATTACHMENT_HASH_MISMATCH' }
  return { ok: true, code: null }
}
