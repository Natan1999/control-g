import { useEffect } from 'react';
import { startSyncEngine, stopSyncEngine, updateLocalCache, processSyncQueue } from '@/lib/sync-engine';
import { useSyncStore } from '@/stores/syncStore';
import { useAuthStore } from '@/stores/authStore';

export function useSync() {
  const { user } = useAuthStore();
  const { status, pendingCount, lastSyncAt, isSyncing } = useSyncStore();

  useEffect(() => {
    // Only run sync engine if we have a logged-in user
    if (user) {
      startSyncEngine();
      
      // Optionally run a cache update on initial mount/login
      // We pass the org Id if applicable
      const orgId = user.organizationId;
      if (orgId) {
        updateLocalCache(orgId).catch(console.error);
      }
    }

    return () => {
      stopSyncEngine();
    };
  }, [user]);

  return {
    status,
    pendingCount,
    lastSyncAt,
    isSyncing,
    forceSync: () => processSyncQueue(),
    updateCache: () => {
      if (user?.organizationId) {
        return updateLocalCache(user.organizationId);
      }
    }
  };
}
