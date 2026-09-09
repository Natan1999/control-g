import type { localDB, LocalFormResponse, LocalMedia } from './dexie-db'

// Hashing/encoding must finish before this transaction: IndexedDB transactions
// cannot remain open while awaiting camera, crypto, or network operations.
export async function saveCompletedCapture(db: typeof localDB, response: LocalFormResponse, media: LocalMedia[]) {
  if (response.status !== 'completed') throw new Error('La captura debe estar completa.')
  if (media.some(item => item.activityLocalId !== response.localId || item.entityId !== response.entityId || item.professionalId !== response.professionalId)) throw new Error('La evidencia no corresponde a esta captura.')
  await db.transaction('rw', db.formResponses, db.mediaQueue, async () => {
    await db.mediaQueue.bulkPut(media)
    await db.formResponses.put(response)
  })
}
