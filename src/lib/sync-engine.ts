import { Network } from '@capacitor/network'
import { useSyncStore } from '@/stores/syncStore'
import { databases, storage, DATABASE_ID, COLLECTION_IDS, BUCKET_IDS, ID, Query, BackendError } from './backend'
import { localDB, type LocalMedia } from './dexie-db'

let syncInterval: ReturnType<typeof setInterval> | null = null
let networkListener: Awaited<ReturnType<typeof Network.addListener>> | null = null
let syncStartPending = false
let activeSync: Promise<SyncResult> | null = null
const SYNC_INTERVAL_MS = 30_000

export interface SyncResult {
  pendingCount: number
  synced: boolean
  errors: string[]
}

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
    localDB.activities.filter(item => item.status !== 'synced').count(),
    localDB.formResponses.where('status').equals('completed').count(),
    localDB.mediaQueue.filter(item => item.status !== 'uploaded').count(),
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
  if (typeof window === 'undefined' || syncStartPending || syncInterval || networkListener) return
  syncStartPending = true
  try {
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
  } finally {
    syncStartPending = false
  }
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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Error de comunicación con Supabase.'
}

async function syncLegacyQueue(): Promise<string[]> {
  const errors: string[] = []
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
      if (!isDuplicate(error)) {
        remaining.push(item)
        errors.push(`Actividad anterior: ${errorMessage(error)}`)
      }
    }
  }

  if (remaining.length) localStorage.setItem('cg_offline_queue', JSON.stringify(remaining))
  else localStorage.removeItem('cg_offline_queue')
  return errors
}

async function syncMediaQueue(): Promise<string[]> {
  const errors: string[] = []
  // Failed entries from earlier versions are deliberately retried too. Field
  // evidence must remain queued until a connection eventually succeeds.
  const pending = await localDB.mediaQueue.filter(item => item.status !== 'uploaded').toArray()
  for (const media of pending) {
    try {
      const bucket = media.bucketId === BUCKET_IDS.SIGNATURES ? BUCKET_IDS.SIGNATURES : BUCKET_IDS.FIELD_PHOTOS
      const upload = await storage.createFile(bucket, media.id, media.file)
      await localDB.mediaQueue.update(media.id, { status: 'uploaded', remotePath: upload.$id })
    } catch (error) {
      const attempts = (media.retryCount || 0) + 1
      const message = errorMessage(error)
      await localDB.mediaQueue.update(media.id, {
        retryCount: attempts,
        status: 'pending',
        lastError: message,
      })
      errors.push(`Evidencia ${media.name}: ${message}`)
    }
  }
  return errors
}

async function uploadedMedia(parentLocalId: string): Promise<LocalMedia[]> {
  return localDB.mediaQueue.where('activityLocalId').equals(parentLocalId).filter(item => item.status === 'uploaded').toArray()
}

async function hasUnresolvedMedia(parentLocalId: string) {
  return (await localDB.mediaQueue
    .where('activityLocalId')
    .equals(parentLocalId)
    .filter(item => item.status !== 'uploaded')
    .count()) > 0
}

async function syncActivities(): Promise<string[]> {
  const errors: string[] = []
  const pending = await localDB.activities.filter(item => item.status !== 'synced').toArray()
  for (const activity of pending) {
    try {
      if (await hasUnresolvedMedia(activity.localId)) continue
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
    } catch (error) {
      const attempts = (activity.retryCount || 0) + 1
      await localDB.activities.update(activity.localId, {
        retryCount: attempts,
        status: 'pending',
      })
      errors.push(`Actividad pendiente: ${errorMessage(error)}`)
    }
  }
  return errors
}

