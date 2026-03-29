import { create } from 'zustand'
import type { SyncStatus } from '@/types'

interface SyncState {
  status: SyncStatus
  pendingCount: number
  lastSyncAt: string | null
  isSyncing: boolean
  setStatus: (status: SyncStatus) => void
  setPendingCount: (count: number) => void
  incrementPending: () => void
  decrementPending: () => void
  setSyncComplete: () => void
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'offline',
  pendingCount: 3,
  lastSyncAt: null,
  isSyncing: false,
  setStatus: (status) => set({ status, isSyncing: status === 'syncing' }),
  setPendingCount: (count) => set({ pendingCount: count, status: count > 0 ? 'offline' : 'synced' }),
  incrementPending: () => set(state => ({ pendingCount: state.pendingCount + 1, status: 'offline' as SyncStatus })),
  decrementPending: () => set(state => ({
    pendingCount: Math.max(0, state.pendingCount - 1),
    status: (state.pendingCount <= 1 ? 'synced' : 'offline') as SyncStatus,
  })),
  setSyncComplete: () => set({ status: 'synced', pendingCount: 0, isSyncing: false, lastSyncAt: new Date().toISOString() }),
}))
