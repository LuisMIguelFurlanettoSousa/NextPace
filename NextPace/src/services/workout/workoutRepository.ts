import { supabase } from '../supabase';
import type { WorkoutLog } from '../../types/models';

const mapRow = (row: any): WorkoutLog => ({
  id: row.id,
  userId: row.user_id,
  trainingId: row.training_id,
  trainingName: row.training_name,
  completedAt: row.completed_at,
  durationSeconds: row.duration_seconds,
  setsCompleted: row.sets_completed,
  exercisesCompleted: row.exercises_completed,
  roundsCompleted: row.rounds_completed,
  createdAt: row.created_at,
});

export const workoutRepository = {
  async getAll(userId: string): Promise<WorkoutLog[]> {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async create(userId: string, log: Omit<WorkoutLog, 'userId' | 'createdAt'>): Promise<WorkoutLog> {
    const { data, error } = await supabase
      .from('workout_logs')
      .insert({
        id: log.id,
        user_id: userId,
        training_id: log.trainingId,
        training_name: log.trainingName,
        completed_at: log.completedAt,
        duration_seconds: log.durationSeconds,
        sets_completed: log.setsCompleted,
        exercises_completed: log.exercisesCompleted,
        rounds_completed: log.roundsCompleted,
      })
      .select()
      .single();

    if (error) throw error;
    return mapRow(data);
  },

  async getAfter(userId: string, since: string): Promise<WorkoutLog[]> {
    const { data } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .gt('created_at', since);

    return (data ?? []).map(mapRow);
  },
};