async function syncFormResponses(): Promise<string[]> {
  const errors: string[] = []
  const pending = await localDB.formResponses.where('status').equals('completed').toArray()
  for (const response of pending) {
    try {
      if (await hasUnresolvedMedia(response.localId)) continue
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
      await localDB.formResponses.update(response.localId, {
        status: 'synced',
        updatedAt: Date.now(),
        lastError: '',
      })
    } catch (error) {
      const message = errorMessage(error)
      await localDB.formResponses.update(response.localId, {
        retryCount: (response.retryCount || 0) + 1,
        lastError: message,
        updatedAt: Date.now(),
      })
      errors.push(`Formulario pendiente: ${message}`)
    }
  }
  return errors
}

async function runSyncQueue(): Promise<SyncResult> {
  const store = useSyncStore.getState()
  if (!(await isOnline())) {
    store.setStatus('offline')
    const count = await refreshPendingCount()
    return { pendingCount: count, synced: count === 0, errors: count > 0 ? ['Sin conexión. Los registros siguen protegidos en este dispositivo.'] : [] }
  }

  store.setStatus('syncing')
  const errors: string[] = []
  try {
    errors.push(...await syncLegacyQueue())
    errors.push(...await syncMediaQueue())
    errors.push(...await syncActivities())
    errors.push(...await syncFormResponses())
  } catch (error) {
    errors.push(errorMessage(error))
  }

  const count = await pendingCount()
  if (count === 0) store.setSyncComplete()
  else {
    store.setPendingCount(count)
    store.setStatus(errors.length > 0 ? 'error' : 'offline')
  }
  return { pendingCount: count, synced: count === 0, errors }
}

export function processSyncQueue(): Promise<SyncResult> {
  if (activeSync) return activeSync
  activeSync = runSyncQueue().finally(() => { activeSync = null })
  return activeSync
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

export function getCachedFormAssignments(entityId?: string, professionalId?: string): any[] {
  if (!entityId || !professionalId) return []
  try { return JSON.parse(localStorage.getItem(`cg_form_assignments_${entityId}_${professionalId}`) || '[]') }
  catch { return [] }
}

function assignmentIsCurrent(assignment: any) {
  const now = Date.now()
  return assignment.status === 'active'
    && (!assignment.starts_at || new Date(assignment.starts_at).getTime() <= now)
    && (!assignment.ends_at || new Date(assignment.ends_at).getTime() >= now)
}

export async function updateLocalCache(entityId?: string, professionalId?: string, role?: string) {
  if (!(await isOnline()) || !entityId) return
  try {
    const [families, municipalities] = await Promise.all([
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FAMILIES, [
        Query.equal('entity_id', entityId), Query.limit(2000),
      ]),
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ENTITY_MUNICIPALITIES, [
        Query.equal('entity_id', entityId), Query.limit(500),
      ]),
    ])

    let formDocuments: any[] = []
    if (role === 'professional' && professionalId) {
      const assignmentResult = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORM_ASSIGNMENTS, [
        Query.equal('entity_id', entityId),
        Query.equal('professional_id', professionalId),
        Query.equal('status', 'active'),
        Query.limit(500),
      ])
      const assignments = assignmentResult.documents.filter(assignmentIsCurrent)
      const assignedIds = assignments.map((assignment: any) => assignment.form_id)
      if (assignedIds.length > 0) {
        const forms = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORMS, [
          Query.equal('$id', assignedIds),
          Query.equal('status', 'published'),
          Query.limit(500),
        ])
        formDocuments = forms.documents
      }
      localStorage.setItem(`cg_form_assignments_${entityId}_${professionalId}`, JSON.stringify(assignments))
    } else {
      const forms = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORMS, [
        Query.equal('entity_id', [entityId, 'global']), Query.equal('status', 'published'), Query.limit(500),
      ])
      formDocuments = forms.documents
    }

    localStorage.setItem(`cg_families_${entityId}`, JSON.stringify(families.documents))
    localStorage.setItem(`cg_municipalities_${entityId}`, JSON.stringify(municipalities.documents))
    localStorage.setItem(`cg_forms_${entityId}`, JSON.stringify(formDocuments))
  } catch {
    // Keep the previous cache; losing connectivity must never erase field data.
  }
}

export function getQueueCount(): number {
  return useSyncStore.getState().pendingCount
}
