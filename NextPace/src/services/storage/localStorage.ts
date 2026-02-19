import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TRAININGS: '@nextpace_trainings',
  WORKOUT_HISTORY: '@nextpace_workout_history',
  SYNC_QUEUE: '@nextpace_sync_queue',
  LAST_SYNC: '@nextpace_last_sync',
  MIGRATION_DONE: '@nextpace_migration_done',
  OFFLINE_MODE: '@nextpace_offline_mode',
} as const;

export type StorageKey = typeof KEYS[keyof typeof KEYS];

async function get<T>(key: StorageKey): Promise<T | null> {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`[localStorage] Erro ao ler ${key}:`, error);
    return null;
  }
}

async function set<T>(key: StorageKey, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`[localStorage] Erro ao salvar ${key}:`, error);
    throw error;
  }
}

async function remove(key: StorageKey): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`[localStorage] Erro ao remover ${key}:`, error);
    throw error;
  }
}

export const localStorage = {
  KEYS,
  get,
  set,
  remove,
};
