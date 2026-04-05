import { Network } from '@capacitor/network'
import { useSyncStore } from '@/stores/syncStore'
import { databases, DATABASE_ID, COLLECTION_IDS } from './appwrite'
import { Query } from 'appwrite'

let syncInterval: ReturnType<typeof setInterval> | null = null
const SYNC_INTERVAL_MS = 30_000 // 30 seconds

export async function isOnline(): Promise<boolean> {
  const status = await Network.getStatus()
  return status.connected
}

export async function startSyncEngine() {
  if (typeof window === 'undefined') return
  
  // Initial check
  const status = await Network.getStatus()
  if (status.connected) {
    processSyncQueue()
  } else {
    useSyncStore.getState().setStatus('offline')
  }

  // Listen for network changes
  Network.addListener('networkStatusChange', (status) => {
    if (status.connected) {
      console.log('Network connected, triggering sync...')
      processSyncQueue()
    } else {
      console.log('Network disconnected')
      useSyncStore.getState().setStatus('offline')
    }
  })

  syncInterval = setInterval(async () => {
    if (await isOnline()) processSyncQueue()
  }, SYNC_INTERVAL_MS)
}

export function stopSyncEngine() {
  Network.removeAllListeners()
  if (syncInterval) { 
    clearInterval(syncInterval)
    syncInterval = null 
  }
}

// Removed legacy window listeners in favor of Network.addListener

import { localDB } from './dexie-db'

/**
 * Process pending items from both the legacy localStorage queue and the new Dexie form responses/activities.
 */
export async function processSyncQueue() {
  if (!(await isOnline())) return
  const store = useSyncStore.getState()
  if (store.isSyncing) return

  try {
    store.setStatus('syncing')

    // 1. Process legacy localStorage activities (MIGRATION SUPPORT)
    const raw = localStorage.getItem('cg_offline_queue')
    const legacyQueue: any[] = raw ? JSON.parse(raw) : []
    
    if (legacyQueue.length > 0) {
      for (const item of legacyQueue) {
        try {
          if (item.type === 'activity') {
            await databases.createDocument(DATABASE_ID, COLLECTION_IDS.ACTIVITIES, 'unique()', item.data)
            if (item.familyUpdate && item.familyId) {
              await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.FAMILIES, item.familyId, item.familyUpdate)
            }
          }
        } catch (err: any) {
          if (err?.code !== 409) console.error('Legacy sync error:', err)
        }
      }
      localStorage.removeItem('cg_offline_queue')
    }

    // 2. Process Dexie Activities (All types: ex_ante, encounter, ex_post)
    const pendingActivities = await localDB.activities
      .where('status')
      .equals('pending')
      .toArray()

    for (const act of pendingActivities) {
      try {
        const payload = JSON.parse(act.data)
        await databases.createDocument(DATABASE_ID, COLLECTION_IDS.ACTIVITIES, 'unique()', payload)
        
        if (act.familyUpdate && act.familyId) {
          const famPayload = JSON.parse(act.familyUpdate)
          await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.FAMILIES, act.familyId, famPayload)
        }

        await localDB.activities.update(act.localId, { status: 'synced' })
      } catch (err: any) {
        console.error('Error syncing activity:', err)
        // Optionally increment retry count
        await localDB.activities.update(act.localId, { retryCount: (act.retryCount || 0) + 1 })
      }
    }

    // 3. Process Dexie Form Responses
    const pendingResponses = await localDB.formResponses
      .where('status')
      .equals('completed')
      .toArray()

    for (const resp of pendingResponses) {
      try {
        const payload = {
          form_id: resp.formId,
          professional_id: resp.professionalId,
          entity_id: resp.entityId || '',
          family_id: resp.familyId || '',
          answers_json: JSON.stringify(resp.answers),
          created_at: new Date(resp.createdAt).toISOString(),
          v: 1
        }

        await databases.createDocument(
            DATABASE_ID, 
            COLLECTION_IDS.FORM_RESPONSES, 
            'unique()', 
            payload
        )

        await localDB.formResponses.update(resp.localId, { 
            status: 'synced',
            updatedAt: Date.now()
        })
      } catch (err: any) {
        console.error('Error syncing form response:', err)
      }
    }

    // Update pending count state
    const currentPending = 
      (await localDB.activities.where('status').equals('pending').count()) +
      (await localDB.formResponses.where('status').equals('completed').count())

    if (currentPending === 0) {
      store.setSyncComplete()
    } else {
      store.setPendingCount(currentPending)
    }
  } catch (err) {
    console.error('Global sync engine error:', err)
    useSyncStore.getState().setStatus('error')
  }
}

/**
 * Download families for a given entity and store in localStorage for offline access.
 */
export async function updateLocalCache(entityId?: string) {
  if (!(await isOnline()) || !entityId) return
  try {
    const res = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FAMILIES, [
      Query.equal('entity_id', entityId),
      Query.limit(500),
    ])
    localStorage.setItem(`cg_families_${entityId}`, JSON.stringify(res.documents))

    // Also cache municipalities for this entity
    const munRes = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ENTITY_MUNICIPALITIES, [
      Query.equal('entity_id', entityId),
      Query.limit(200),
    ])
    localStorage.setItem(`cg_municipalities_${entityId}`, JSON.stringify(munRes.documents))

    // Also cache forms for this entity (or global forms)
    const formsRes = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORMS, [
      Query.equal('entity_id', [entityId, 'global']), 
      Query.equal('status', 'published'),
      Query.limit(100),
    ])
    localStorage.setItem(`cg_forms_${entityId}`, JSON.stringify(formsRes.documents))

    useSyncStore.getState().setSyncComplete()
  } catch {
    // Silently fail — offline reads will use cached data
  }
}

/**
 * Get pending item count from the offline queue.
 */
export function getQueueCount(): number {
  try {
    const raw = localStorage.getItem('cg_offline_queue')
    if (!raw) return 0
    return JSON.parse(raw).length
  } catch {
    return 0
  }
}
