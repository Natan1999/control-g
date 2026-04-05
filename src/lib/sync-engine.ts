/**
 * Control G — Sync Engine
 * Handles offline detection and syncs activities/families from the queue to Appwrite.
 * Queue is stored in localStorage under key `cg_offline_queue`.
 */

import { useSyncStore } from '@/stores/syncStore'
import { databases, DATABASE_ID, COLLECTION_IDS } from './appwrite'
import { Query } from 'appwrite'

let syncInterval: ReturnType<typeof setInterval> | null = null
const SYNC_INTERVAL_MS = 30_000 // 30 seconds

export function startSyncEngine() {
  if (typeof window === 'undefined') return
  updateNetworkStatus()
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  syncInterval = setInterval(() => {
    if (navigator.onLine) processSyncQueue()
  }, SYNC_INTERVAL_MS)
}

export function stopSyncEngine() {
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
  if (syncInterval) { clearInterval(syncInterval); syncInterval = null }
}

function updateNetworkStatus() {
  if (navigator.onLine) {
    processSyncQueue()
  } else {
    useSyncStore.getState().setStatus('offline')
  }
}

function handleOnline()  { processSyncQueue() }
function handleOffline() { useSyncStore.getState().setStatus('offline') }

/**
 * Process pending items from the offline queue.
 * Each item: { type, id, data, familyId, familyUpdate }
 */
export async function processSyncQueue() {
  if (!navigator.onLine) return
  const store = useSyncStore.getState()
  if (store.isSyncing) return

  try {
    store.setStatus('syncing')

    const raw = localStorage.getItem('cg_offline_queue')
    if (!raw) { store.setSyncComplete(); return }

    const queue: any[] = JSON.parse(raw)
    if (queue.length === 0) {
      localStorage.removeItem('cg_offline_queue')
      store.setSyncComplete()
      return
    }

    store.setPendingCount(queue.length)

    const remaining: any[] = []

    for (const item of queue) {
      try {
        if (item.type === 'activity') {
          // Create activity document
          await databases.createDocument(DATABASE_ID, COLLECTION_IDS.ACTIVITIES, item.id, item.data)

          // Update family status if provided
          if (item.familyUpdate && item.familyId) {
            await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.FAMILIES, item.familyId, item.familyUpdate)
          }
          // Successfully synced — do NOT add back to remaining
        } else {
          // Unknown item type — skip but keep for manual inspection
          remaining.push(item)
        }
      } catch (err: any) {
        // If document already exists (409) — consider it synced, don't retry
        if (err?.code === 409) continue
        // Otherwise keep in queue for retry
        remaining.push(item)
      }
    }

    if (remaining.length === 0) {
      localStorage.removeItem('cg_offline_queue')
      store.setSyncComplete()
    } else {
      localStorage.setItem('cg_offline_queue', JSON.stringify(remaining))
      store.setPendingCount(remaining.length)
      store.setStatus('offline')
    }
  } catch {
    useSyncStore.getState().setStatus('error')
  }
}

/**
 * Download families for a given entity and store in localStorage for offline access.
 */
export async function updateLocalCache(entityId?: string) {
  if (!navigator.onLine || !entityId) return
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
