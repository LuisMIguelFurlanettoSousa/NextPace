import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../supabase';
import { syncQueue } from './syncQueue';
import { trainingRepository } from '../training/trainingRepository';
import { workoutRepository } from '../workout/workoutRepository';
import type { SyncOperation, SyncState, SyncStatus } from '../../types/sync';

const LAST_SYNC_KEY = '@nextpace_last_sync';
const TRAININGS_KEY = '@nextpace_trainings';
const HISTORY_KEY = '@nextpace_workout_history';
const MAX_RETRIES = 3;

type SyncListener = (state: SyncState) => void;

let listeners: SyncListener[] = [];
let currentStatus: SyncStatus = 'idle';
let syncInterval: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

const notify = async () => {
  const pendingCount = await syncQueue.count();
  const lastSyncAt = await AsyncStorage.getItem(LAST_SYNC_KEY);
  const state: SyncState = { status: currentStatus, lastSyncAt, pendingCount };
  listeners.forEach((fn) => fn(state));
};

const setStatus = async (status: SyncStatus) => {
  currentStatus = status;
  await notify();
};

const getUserId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
};

const pushOperations = async (userId: string): Promise<void> => {
  const queue = await syncQueue.getAll();
  const processed: string[] = [];

  for (const op of queue) {
    if (op.retryCount >= MAX_RETRIES) {
      processed.push(op.id);
      continue;
    }

    try {
      await executeOperation(userId, op);
      processed.push(op.id);
    } catch (error) {
      console.error(`[sync] Falha na operação ${op.type}:`, error);
      await syncQueue.incrementRetry(op.id);
    }
  }

  if (processed.length > 0) {
    await syncQueue.removeBatch(processed);
  }
};

const executeOperation = async (userId: string, op: SyncOperation): Promise<void> => {
  const { type, payload } = op;

  switch (type) {
    case 'training_create': {
      await trainingRepository.create(userId, {
        id: payload.id,
        name: payload.name,
        description: payload.description ?? '',
        defaultRestSeconds: payload.defaultRestSeconds ?? 60,
        rounds: payload.rounds ?? 1,
        isFavorite: payload.isFavorite ?? false,
        alertSound: payload.alertSound ?? null,
        alertSecondsBeforeEnd: payload.alertSecondsBeforeEnd ?? 5,
      });
      // Push exercises if training has them
      if (payload.exercises?.length) {
        for (let i = 0; i < payload.exercises.length; i++) {
          const ex = payload.exercises[i];
          await trainingRepository.upsertExercise({
            id: ex.id,
            trainingId: payload.id,
            name: ex.name,
            type: ex.type ?? 'exercise',
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            restSeconds: ex.restSeconds,
            setDurationSeconds: ex.setDurationSeconds,
            durationSeconds: ex.durationSeconds,
            position: i,
          });
        }
      }
      break;
    }

    case 'training_update': {
      await trainingRepository.update(userId, payload.id, payload.updates);
      break;
    }

    case 'training_delete': {
      await trainingRepository.softDelete(userId, payload.id);
      break;
    }

    case 'exercise_add': {
      const training = await trainingRepository.getById(userId, payload.trainingId);
      const position = training?.exercises.length ?? 0;
      await trainingRepository.upsertExercise({
        id: payload.exercise.id,
        trainingId: payload.trainingId,
        name: payload.exercise.name,
        type: payload.exercise.type ?? 'exercise',
        sets: payload.exercise.sets,
        reps: payload.exercise.reps,
        weight: payload.exercise.weight,
        restSeconds: payload.exercise.restSeconds,
        setDurationSeconds: payload.exercise.setDurationSeconds,
        durationSeconds: payload.exercise.durationSeconds,
        position,
      });
      break;
    }

    case 'exercise_update': {
      const current = await supabase
        .from('exercises')
        .select('*')
        .eq('id', payload.exerciseId)
        .single();

      if (current.data) {
        const updateData: Record<string, any> = {};
        const { updates } = payload;
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.type !== undefined) updateData.type = updates.type;
        if (updates.sets !== undefined) updateData.sets = updates.sets;
        if (updates.reps !== undefined) updateData.reps = updates.reps;
        if (updates.weight !== undefined) updateData.weight = updates.weight;
        if (updates.restSeconds !== undefined) updateData.rest_seconds = updates.restSeconds;
        if (updates.setDurationSeconds !== undefined) updateData.set_duration_seconds = updates.setDurationSeconds;
        if (updates.durationSeconds !== undefined) updateData.duration_seconds = updates.durationSeconds;

        await supabase
          .from('exercises')
          .update(updateData)
          .eq('id', payload.exerciseId);
      }
      break;
    }

    case 'exercise_delete': {
      await trainingRepository.softDeleteExercise(payload.exerciseId);
      break;
    }

    case 'exercise_reorder': {
      const { trainingId, exerciseIds } = payload;
      for (let i = 0; i < exerciseIds.length; i++) {
        await supabase
          .from('exercises')
          .update({ position: i })
          .eq('id', exerciseIds[i])
          .eq('training_id', trainingId);
      }
      break;
    }

    case 'workout_create': {
      await workoutRepository.create(userId, {
        id: payload.id,
        trainingId: payload.trainingId,
        trainingName: payload.trainingName,
        completedAt: payload.completedAt,
        durationSeconds: payload.durationSeconds,
        setsCompleted: payload.setsCompleted,
        exercisesCompleted: payload.exercisesCompleted,
        roundsCompleted: payload.roundsCompleted,
      });
      break;
    }
  }
};

