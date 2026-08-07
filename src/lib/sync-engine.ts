import { Network } from '@capacitor/network'
import { useSyncStore } from '@/stores/syncStore'
import { databases, storage, DATABASE_ID, COLLECTION_IDS, BUCKET_IDS, ID, Query, BackendError } from './backend'
import { localDB, type LocalMedia } from './dexie-db'

let syncInterval: ReturnType<typeof setInterval> | null = null
let networkListener: Awaited<ReturnType<typeof Network.addListener>> | null = null
const SYNC_INTERVAL_MS = 30_000

export async function isOnline(): Promise<boolean> {
  try {
    const status = await Network.getStatus()
    return status.connected
  } catch {
    return typeof navigator === 'undefined' ? false : navigator.onLine
  }
}

async function pendingCount() {
  const [activities, responses, media] = await Promise.all([
    localDB.activities.where('status').equals('pending').count(),
    localDB.formResponses.where('status').equals('completed').count(),
    localDB.mediaQueue.where('status').equals('pending').count(),
  ])
  let legacy = 0
  try {
    legacy = JSON.parse(localStorage.getItem('cg_offline_queue') || '[]').length
  } catch { /* ignore malformed legacy data */ }
  return activities + responses + media + legacy
}

export async function refreshPendingCount() {
  const count = await pendingCount()
  useSyncStore.getState().setPendingCount(count)
  return count
}

export async function startSyncEngine() {
  if (typeof window === 'undefined') return
  await refreshPendingCount()

  if (await isOnline()) void processSyncQueue()
  else useSyncStore.getState().setStatus('offline')

  networkListener = await Network.addListener('networkStatusChange', (status) => {
    if (status.connected) void processSyncQueue()
    else useSyncStore.getState().setStatus('offline')
  })

  syncInterval = setInterval(() => {
    void isOnline().then(online => {
      if (online) return processSyncQueue()
    })
  }, SYNC_INTERVAL_MS)
}

export function stopSyncEngine() {
  void networkListener?.remove()
  networkListener = null
  if (syncInterval) clearInterval(syncInterval)
  syncInterval = null
}

function isDuplicate(error: unknown) {
  return error instanceof BackendError && (error.code === 409 || error.code === '23505')
}

async function syncLegacyQueue() {
  let queue: any[] = []
  try {
    queue = JSON.parse(localStorage.getItem('cg_offline_queue') || '[]')
  } catch {
    localStorage.removeItem('cg_offline_queue')
  }

  const remaining: any[] = []
  for (const item of queue) {
    try {
      if (item.type === 'activity') {
        await databases.createDocument(
          DATABASE_ID,
          COLLECTION_IDS.ACTIVITIES,
          item.id || ID.unique(),
          item.data,
        )
        if (item.familyUpdate && item.familyId) {
          await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.FAMILIES, item.familyId, item.familyUpdate)
        }
      }
    } catch (error) {
      if (!isDuplicate(error)) remaining.push(item)
    }
  }

  if (remaining.length) localStorage.setItem('cg_offline_queue', JSON.stringify(remaining))
  else localStorage.removeItem('cg_offline_queue')
}

async function syncMediaQueue() {
  const pending = await localDB.mediaQueue.where('status').equals('pending').toArray()
  for (const media of pending) {
    try {
      const bucket = media.bucketId === BUCKET_IDS.SIGNATURES ? BUCKET_IDS.SIGNATURES : BUCKET_IDS.FIELD_PHOTOS
      const upload = await storage.createFile(bucket, media.id, media.file)
      await localDB.mediaQueue.update(media.id, { status: 'uploaded', remotePath: upload.$id })
    } catch {
      const attempts = (media.retryCount || 0) + 1
      await localDB.mediaQueue.update(media.id, {
        retryCount: attempts,
        status: attempts >= 5 ? 'failed' : 'pending',
      })
    }
  }
}

async function uploadedMedia(parentLocalId: string): Promise<LocalMedia[]> {
  return localDB.mediaQueue.where('activityLocalId').equals(parentLocalId).filter(item => item.status === 'uploaded').toArray()
}

