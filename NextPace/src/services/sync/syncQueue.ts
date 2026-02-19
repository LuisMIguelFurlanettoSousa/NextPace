import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SyncOperation } from '../../types/sync';

const SYNC_QUEUE_KEY = '@nextpace_sync_queue';

export const syncQueue = {
  async getAll(): Promise<SyncOperation[]> {
    try {
      const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async remove(operationId: string): Promise<void> {
    const queue = await this.getAll();
    const filtered = queue.filter((op) => op.id !== operationId);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
  },

  async removeBatch(ids: string[]): Promise<void> {
    const queue = await this.getAll();
    const idSet = new Set(ids);
    const filtered = queue.filter((op) => !idSet.has(op.id));
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
  },

  async incrementRetry(operationId: string): Promise<void> {
    const queue = await this.getAll();
    const op = queue.find((o) => o.id === operationId);
    if (op) {
      op.retryCount = (op.retryCount || 0) + 1;
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    }
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
  },

  async count(): Promise<number> {
    const queue = await this.getAll();
    return queue.length;
  },
};
