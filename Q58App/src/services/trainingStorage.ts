import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Exercise {
  id: string;
  name: string;
  type?: 'exercise' | 'rest'; // tipo do card (exercício ou descanso)
  sets?: number; // número de séries (opcional)
  reps?: number; // número de repetições (opcional)
  weight?: number;
  restSeconds?: number; // intervalo entre séries em segundos (opcional)
  setDurationSeconds?: number; // tempo da série (opcional)
  durationSeconds?: number; // duração do descanso (para cards de descanso)
}

export interface Training {
  id: string;
  name: string;
  description: string;
  exercises: Exercise[];
  createdAt: string;
  defaultRestSeconds?: number;  // Descanso padrão entre exercícios
  rounds?: number;              // Repetições do treino (default: 1)
  isFavorite?: boolean;         // Treino favorito
  alertSound?: string;          // ID do som de alerta customizado
  alertSecondsBeforeEnd?: number; // Segundos antes do fim para tocar alerta (default: 5)
}

const TRAININGS_KEY = '@nextpace_trainings';

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

  async updateExercise(trainingId: string, exerciseId: string, updates: Partial<Omit<Exercise, 'id'>>): Promise<Exercise | null> {
    try {
      const trainings = await this.getAll();
      const training = trainings.find((t) => t.id === trainingId);
      if (!training) return null;

      const exerciseIndex = training.exercises.findIndex((e) => e.id === exerciseId);
      if (exerciseIndex === -1) return null;

      training.exercises[exerciseIndex] = { ...training.exercises[exerciseIndex], ...updates };
      await AsyncStorage.setItem(TRAININGS_KEY, JSON.stringify(trainings));
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

      // Extrai o nome base (remove sufixo "(cópia)" ou "(cópia #N)")
      const baseName = original.name.replace(/\s*\(cópia(?:\s*#\d+)?\)$/, '');

      // Encontra o próximo número disponível
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
        id: Date.now().toString(),
        name: copyName,
        createdAt: new Date().toISOString(),
        isFavorite: undefined,
        exercises: original.exercises.map((ex) => ({
          ...ex,
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        })),
      };

      trainings.push(newTraining);
      await AsyncStorage.setItem(TRAININGS_KEY, JSON.stringify(trainings));
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
