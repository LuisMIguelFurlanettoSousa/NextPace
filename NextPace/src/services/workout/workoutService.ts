import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateUUID } from '../../utils/uuid';

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
const SYNC_QUEUE_KEY = '@nextpace_sync_queue';

const startOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

const enqueueSync = async (payload: any): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    const queue: any[] = raw ? JSON.parse(raw) : [];
    queue.push({
      id: generateUUID(),
      type: 'workout_create',
      payload,
      timestamp: new Date().toISOString(),
    });
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[workoutService] Erro ao enfileirar sync:', error);
  }
};

export const workoutService = {
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
        id: generateUUID(),
      };
      logs.push(newLog);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(logs));

      await enqueueSync(newLog);

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

    const weekSet = new Set<string>();
    for (const log of logs) {
      const ws = startOfWeek(new Date(log.completedAt));
      weekSet.add(ws.toISOString());
    }

    const weeks = Array.from(weekSet)
      .map((w) => new Date(w))
      .sort((a, b) => b.getTime() - a.getTime());

    if (weeks.length === 0) return 0;

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
