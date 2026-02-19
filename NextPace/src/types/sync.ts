export type SyncOperationType =
  | 'training_create'
  | 'training_update'
  | 'training_delete'
  | 'exercise_add'
  | 'exercise_update'
  | 'exercise_delete'
  | 'exercise_reorder'
  | 'workout_create';

export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  payload: any;
  timestamp: string;
  retryCount: number;
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: string | null;
  pendingCount: number;
}
