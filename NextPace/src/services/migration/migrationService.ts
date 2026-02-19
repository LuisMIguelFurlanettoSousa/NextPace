import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateUUID } from '../../utils/uuid';
import { trainingRepository } from '../training/trainingRepository';
import { workoutRepository } from '../workout/workoutRepository';

const MIGRATION_DONE_KEY = '@nextpace_migration_done';
const TRAININGS_KEY = '@nextpace_trainings';
const HISTORY_KEY = '@nextpace_workout_history';

interface LegacyTraining {
  id: string;
  name: string;
  description: string;
  exercises: LegacyExercise[];
  createdAt: string;
  defaultRestSeconds?: number;
  rounds?: number;
  isFavorite?: boolean;
  alertSound?: string;
  alertSecondsBeforeEnd?: number;
}

interface LegacyExercise {
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

interface LegacyWorkoutLog {
  id: string;
  trainingId: string;
  trainingName: string;
  completedAt: string;
  durationSeconds: number;
  setsCompleted: number;
  exercisesCompleted: number;
  roundsCompleted: number;
}

const isLegacyId = (id: string): boolean => {
  // IDs legados são Date.now().toString() (13 dígitos numéricos)
  // ou Date.now()-randomStr para exercícios duplicados
  return /^\d{13}/.test(id);
};

export const migrationService = {
  async isMigrationDone(): Promise<boolean> {
    const done = await AsyncStorage.getItem(MIGRATION_DONE_KEY);
    return done === 'true';
  },

  async hasLegacyData(): Promise<boolean> {
    try {
      const raw = await AsyncStorage.getItem(TRAININGS_KEY);
      if (!raw) return false;

      const trainings: LegacyTraining[] = JSON.parse(raw);
      // Tem dados legados se algum training não tem user_id associado
      // e usa IDs legados (Date.now())
      return trainings.some((t) => isLegacyId(t.id));
    } catch {
      return false;
    }
  },

  async migrate(userId: string): Promise<{ trainings: number; workouts: number }> {
    const alreadyDone = await this.isMigrationDone();
    if (alreadyDone) return { trainings: 0, workouts: 0 };

    let trainingsCount = 0;
    let workoutsCount = 0;

    // Mapa de IDs antigos -> novos (para manter referências)
    const idMap = new Map<string, string>();

    // Migrar trainings
    try {
      const raw = await AsyncStorage.getItem(TRAININGS_KEY);
      const trainings: LegacyTraining[] = raw ? JSON.parse(raw) : [];
      const legacyTrainings = trainings.filter((t) => isLegacyId(t.id));

      for (const legacy of legacyTrainings) {
        const newTrainingId = generateUUID();
        idMap.set(legacy.id, newTrainingId);

        // Criar training no Supabase
        await trainingRepository.create(userId, {
          id: newTrainingId,
          name: legacy.name,
          description: legacy.description ?? '',
          defaultRestSeconds: legacy.defaultRestSeconds ?? 60,
          rounds: legacy.rounds ?? 1,
          isFavorite: legacy.isFavorite ?? false,
          alertSound: legacy.alertSound ?? null,
          alertSecondsBeforeEnd: legacy.alertSecondsBeforeEnd ?? 5,
        });

        // Criar exercícios
        for (let i = 0; i < legacy.exercises.length; i++) {
          const ex = legacy.exercises[i];
          const newExId = generateUUID();
          idMap.set(ex.id, newExId);

          await trainingRepository.upsertExercise({
            id: newExId,
            trainingId: newTrainingId,
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

        trainingsCount++;
      }

      // Atualizar IDs locais para os novos UUIDs
      const updatedTrainings = trainings.map((t) => {
        const newId = idMap.get(t.id);
        if (!newId) return t;

        return {
          ...t,
          id: newId,
          exercises: t.exercises.map((e) => ({
            ...e,
            id: idMap.get(e.id) ?? e.id,
          })),
        };
      });

      await AsyncStorage.setItem(TRAININGS_KEY, JSON.stringify(updatedTrainings));
    } catch (error) {
      console.error('[migration] Erro ao migrar trainings:', error);
    }

    // Migrar workout logs
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      const logs: LegacyWorkoutLog[] = raw ? JSON.parse(raw) : [];
      const legacyLogs = logs.filter((l) => isLegacyId(l.id));

      for (const legacy of legacyLogs) {
        const newLogId = generateUUID();
        const newTrainingId = idMap.get(legacy.trainingId) ?? null;

        await workoutRepository.create(userId, {
          id: newLogId,
          trainingId: newTrainingId,
          trainingName: legacy.trainingName,
          completedAt: legacy.completedAt,
          durationSeconds: legacy.durationSeconds,
          setsCompleted: legacy.setsCompleted,
          exercisesCompleted: legacy.exercisesCompleted,
          roundsCompleted: legacy.roundsCompleted,
        });

        idMap.set(legacy.id, newLogId);
        workoutsCount++;
      }

      // Atualizar IDs locais
      const updatedLogs = logs.map((l) => ({
        ...l,
        id: idMap.get(l.id) ?? l.id,
        trainingId: idMap.get(l.trainingId) ?? l.trainingId,
      }));

      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedLogs));
    } catch (error) {
      console.error('[migration] Erro ao migrar workout logs:', error);
    }

    // Marcar migração como completa
    await AsyncStorage.setItem(MIGRATION_DONE_KEY, 'true');

    return { trainings: trainingsCount, workouts: workoutsCount };
  },
};
