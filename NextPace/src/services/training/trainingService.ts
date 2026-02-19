import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateUUID } from '../../utils/uuid';

// Re-exporta tipos compatíveis com as telas existentes
export interface Exercise {
  id: string;
  name: string;
  type?: 'exercise' | 'rest';
  sets?: number;
  reps?: number;
  weight?: number;
  restSeconds?: number;
  setDurationSeconds?: number;
  durationSeconds?: number;
}

export interface Training {
  id: string;
  name: string;
  description: string;
  exercises: Exercise[];
  createdAt: string;
  defaultRestSeconds?: number;
  rounds?: number;
  isFavorite?: boolean;
  alertSound?: string;
  alertSecondsBeforeEnd?: number;
}

const TRAININGS_KEY = '@nextpace_trainings';
const SYNC_QUEUE_KEY = '@nextpace_sync_queue';

interface SyncOperation {
  id: string;
  type: 'training_create' | 'training_update' | 'training_delete' | 'exercise_add' | 'exercise_update' | 'exercise_delete' | 'exercise_reorder';
  payload: any;
  timestamp: string;
}

const enqueueSync = async (operation: Omit<SyncOperation, 'id' | 'timestamp'>): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    const queue: SyncOperation[] = raw ? JSON.parse(raw) : [];
    queue.push({
      ...operation,
      id: generateUUID(),
      timestamp: new Date().toISOString(),
    });
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[trainingService] Erro ao enfileirar sync:', error);
  }
};

