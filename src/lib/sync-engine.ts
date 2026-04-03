import { localDB } from './dexie-db';
import { bulkSyncResponses, listForms, listProjects, listZones, uploadFieldPhoto } from './appwrite-db';
import { useSyncStore } from '@/stores/syncStore';

let syncInterval: ReturnType<typeof setInterval> | null = null;
const SYNC_INTERVAL_MS = 60000; // 1 minute

export function startSyncEngine() {
  if (typeof window === 'undefined') return;

  // Initial check
  updateNetworkStatus();

  // Listeners
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Background sync task
  syncInterval = setInterval(() => {
    if (navigator.onLine) {
      processSyncQueue();
    }
  }, SYNC_INTERVAL_MS);
}

export function stopSyncEngine() {
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  }
  if (syncInterval) {
    clearInterval(syncInterval);
  }
}

function updateNetworkStatus() {
  const isOnline = navigator.onLine;
  if (!isOnline) {
    useSyncStore.getState().setStatus('offline');
  } else {
    processSyncQueue();
  }
}

function handleOnline() {
  console.log('[SyncEngine] Network online detected. Triggering sync.');
  processSyncQueue();
}

function handleOffline() {
  console.log('[SyncEngine] Network offline detected.');
  useSyncStore.getState().setStatus('offline');
}

/**
 * Process the current queue in IndexedDB
 */
export async function processSyncQueue() {
  if (!navigator.onLine) return;

  const store = useSyncStore.getState();
  if (store.isSyncing) return; // Prevent concurrent syncs

  try {
    store.setStatus('syncing');

    // 1. Process Media Queue First (Photos, Signatures)
    await processMediaQueue();

    // 2. Process Forms Queue
    const pendingResponses = await localDB.responses
      .where('sync_status')
      .equals('pending')
      .toArray();

    if (pendingResponses.length === 0) {
      store.setSyncComplete();
      return;
    }

    store.setPendingCount(pendingResponses.length);

    console.log(`[SyncEngine] Syncing ${pendingResponses.length} pending responses...`);

    // Prepare payload
    const payload = pendingResponses.map(r => ({
      local_id: r.local_id,
      form_id: r.form_id,
      project_id: r.project_id,
      organization_id: r.organization_id,
      technician_id: r.technician_id,
      zone_id: r.zone_id,
      data: r.data,
      latitude: r.latitude,
      longitude: r.longitude,
      accuracy: r.accuracy,
      altitude: null,
      status: r.status as 'synced' | 'in_review' | 'validated' | 'approved' | 'rejected',
      source: r.source as 'digital' | 'ocr_camera' | 'ocr_pdf',
      ocr_confidence: null,
      ocr_field_confidences: null,
      rejection_reason: null,
      review_notes: null,
      reviewed_by: null,
      reviewed_at: null,
      device_info: r.device_info,
      started_at: r.started_at,
      completed_at: r.completed_at,
      synced_at: null,
      form_version: null
    }));

    // Send bulk request to Appwrite
    const { synced, failed } = await bulkSyncResponses(payload);

    // Update local database with results
    for (const success of synced) {
      await localDB.responses.update(success.local_id, {
        sync_status: 'synced'
      });
      console.log(`[SyncEngine] Synced response: ${success.local_id}`);
    }

    // Handle Failures
    for (const fail of failed) {
      const dbResp = await localDB.responses.get(fail.local_id);
      if (dbResp) {
        const retries = dbResp.retry_count + 1;
        await localDB.responses.update(fail.local_id, {
          retry_count: retries,
          sync_status: retries >= 5 ? 'failed' : 'pending' // Give up after 5 retries
        });
        console.error(`[SyncEngine] Failed to sync ${fail.local_id}: ${fail.error}`);
      }
    }

    // Wrap up
    const remaining = await localDB.responses
      .where('sync_status')
      .equals('pending')
      .count();

    if (remaining === 0) {
      store.setSyncComplete();
    } else {
      store.setPendingCount(remaining);
      store.setStatus('offline'); // Technically something didn't sync, await next retry
    }

  } catch (error) {
    console.error('[SyncEngine] critical error processing queue:', error);
    store.setStatus('offline');
  }
}

/**
 * Upload items from the mediaQueue to Appwrite buckets
 */
async function processMediaQueue() {
  try {
    const pendingMedia = await localDB.mediaQueue
      .where('status')
      .equals('pending')
      .toArray();

    if (pendingMedia.length === 0) return;

    for (const media of pendingMedia) {
      try {
        // Appwrite Storage API upload
        // In this basic version we will assume uploadFieldPhoto is universal 
        // given how appwrite-db is written. If we had multiple buckets, we could 
        // switch on media.bucket_id.
        const file = new File([media.file], media.name, { type: media.type });
        const { fileId } = await uploadFieldPhoto(file);

        // Update local response payload to replace the placeholder ID with real fileId
        const relatedResponse = await localDB.responses.get(media.response_local_id);
        if (relatedResponse) {
          // It's expected the frontend form submission embedded a marker like "LOCAL_MEDIA:id"
          const parsedData = JSON.parse(relatedResponse.data);
          // Look through parsed data for local ids and swap. (Simplified replacement)
          const updatedDataStr = JSON.stringify(parsedData).replace(
            `"LOCAL_MEDIA:${media.id}"`, 
            `"${fileId}"`
          );
          await localDB.responses.update(relatedResponse.local_id, {
            data: updatedDataStr
          });
        }

        // Mark media as uploaded
        await localDB.mediaQueue.update(media.id, {
           status: 'uploaded',
           appwrite_file_id: fileId
        });

      } catch (err) {
        console.error(`[SyncEngine] Error uploading media ${media.id}`, err);
        await localDB.mediaQueue.update(media.id, {
          status: 'failed'
        });
      }
    }
  } catch (err) {
    console.error('[SyncEngine] Error querying media queue', err);
  }
}

/**
 * Manually triggering a cache update from Backend to Dexie.
 * Useful to run when login succeeds or from a "Sync Data" button.
 */
export async function updateLocalCache(organizationId?: string, projectId?: string) {
  if (!navigator.onLine) return;
  console.log('[SyncEngine] Updating local offline cache...');

  try {
    // 1. Projects
    const projectsResp = await listProjects({ organizationId, limit: 100 });
    const localProjects = projectsResp.documents.map(p => ({
      $id: p.$id,
      name: p.name,
      organization_id: p.organization_id,
      status: p.status,
      settings: p.settings,
      synced_at: Date.now()
    }));
    await localDB.projects.bulkPut(localProjects);

    // 2. Forms
    const formsResp = await listForms({ organizationId, projectId, limit: 100 });
    const localForms = formsResp.documents.map(f => ({
      $id: f.$id,
      name: f.name,
      project_id: f.project_id,
      organization_id: f.organization_id,
      schema: f.schema,
      version: f.version,
      total_fields: f.total_fields,
      synced_at: Date.now()
    }));
    await localDB.forms.bulkPut(localForms);

    // 3. Zones
    const zonesResp = await listZones(undefined, organizationId, 200);
    const localZones = zonesResp.map(z => ({
      $id: z.$id,
      name: z.name,
      type: z.type,
      municipality_id: z.municipality_id,
      parent_zone_id: z.parent_zone_id,
      synced_at: Date.now()
    }));
    await localDB.zones.bulkPut(localZones);

    console.log('[SyncEngine] Local cache update complete');
  } catch (error) {
    console.error('[SyncEngine] Failed to update local cache', error);
  }
}