const pullRemote = async (userId: string): Promise<void> => {
  const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
  const since = lastSync ?? '1970-01-01T00:00:00Z';

  // Pull trainings atualizados
  const remoteTrainings = await trainingRepository.getUpdatedAfter(userId, since);

  if (remoteTrainings.length > 0) {
    const raw = await AsyncStorage.getItem(TRAININGS_KEY);
    const localTrainings: any[] = raw ? JSON.parse(raw) : [];
    const localMap = new Map(localTrainings.map((t) => [t.id, t]));

    for (const remote of remoteTrainings) {
      if (remote.deletedAt) {
        localMap.delete(remote.id);
      } else {
        const local = localMap.get(remote.id);
        // LWW: remote vence se updatedAt > local
        if (!local || new Date(remote.updatedAt) >= new Date(local.updatedAt ?? local.createdAt)) {
          localMap.set(remote.id, {
            id: remote.id,
            name: remote.name,
            description: remote.description,
            exercises: remote.exercises.map((e) => ({
              id: e.id,
              name: e.name,
              type: e.type,
              sets: e.sets,
              reps: e.reps,
              weight: e.weight,
              restSeconds: e.restSeconds,
              setDurationSeconds: e.setDurationSeconds,
              durationSeconds: e.durationSeconds,
            })),
            createdAt: remote.createdAt,
            updatedAt: remote.updatedAt,
            defaultRestSeconds: remote.defaultRestSeconds,
            rounds: remote.rounds,
            isFavorite: remote.isFavorite,
            alertSound: remote.alertSound,
            alertSecondsBeforeEnd: remote.alertSecondsBeforeEnd,
          });
        }
      }
    }

    await AsyncStorage.setItem(TRAININGS_KEY, JSON.stringify(Array.from(localMap.values())));
  }

  // Pull workout logs
  const remoteLogs = await workoutRepository.getAfter(userId, since);
  if (remoteLogs.length > 0) {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const localLogs: any[] = raw ? JSON.parse(raw) : [];
    const existingIds = new Set(localLogs.map((l) => l.id));

    const newLogs = remoteLogs
      .filter((l) => !existingIds.has(l.id))
      .map((l) => ({
        id: l.id,
        trainingId: l.trainingId,
        trainingName: l.trainingName,
        completedAt: l.completedAt,
        durationSeconds: l.durationSeconds,
        setsCompleted: l.setsCompleted,
        exercisesCompleted: l.exercisesCompleted,
        roundsCompleted: l.roundsCompleted,
      }));

    if (newLogs.length > 0) {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([...localLogs, ...newLogs]));
    }
  }

  await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
};

export const syncService = {
  subscribe(listener: SyncListener): () => void {
    listeners.push(listener);
    notify();
    return () => {
      listeners = listeners.filter((fn) => fn !== listener);
    };
  },

  async sync(): Promise<void> {
    if (isSyncing) return;

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      await setStatus('offline');
      return;
    }

    const userId = await getUserId();
    if (!userId) return;

    isSyncing = true;
    await setStatus('syncing');

    try {
      await pushOperations(userId);
      await pullRemote(userId);
      await setStatus('idle');
    } catch (error) {
      console.error('[sync] Erro durante sincronização:', error);
      await setStatus('error');
    } finally {
      isSyncing = false;
    }
  },

  startListeners(): () => void {
    // Sync ao voltar para foreground
    const appStateListener = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        this.sync();
      }
    });

    // Sync ao reconectar rede
    const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        this.sync();
      } else {
        setStatus('offline');
      }
    });

    // Sync a cada 5 minutos
    syncInterval = setInterval(() => {
      this.sync();
    }, 5 * 60 * 1000);

    // Sync inicial
    this.sync();

    return () => {
      appStateListener.remove();
      netInfoUnsubscribe();
      if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
      }
    };
  },

  async getPendingCount(): Promise<number> {
    return syncQueue.count();
  },
};
