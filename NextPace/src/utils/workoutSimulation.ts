import { Training } from '../services/trainingStorage';

export interface WorkoutSnapshot {
  exerciseIndex: number;
  set: number;
  phase: 'working' | 'resting' | 'finished';
  timeLeft: number;
  totalSetsCompleted: number;
  round: number;
  isDefaultRest: boolean;
}

/**
 * Simula a progressão do treino para um dado número de segundos decorridos.
 * Função pura — replica a lógica de advanceWorkout + startNextWorkingPhase
 * para calcular o estado correto após o app ficar em background.
 */
export function simulateElapsedTime(
  training: Training,
  snapshot: WorkoutSnapshot,
  elapsedSeconds: number,
): WorkoutSnapshot {
  const state = { ...snapshot };
  let remaining = elapsedSeconds;
  const exercises = training.exercises;
  const totalRounds = training.rounds || 1;
  const defaultRest = training.defaultRestSeconds || 0;

  while (remaining > 0 && state.phase !== 'finished') {
    // Tempo restante na fase atual é suficiente — consome parcialmente
    if (remaining < state.timeLeft) {
      state.timeLeft -= remaining;
      remaining = 0;
      break;
    }

    // Fase completa — consome o tempo e transiciona
    remaining -= state.timeLeft;
    state.timeLeft = 0;

    if (state.phase === 'working') {
      advanceWorkoutSim(state, exercises, totalRounds, defaultRest);
    } else if (state.phase === 'resting') {
      startNextWorkingPhaseSim(state, exercises, totalRounds);
    }
  }

  return state;
}

/** Replica a lógica de advanceWorkout */
function advanceWorkoutSim(
  state: WorkoutSnapshot,
  exercises: Training['exercises'],
  totalRounds: number,
  defaultRest: number,
): void {
  const exercise = exercises[state.exerciseIndex];
  if (!exercise) { state.phase = 'finished'; return; }

  if (exercise.type !== 'rest') {
    state.totalSetsCompleted += 1;
  }

  const exerciseSets = exercise.type === 'rest' ? 1 : (exercise.sets || 1);
  const isLastSet = state.set >= exerciseSets;
  const isLastExercise = state.exerciseIndex >= exercises.length - 1;

  if (isLastSet && isLastExercise) {
    if (state.round < totalRounds) {
      state.round += 1;
      state.exerciseIndex = 0;
      state.set = 1;
      const firstEx = exercises[0];
      if (firstEx?.type === 'rest') {
        state.isDefaultRest = false;
        state.timeLeft = firstEx.durationSeconds || 0;
        state.phase = 'resting';
      } else if (defaultRest) {
        state.isDefaultRest = true;
        state.timeLeft = defaultRest;
        state.phase = 'resting';
      } else {
        state.isDefaultRest = false;
        state.timeLeft = firstEx?.setDurationSeconds || 0;
        state.phase = 'working';
      }
    } else {
      state.phase = 'finished';
    }

  } else if (isLastSet) {
    const nextEx = exercises[state.exerciseIndex + 1];
    state.exerciseIndex += 1;
    state.set = 1;

    if (nextEx?.type === 'rest') {
      state.isDefaultRest = false;
      state.timeLeft = nextEx.durationSeconds || 0;
      state.phase = 'resting';
    } else if (exercise.type !== 'rest' && defaultRest) {
      state.isDefaultRest = true;
      state.timeLeft = defaultRest;
      state.phase = 'resting';
    } else {
      state.isDefaultRest = false;
      state.timeLeft = nextEx?.setDurationSeconds || 0;
      state.phase = 'working';
    }

  } else {
    // Próximo set
    state.set += 1;
    state.isDefaultRest = false;

    if (exercise.restSeconds) {
      state.timeLeft = exercise.restSeconds;
      state.phase = 'resting';
    } else {
      state.timeLeft = exercise.setDurationSeconds || 0;
      // Fase continua 'working'
    }
  }
}

/** Replica a lógica de startNextWorkingPhase */
function startNextWorkingPhaseSim(
  state: WorkoutSnapshot,
  exercises: Training['exercises'],
  totalRounds: number,
): void {
  state.isDefaultRest = false;
  const exercise = exercises[state.exerciseIndex];

  if (exercise?.type === 'rest') {
    const isLastExercise = state.exerciseIndex >= exercises.length - 1;
    if (isLastExercise) {
      if (state.round < totalRounds) {
        state.round += 1;
        state.exerciseIndex = 0;
        state.set = 1;
        const firstEx = exercises[0];
        if (firstEx?.type === 'rest') {
          state.timeLeft = firstEx.durationSeconds || 0;
          state.phase = 'resting';
        } else {
          state.timeLeft = firstEx?.setDurationSeconds || 0;
          state.phase = 'working';
        }
      } else {
        state.phase = 'finished';
      }
    } else {
      const nextEx = exercises[state.exerciseIndex + 1];
      state.exerciseIndex += 1;
      state.set = 1;

      if (nextEx?.type === 'rest') {
        state.timeLeft = nextEx.durationSeconds || 0;
        state.phase = 'resting';
      } else {
        state.timeLeft = nextEx?.setDurationSeconds || 0;
        state.phase = 'working';
      }
    }
    return;
  }

  // Descanso normal entre sets terminou — volta para working
  state.timeLeft = exercise?.setDurationSeconds || 0;
  state.phase = 'working';
}
