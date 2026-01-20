import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  restSeconds?: number; // intervalo entre séries em segundos (opcional)
  setDurationSeconds?: number; // tempo da série (opcional)
}

export interface Training {
  id: string;
  name: string;
  description: string;
  exercises: Exercise[];
  createdAt: string;
}

const TRAININGS_KEY = '@q58_trainings';

export const trainingStorage = {
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
        id: Date.now().toString(),
        exercises: [],
        createdAt: new Date().toISOString(),
      };
      trainings.push(newTraining);
      await AsyncStorage.setItem(TRAININGS_KEY, JSON.stringify(trainings));
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
        id: Date.now().toString(),
      };
      training.exercises.push(newExercise);
      await AsyncStorage.setItem(TRAININGS_KEY, JSON.stringify(trainings));
      return newExercise;
    } catch (error) {
      console.error('Error adding exercise:', error);
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
    } catch (error) {
      console.error('Error removing exercise:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const trainings = await this.getAll();
      const filtered = trainings.filter((t) => t.id !== id);
      await AsyncStorage.setItem(TRAININGS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting training:', error);
      throw error;
    }
  },
};

// Helper para formatar segundos em formato legível
// - Só segundos: "30s"
// - Com minutos: "1:30" (1 min 30 seg)
// - Com horas: "1:05:30" (1h 5min 30seg)
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  if (mins > 0) {
    if (secs > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}min`;
  }
  return `${secs}s`;
};
