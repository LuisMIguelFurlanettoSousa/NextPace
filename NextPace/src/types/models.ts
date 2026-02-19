export interface Exercise {
  id: string;
  trainingId: string;
  name: string;
  type: 'exercise' | 'rest';
  sets?: number;
  reps?: number;
  weight?: number;
  restSeconds?: number;
  setDurationSeconds?: number;
  durationSeconds?: number;
  position: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Training {
  id: string;
  userId?: string | null;
  name: string;
  description: string;
  exercises: Exercise[];
  defaultRestSeconds: number;
  rounds: number;
  isFavorite: boolean;
  alertSound?: string | null;
  alertSecondsBeforeEnd: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface WorkoutLog {
  id: string;
  userId?: string | null;
  trainingId?: string | null;
  trainingName: string;
  completedAt: string;
  durationSeconds: number;
  setsCompleted: number;
  exercisesCompleted: number;
  roundsCompleted: number;
  createdAt: string;
}

export interface Profile {
  id: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklySummary {
  workouts: number;
  totalSeconds: number;
  totalSets: number;
}