export const trainingService = {
  async getAll(): Promise<Training[]> {
    try {
      const data = await AsyncStorage.getItem(TRAININGS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading trainings:', error);
      return [];
    }
  },

  async getById(id: string): Promise<Training | null> {
    try {
      const trainings = await this.getAll();
      return trainings.find((t) => t.id === id) || null;
    } catch (error) {
      console.error('Error getting training:', error);
      return null;
    }
  },

  async save(training: Omit<Training, 'id' | 'createdAt' | 'exercises'>): Promise<Training> {
    try {
      const trainings = await this.getAll();
      const newTraining: Training = {
        ...training,
        id: generateUUID(),
        exercises: [],
        createdAt: new Date().toISOString(),
      };
      trainings.push(newTraining);
      await AsyncStorage.setItem(TRAININGS_KEY, JSON.stringify(trainings));

      await enqueueSync({ type: 'training_create', payload: newTraining });

      return newTraining;
    } catch (error) {
      console.error('Error saving training:', error);
      throw error;
    }
  },

  async update(id: string, updates: Partial<Training>): Promise<Training | null> {
    try {
      const trainings = await this.getAll();
      const index = trainings.findIndex((t) => t.id === id);
      if (index === -1) return null;

      trainings[index] = { ...trainings[index], ...updates };
      await AsyncStorage.setItem(TRAININGS_KEY, JSON.stringify(trainings));

      await enqueueSync({ type: 'training_update', payload: { id, updates } });

      return trainings[index];
    } catch (error) {
      console.error('Error updating training:', error);
      throw error;
    }
  },

  async addExercise(trainingId: string, exercise: Omit<Exercise, 'id'>): Promise<Exercise> {
    try {
      const trainings = await this.getAll();
      const training = trainings.find((t) => t.id === trainingId);
      if (!training) throw new Error('Training not found');

      const newExercise: Exercise = {
        ...exercise,
        id: generateUUID(),
      };
      training.exercises.push(newExercise);
      await AsyncStorage.setItem(TRAININGS_KEY, JSON.stringify(trainings));

      await enqueueSync({ type: 'exercise_add', payload: { trainingId, exercise: newExercise } });

      return newExercise;
    } catch (error) {
      console.error('Error adding exercise:', error);
      throw error;
    }
  },

  async updateExercise(trainingId: string, exerciseId: string, updates: Partial<Omit<Exercise, 'id'>>): Promise<Exercise | null> {
    try {
      const trainings = await this.getAll();
      const training = trainings.find((t) => t.id === trainingId);
      if (!training) return null;

      const exerciseIndex = training.exercises.findIndex((e) => e.id === exerciseId);
      if (exerciseIndex === -1) return null;

      training.exercises[exerciseIndex] = { ...training.exercises[exerciseIndex], ...updates };
      await AsyncStorage.setItem(TRAININGS_KEY, JSON.stringify(trainings));

      await enqueueSync({ type: 'exercise_update', payload: { trainingId, exerciseId, updates } });

      return training.exercises[exerciseIndex];
    } catch (error) {
      console.error('Error updating exercise:', error);
      throw error;
    }
  },

  async reorderExercises(trainingId: string, exercises: Exercise[]): Promise<void> {
    try {
      const trainings = await this.getAll();
      const training = trainings.find((t) => t.id === trainingId);
      if (!training) return;

      training.exercises = exercises;
      await AsyncStorage.setItem(TRAININGS_KEY, JSON.stringify(trainings));

      await enqueueSync({
        type: 'exercise_reorder',
        payload: { trainingId, exerciseIds: exercises.map((e) => e.id) },
      });
    } catch (error) {
      console.error('Error reordering exercises:', error);
      throw error;
    }
  },

  async removeExercise(trainingId: string, exerciseId: string): Promise<void> {
    try {
      const trainings = await this.getAll();
      const training = trainings.find((t) => t.id === trainingId);
      if (!training) return;

      training.exercises = training.exercises.filter((e) => e.id !== exerciseId);
      await AsyncStorage.setItem(TRAININGS_KEY, JSON.stringify(trainings));

      await enqueueSync({ type: 'exercise_delete', payload: { trainingId, exerciseId } });
    } catch (error) {
      console.error('Error removing exercise:', error);
      throw error;
    }
  },

  async duplicate(id: string): Promise<Training | null> {
    try {
      const trainings = await this.getAll();
      const original = trainings.find((t) => t.id === id);
      if (!original) return null;

      const baseName = original.name.replace(/\s*\(cópia(?:\s*#\d+)?\)$/, '');

      const existingNumbers = trainings
        .map((t) => {
          const match = t.name.match(new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(cópia(?:\\s*#(\\d+))?\\)$`));
          if (!match) return 0;
          return match[1] ? parseInt(match[1]) : 1;
        })
        .filter((n) => n > 0);

      const nextNumber = existingNumbers.length === 0 ? 1 : Math.max(...existingNumbers) + 1;
      const copyName = nextNumber === 1
        ? `${baseName} (cópia)`
        : `${baseName} (cópia #${nextNumber})`;

      const newTraining: Training = {
        ...original,
        id: generateUUID(),
        name: copyName,
        createdAt: new Date().toISOString(),
        isFavorite: undefined,
        exercises: original.exercises.map((ex) => ({
          ...ex,
          id: generateUUID(),
        })),
      };

      trainings.push(newTraining);
      await AsyncStorage.setItem(TRAININGS_KEY, JSON.stringify(trainings));

      await enqueueSync({ type: 'training_create', payload: newTraining });

      return newTraining;
    } catch (error) {
      console.error('Error duplicating training:', error);
      throw error;
    }
  },

  async toggleFavorite(id: string): Promise<boolean> {
    try {
      const trainings = await this.getAll();
      const training = trainings.find((t) => t.id === id);
      if (!training) return false;

      training.isFavorite = !training.isFavorite;
      await AsyncStorage.setItem(TRAININGS_KEY, JSON.stringify(trainings));

      await enqueueSync({ type: 'training_update', payload: { id, updates: { isFavorite: training.isFavorite } } });

      return training.isFavorite;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  },

  async getFavorites(): Promise<Training[]> {
    try {
      const trainings = await this.getAll();
      return trainings.filter((t) => t.isFavorite === true);
    } catch (error) {
      console.error('Error getting favorites:', error);
      return [];
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const trainings = await this.getAll();
      const filtered = trainings.filter((t) => t.id !== id);
      await AsyncStorage.setItem(TRAININGS_KEY, JSON.stringify(filtered));

      await enqueueSync({ type: 'training_delete', payload: { id } });
    } catch (error) {
      console.error('Error deleting training:', error);
      throw error;
    }
  },
};