async function syncActivities() {
  const pending = await localDB.activities.where('status').equals('pending').toArray()
  for (const activity of pending) {
    try {
      const payload = JSON.parse(activity.data)
      const media = await uploadedMedia(activity.localId)
      const photo = media.find(item => item.bucketId !== BUCKET_IDS.SIGNATURES)
      const signature = media.find(item => item.bucketId === BUCKET_IDS.SIGNATURES)
      if (photo?.remotePath) payload.photo_url = photo.remotePath
      if (signature?.remotePath) payload.beneficiary_signature_url = signature.remotePath

      try {
        await databases.createDocument(DATABASE_ID, COLLECTION_IDS.ACTIVITIES, ID.unique(), payload)
      } catch (error) {
        if (!isDuplicate(error)) throw error
      }

      if (activity.familyUpdate && activity.familyId) {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_IDS.FAMILIES,
          activity.familyId,
          JSON.parse(activity.familyUpdate),
        )
      }
      await localDB.activities.update(activity.localId, { status: 'synced' })
    } catch {
      const attempts = (activity.retryCount || 0) + 1
      await localDB.activities.update(activity.localId, {
        retryCount: attempts,
        status: attempts >= 5 ? 'failed' : 'pending',
      })
    }
  }
}

async function syncFormResponses() {
  const pending = await localDB.formResponses.where('status').equals('completed').toArray()
  for (const response of pending) {
    try {
      const answers = structuredClone(response.answers)
      const media = await uploadedMedia(response.localId)
      for (const item of media) {
        if (item.answerFieldId && item.remotePath) answers[item.answerFieldId] = item.remotePath
      }
      const metadata = answers._metadata || {}
      const payload = {
        form_id: response.formId,
        professional_id: response.professionalId,
        entity_id: response.entityId,
        family_id: response.familyId || null,
        local_id: response.localId,
        answers,
        answers_json: JSON.stringify(answers),
        latitude: metadata.lat ?? metadata.latitude ?? null,
        longitude: metadata.lng ?? metadata.longitude ?? null,
        status: 'synced',
        captured_at: metadata.capturedAt ? new Date(metadata.capturedAt).toISOString() : new Date(response.createdAt).toISOString(),
      }
      try {
        await databases.createDocument(DATABASE_ID, COLLECTION_IDS.FORM_RESPONSES, ID.unique(), payload)
      } catch (error) {
        if (!isDuplicate(error)) throw error
      }
      await localDB.formResponses.update(response.localId, { status: 'synced', updatedAt: Date.now() })
    } catch {
      // The completed state intentionally remains queued for the next reconnect.
    }
  }
}

export async function processSyncQueue() {
  if (!(await isOnline())) {
    useSyncStore.getState().setStatus('offline')
    await refreshPendingCount()
    return
  }
  const store = useSyncStore.getState()
  if (store.isSyncing) return

  store.setStatus('syncing')
  try {
    await syncLegacyQueue()
    await syncMediaQueue()
    await syncActivities()
    await syncFormResponses()

    const count = await pendingCount()
    if (count === 0) store.setSyncComplete()
    else store.setPendingCount(count)
  } catch {
    store.setStatus('error')
  }
}

export function getCachedFamilies(entityId?: string): any[] {
  if (!entityId) return []
  try { return JSON.parse(localStorage.getItem(`cg_families_${entityId}`) || '[]') }
  catch { return [] }
}

export function getCachedForms(entityId?: string): any[] {
  if (!entityId) return []
  try { return JSON.parse(localStorage.getItem(`cg_forms_${entityId}`) || '[]') }
  catch { return [] }
}

export async function updateLocalCache(entityId?: string) {
  if (!(await isOnline()) || !entityId) return
  try {
    const [families, municipalities, forms] = await Promise.all([
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FAMILIES, [
        Query.equal('entity_id', entityId), Query.limit(2000),
      ]),
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ENTITY_MUNICIPALITIES, [
        Query.equal('entity_id', entityId), Query.limit(500),
      ]),
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORMS, [
        Query.equal('entity_id', [entityId, 'global']), Query.equal('status', 'published'), Query.limit(500),
      ]),
    ])
    localStorage.setItem(`cg_families_${entityId}`, JSON.stringify(families.documents))
    localStorage.setItem(`cg_municipalities_${entityId}`, JSON.stringify(municipalities.documents))
    localStorage.setItem(`cg_forms_${entityId}`, JSON.stringify(forms.documents))
    useSyncStore.getState().setSyncComplete()
  } catch {
    // Keep the previous cache; losing connectivity must never erase field data.
  }
}

export function getQueueCount(): number {
  return useSyncStore.getState().pendingCount
}
