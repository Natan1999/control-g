import { useEffect } from 'react';
import { startSyncEngine, stopSyncEngine, updateLocalCache, processSyncQueue } from '@/lib/sync-engine';
import { useSyncStore } from '@/stores/syncStore';
import { useAuthStore } from '@/stores/authStore';

export function useSync() {
  const { user } = useAuthStore();
  const { status, pendingCount, lastSyncAt, isSyncing } = useSyncStore();

  useEffect(() => {
    if (user) {
      startSyncEngine();
      const entityId = user.entityId;
      if (entityId) {
        updateLocalCache(entityId).catch(console.error);
      }
    }
    return () => { stopSyncEngine(); };
  }, [user]);

  return {
    status,
    pendingCount,
    lastSyncAt,
    isSyncing,
    forceSync: () => processSyncQueue(),
    updateCache: () => {
      if (user?.entityId) {
        return updateLocalCache(user.entityId);
      }
    },
  };
}
