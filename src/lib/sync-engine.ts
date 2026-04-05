/**
 * Control G — Sync Engine (simplified for new domain)
 * Handles offline detection and syncs activities/families from IndexedDB to Appwrite.
 */

import { useSyncStore } from '@/stores/syncStore';
import { databases, DATABASE_ID, COLLECTION_IDS } from './appwrite';
import { Query } from 'appwrite';

let syncInterval: ReturnType<typeof setInterval> | null = null;
const SYNC_INTERVAL_MS = 60_000; // 1 minute

export function startSyncEngine() {
  if (typeof window === 'undefined') return;
  updateNetworkStatus();
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  syncInterval = setInterval(() => {
    if (navigator.onLine) processSyncQueue();
  }, SYNC_INTERVAL_MS);
}

export function stopSyncEngine() {
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  }
  if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
}

function updateNetworkStatus() {
  if (navigator.onLine) {
    processSyncQueue();
  } else {
    useSyncStore.getState().setStatus('offline');
  }
}

function handleOnline()  { processSyncQueue(); }
function handleOffline() { useSyncStore.getState().setStatus('offline'); }

/**
 * Process pending items from the offline queue in localStorage.
 * Activities saved offline are stored as JSON in localStorage key `cg_offline_queue`.
 */
export async function processSyncQueue() {
  if (!navigator.onLine) return;
  const store = useSyncStore.getState();
  if (store.isSyncing) return;

  try {
    store.setStatus('syncing');

    const raw = localStorage.getItem('cg_offline_queue');
    if (!raw) { store.setSyncComplete(); return; }

    const queue: any[] = JSON.parse(raw);
    if (queue.length === 0) { store.setSyncComplete(); return; }

    store.setPendingCount(queue.length);

    const remaining: any[] = [];

    for (const item of queue) {
      try {
        if (item.type === 'activity') {
          await databases.createDocument(DATABASE_ID, COLLECTION_IDS.ACTIVITIES, item.id, item.data);
          // Update family status
          if (item.familyUpdate) {
            await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.FAMILIES, item.familyId, item.familyUpdate);
          }
        }
        // Successfully synced — don't add back to remaining
      } catch {
        remaining.push(item);
      }
    }

    if (remaining.length === 0) {
      localStorage.removeItem('cg_offline_queue');
      store.setSyncComplete();
    } else {
      localStorage.setItem('cg_offline_queue', JSON.stringify(remaining));
      store.setPendingCount(remaining.length);
      store.setStatus('offline');
    }
  } catch {
    store.setStatus('error');
  }
}

/**
 * Update local cache — downloads families for offline access.
 */
export async function updateLocalCache(entityId?: string) {
  if (!navigator.onLine || !entityId) return;
  try {
    const res = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FAMILIES, [
      Query.equal('entity_id', entityId),
      Query.limit(500),
    ]);
    // Store in localStorage for basic offline access
    localStorage.setItem(`cg_families_${entityId}`, JSON.stringify(res.documents));
    useSyncStore.getState().setSyncComplete();
  } catch {
    // Silently fail — offline access will use whatever is already cached
  }
}
