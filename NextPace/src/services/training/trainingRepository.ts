import { supabase } from '../supabase';
import type { Training, Exercise } from '../../types/models';

const mapTrainingRow = (row: any, exercises: any[] = []): Training => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  description: row.description,
  defaultRestSeconds: row.default_rest_seconds,
  rounds: row.rounds,
  isFavorite: row.is_favorite,
  alertSound: row.alert_sound,
  alertSecondsBeforeEnd: row.alert_seconds_before_end,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
  exercises: exercises
    .filter((e: any) => !e.deleted_at)
    .sort((a: any, b: any) => a.position - b.position)
    .map(mapExerciseRow),
});

const mapExerciseRow = (row: any): Exercise => ({
  id: row.id,
  trainingId: row.training_id,
  name: row.name,
  type: row.type,
  sets: row.sets,
  reps: row.reps,
  weight: row.weight,
  restSeconds: row.rest_seconds,
  setDurationSeconds: row.set_duration_seconds,
  durationSeconds: row.duration_seconds,
  position: row.position,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

export const trainingRepository = {
  async getAll(userId: string): Promise<Training[]> {
    const { data: trainings, error } = await supabase
      .from('trainings')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!trainings?.length) return [];

    const trainingIds = trainings.map((t) => t.id);
    const { data: exercises } = await supabase
      .from('exercises')
      .select('*')
      .in('training_id', trainingIds)
      .is('deleted_at', null);

    const exercisesByTraining = (exercises ?? []).reduce((acc: Record<string, any[]>, ex) => {
      if (!acc[ex.training_id]) acc[ex.training_id] = [];
      acc[ex.training_id].push(ex);
      return acc;
    }, {});

    return trainings.map((t) => mapTrainingRow(t, exercisesByTraining[t.id] ?? []));
  },

  async getById(userId: string, trainingId: string): Promise<Training | null> {
    const { data: training, error } = await supabase
      .from('trainings')
      .select('*')
      .eq('id', trainingId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error || !training) return null;

    const { data: exercises } = await supabase
      .from('exercises')
      .select('*')
      .eq('training_id', trainingId)
      .is('deleted_at', null)
      .order('position');

    return mapTrainingRow(training, exercises ?? []);
  },

  async create(userId: string, training: Omit<Training, 'userId' | 'exercises' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Training> {
    const { data, error } = await supabase
      .from('trainings')
      .insert({
        id: training.id,
        user_id: userId,
        name: training.name,
        description: training.description,
        default_rest_seconds: training.defaultRestSeconds,
        rounds: training.rounds,
        is_favorite: training.isFavorite,
        alert_sound: training.alertSound,
        alert_seconds_before_end: training.alertSecondsBeforeEnd,
      })
      .select()
      .single();

    if (error) throw error;
    return mapTrainingRow(data);
  },

  async update(userId: string, trainingId: string, updates: Partial<Training>): Promise<Training | null> {
    const updateData: Record<string, any> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.defaultRestSeconds !== undefined) updateData.default_rest_seconds = updates.defaultRestSeconds;
    if (updates.rounds !== undefined) updateData.rounds = updates.rounds;
    if (updates.isFavorite !== undefined) updateData.is_favorite = updates.isFavorite;
    if (updates.alertSound !== undefined) updateData.alert_sound = updates.alertSound;
    if (updates.alertSecondsBeforeEnd !== undefined) updateData.alert_seconds_before_end = updates.alertSecondsBeforeEnd;

    const { data, error } = await supabase
      .from('trainings')
      .update(updateData)
      .eq('id', trainingId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data ? mapTrainingRow(data) : null;
  },

  async softDelete(userId: string, trainingId: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('trainings')
      .update({ deleted_at: now })
      .eq('id', trainingId)
      .eq('user_id', userId);

    if (error) throw error;

    await supabase
      .from('exercises')
      .update({ deleted_at: now })
      .eq('training_id', trainingId);
  },

  async upsertExercise(exercise: Omit<Exercise, 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Exercise> {
    const { data, error } = await supabase
      .from('exercises')
      .upsert({
        id: exercise.id,
        training_id: exercise.trainingId,
        name: exercise.name,
        type: exercise.type,
        sets: exercise.sets ?? null,
        reps: exercise.reps ?? null,
        weight: exercise.weight ?? null,
        rest_seconds: exercise.restSeconds ?? null,
        set_duration_seconds: exercise.setDurationSeconds ?? null,
        duration_seconds: exercise.durationSeconds ?? null,
        position: exercise.position,
      })
      .select()
      .single();

    if (error) throw error;
    return mapExerciseRow(data);
  },

  async softDeleteExercise(exerciseId: string): Promise<void> {
    const { error } = await supabase
      .from('exercises')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', exerciseId);

    if (error) throw error;
  },

  async getUpdatedAfter(userId: string, since: string): Promise<Training[]> {
    const { data: trainings } = await supabase
      .from('trainings')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', since);

    if (!trainings?.length) return [];

    const trainingIds = trainings.map((t) => t.id);
    const { data: exercises } = await supabase
      .from('exercises')
      .select('*')
      .in('training_id', trainingIds);

    const exercisesByTraining = (exercises ?? []).reduce((acc: Record<string, any[]>, ex) => {
      if (!acc[ex.training_id]) acc[ex.training_id] = [];
      acc[ex.training_id].push(ex);
      return acc;
    }, {});

    return trainings.map((t) => mapTrainingRow(t, exercisesByTraining[t.id] ?? []));
  },
};
