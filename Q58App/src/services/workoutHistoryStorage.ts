import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WorkoutLog {
  id: string;
  trainingId: string;
  trainingName: string;
  completedAt: string;
  durationSeconds: number;
  setsCompleted: number;
  exercisesCompleted: number;
  roundsCompleted: number;
}

export interface WeeklySummary {
  workouts: number;
  totalSeconds: number;
  totalSets: number;
}

const HISTORY_KEY = '@nextpace_workout_history';

// Helpers de data
const startOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  // Semana começa no domingo (0)
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const workoutHistoryStorage = {
  async getAll(): Promise<WorkoutLog[]> {
    try {
      const data = await AsyncStorage.getItem(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      return [];
    }
  },

  async save(log: Omit<WorkoutLog, 'id'>): Promise<WorkoutLog> {
    try {
      const logs = await this.getAll();
      const newLog: WorkoutLog = {
        ...log,
        id: Date.now().toString(),
      };
      logs.push(newLog);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(logs));
      return newLog;
    } catch (error) {
      console.error('Erro ao salvar histórico:', error);
      throw error;
    }
  },

  async getWeeklySummary(): Promise<WeeklySummary> {
    const logs = await this.getAll();
    const weekStart = startOfWeek(new Date());

    const thisWeek = logs.filter(
      (log) => new Date(log.completedAt) >= weekStart
    );

    return {
      workouts: thisWeek.length,
      totalSeconds: thisWeek.reduce((acc, log) => acc + log.durationSeconds, 0),
      totalSets: thisWeek.reduce((acc, log) => acc + log.setsCompleted, 0),
    };
  },

  async getStreak(): Promise<number> {
    const logs = await this.getAll();
    if (logs.length === 0) return 0;

    // Agrupar por semana (início no domingo)
    const weekSet = new Set<string>();
    for (const log of logs) {
      const ws = startOfWeek(new Date(log.completedAt));
      weekSet.add(ws.toISOString());
    }

    // Ordenar semanas do mais recente para o mais antigo
    const weeks = Array.from(weekSet)
      .map((w) => new Date(w))
      .sort((a, b) => b.getTime() - a.getTime());

    if (weeks.length === 0) return 0;

    // Verificar se a semana atual ou a anterior tem treino
    const currentWeekStart = startOfWeek(new Date());
    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const mostRecentWeek = weeks[0].getTime();
    if (
      mostRecentWeek !== currentWeekStart.getTime() &&
      mostRecentWeek !== lastWeekStart.getTime()
    ) {
      return 0;
    }

    // Contar semanas consecutivas
    let streak = 1;
    for (let i = 1; i < weeks.length; i++) {
      const diff = weeks[i - 1].getTime() - weeks[i].getTime();
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
      if (Math.abs(diff - oneWeekMs) < 1000) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  },

  async getLastWorkout(): Promise<WorkoutLog | null> {
    const logs = await this.getAll();
    if (logs.length === 0) return null;
    return logs[logs.length - 1];
  },

  async getMonthActivity(year: number, month: number): Promise<Set<number>> {
    const logs = await this.getAll();
    const days = new Set<number>();

    for (const log of logs) {
      const date = new Date(log.completedAt);
      if (date.getFullYear() === year && date.getMonth() === month) {
        days.add(date.getDate());
      }
    }

    return days;
  },
};
