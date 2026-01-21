import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';
import { colors } from '../theme/colors';
import { trainingStorage, Training, Exercise, formatTime } from '../services/trainingStorage';

const ALARM_SOUND_URL = 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg';

interface ActiveTrainingProps {
  trainingId: string;
  onGoBack: () => void;
  onGoToTrainingDetail: () => void;
}

type WorkoutPhase = 'working' | 'resting' | 'finished';

export const ActiveTraining: React.FC<ActiveTrainingProps> = ({
  trainingId,
  onGoBack,
  onGoToTrainingDetail,
}) => {
  const [training, setTraining] = useState<Training | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [phase, setPhase] = useState<WorkoutPhase>('working');
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalSetsCompleted, setTotalSetsCompleted] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const player = useAudioPlayer(ALARM_SOUND_URL);

  useEffect(() => {
    loadTraining();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const loadTraining = async () => {
    const data = await trainingStorage.getById(trainingId);
    setTraining(data);
    if (data && data.exercises.length > 0) {
      const firstExercise = data.exercises[0];
      if (firstExercise.setDurationSeconds) {
        setTimeLeft(firstExercise.setDurationSeconds);
      }
    }
  };

  const triggerNotification = useCallback(async () => {
    try {
      player.volume = 1.0;
      player.seekTo(0);
      player.play();
    } catch (e) {
      console.log('Error playing sound:', e);
    }

    // Haptic feedback - multiple pulses for attention
    if (Platform.OS === 'ios') {
      // iOS: use expo-haptics (Taptic Engine)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setTimeout(async () => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }, 300);
      setTimeout(async () => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }, 600);
    } else {
      // Android: use Vibration pattern
      Vibration.vibrate([0, 400, 200, 400]);
    }
  }, [player]);

  const currentExercise: Exercise | undefined = training?.exercises[currentExerciseIndex];
  const nextExercise: Exercise | undefined = training?.exercises[currentExerciseIndex + 1];
  const totalExercises = training?.exercises.length || 0;
  const totalSets = training?.exercises.reduce((acc, ex) => acc + ex.sets, 0) || 0;

  // Calculate total training duration in seconds
  const totalDuration = training?.exercises.reduce((total, ex) => {
    const workTime = (ex.setDurationSeconds || 0) * ex.sets;
    const restTime = (ex.restSeconds || 0) * (ex.sets - 1); // rest between sets
    return total + workTime + restTime;
  }, 0) || 0;

  // Calculate elapsed time based on workout progress (not real time)
  const elapsedTime = (() => {
    if (!training) return 0;

    let elapsed = 0;

    // Add time from fully completed exercises
    for (let i = 0; i < currentExerciseIndex; i++) {
      const ex = training.exercises[i];
      elapsed += (ex.setDurationSeconds || 0) * ex.sets;
      elapsed += (ex.restSeconds || 0) * (ex.sets - 1);
    }

    // Add time from current exercise
    if (currentExercise) {
      const setDuration = currentExercise.setDurationSeconds || 0;
      const restDuration = currentExercise.restSeconds || 0;

      if (phase === 'working') {
        // In working phase: currentSet is the set we're doing
        // Completed sets = currentSet - 1
        // Completed rests = currentSet - 1 (rest after each completed set)
        const setsCompleted = currentSet - 1;
        elapsed += setDuration * setsCompleted;
        elapsed += restDuration * setsCompleted;
        // Add progress in current set
        elapsed += setDuration - timeLeft;
      } else if (phase === 'resting') {
        // In resting phase: currentSet was already incremented to the next set
        // Completed sets = currentSet - 1
        // Completed rests = currentSet - 2 (we're currently in a rest)
        const setsCompleted = currentSet - 1;
        const restsCompleted = Math.max(0, currentSet - 2);
        elapsed += setDuration * setsCompleted;
        elapsed += restDuration * restsCompleted;
        // Add progress in current rest
        elapsed += restDuration - timeLeft;
      }
    }

    return elapsed;
  })();

  // Smart duration format - only shows hours/min when needed
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };

  // Move to next set or exercise
  const advanceWorkout = useCallback(() => {
    if (!currentExercise || !training) return;

    setTotalSetsCompleted((prev) => prev + 1);

    const isLastSet = currentSet >= currentExercise.sets;
    const isLastExercise = currentExerciseIndex >= training.exercises.length - 1;

    if (isLastSet && isLastExercise) {
      // Training complete
      setPhase('finished');
      triggerNotification();
    } else if (isLastSet) {
      // Next exercise
      const nextEx = training.exercises[currentExerciseIndex + 1];
      setCurrentExerciseIndex((prev) => prev + 1);
      setCurrentSet(1);

      // Start rest if configured, otherwise go straight to next exercise
      if (currentExercise.restSeconds) {
        setTimeLeft(currentExercise.restSeconds);
        setPhase('resting');
        triggerNotification();
      } else if (nextEx?.setDurationSeconds) {
        setTimeLeft(nextEx.setDurationSeconds);
        setPhase('working');
      }
    } else {
      // Next set
      setCurrentSet((prev) => prev + 1);

      // Start rest if configured
      if (currentExercise.restSeconds) {
        setTimeLeft(currentExercise.restSeconds);
        setPhase('resting');
        triggerNotification();
      } else if (currentExercise.setDurationSeconds) {
        setTimeLeft(currentExercise.setDurationSeconds);
      }
    }
  }, [currentExercise, currentSet, currentExerciseIndex, training, triggerNotification]);

  // Start next working phase after rest
  const startNextWorkingPhase = useCallback(() => {
    if (!training) return;

    const exercise = training.exercises[currentExerciseIndex];
    if (exercise?.setDurationSeconds) {
      setTimeLeft(exercise.setDurationSeconds);
    }
    setPhase('working');
    triggerNotification();
  }, [currentExerciseIndex, training, triggerNotification]);

  // Main timer effect
  useEffect(() => {
    if (isPaused || phase === 'finished' || timeLeft <= 0) {
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);

          // Timer ended - advance to next phase
          if (phase === 'working') {
            // Set finished - go to rest or next set
            setTimeout(() => advanceWorkout(), 100);
          } else if (phase === 'resting') {
            // Rest finished - start next working phase
            setTimeout(() => startNextWorkingPhase(), 100);
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, isPaused, timeLeft, advanceWorkout, startNextWorkingPhase]);

  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const skipPhase = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(0);

    if (phase === 'working') {
      advanceWorkout();
    } else if (phase === 'resting') {
      startNextWorkingPhase();
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancelar Treino',
      'Tem certeza que deseja cancelar o treino?',
      [
        { text: 'Não', style: 'cancel' },
        { text: 'Sim', style: 'destructive', onPress: onGoBack },
      ]
    );
  };

  if (!training || !currentExercise) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  // No timer configured - show message
  if (!currentExercise.setDurationSeconds && phase === 'working') {
    return (
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.container}>
          <StatusBar style="light" />
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{training.name}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.noTimerContainer}>
            <Ionicons name="timer-outline" size={64} color={colors.textMuted} />
            <Text style={styles.noTimerTitle}>Tempo não configurado</Text>
            <Text style={styles.noTimerText}>
              Configure o "Tempo da série" no exercício "{currentExercise.name}" para usar o modo automático.
            </Text>
            <TouchableOpacity style={styles.backButton} onPress={onGoToTrainingDetail}>
              <Text style={styles.backButtonText}>Voltar e Configurar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }

  // Finished screen
  if (phase === 'finished') {
    return (
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.finishedContainer}>
          <View style={styles.finishedIconContainer}>
            <Ionicons name="trophy" size={80} color={colors.primary} />
          </View>
          <Text style={styles.finishedTitle}>Treino Completo!</Text>
          <Text style={styles.finishedSubtitle}>{training.name}</Text>
          <Text style={styles.finishedStats}>
            {totalSetsCompleted} séries • {totalExercises} exercícios
          </Text>
          <Text style={styles.finishedDuration}>
            Tempo total: {formatDuration(elapsedTime)}
          </Text>
          <TouchableOpacity style={styles.finishButton} onPress={onGoBack}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.finishButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.finishButtonText}>Finalizar</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const progress = totalSets > 0 ? (totalSetsCompleted / totalSets) * 100 : 0;
  const isWorking = phase === 'working';

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.container}>
        <StatusBar style="light" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{training.name}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              {totalSetsCompleted}/{totalSets} séries
            </Text>
            <Text style={styles.durationText}>
              {formatDuration(elapsedTime)} / {formatDuration(totalDuration)}
            </Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Phase Label */}
          <View style={[styles.phaseLabel, isWorking ? styles.workingLabel : styles.restingLabel]}>
            <Text style={styles.phaseLabelText}>
              {isWorking ? 'EXECUTANDO' : 'DESCANSANDO'}
            </Text>
          </View>

          {/* Exercise Info */}
          <Text style={styles.exerciseNumber}>
            Exercício {currentExerciseIndex + 1}/{totalExercises}
          </Text>
          <Text style={styles.exerciseName}>{currentExercise.name}</Text>

          {/* Set Info */}
          <View style={styles.setInfo}>
            <Text style={styles.setLabel}>SÉRIE</Text>
            <Text style={styles.setNumber}>
              {currentSet}/{currentExercise.sets}
            </Text>
          </View>

          {/* Timer */}
          <View style={styles.timerContainer}>
            <Text style={[styles.timer, isPaused && styles.timerPaused]}>
              {formatTime(timeLeft)}
            </Text>
            {isPaused && <Text style={styles.pausedText}>PAUSADO</Text>}
          </View>

          {/* Exercise Details */}
          <View style={styles.exerciseDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailValue}>{currentExercise.reps}</Text>
              <Text style={styles.detailLabel}>repetições</Text>
            </View>
            {currentExercise.weight && (
              <View style={styles.detailItem}>
                <Text style={styles.detailValue}>{currentExercise.weight}kg</Text>
                <Text style={styles.detailLabel}>peso</Text>
              </View>
            )}
          </View>
        </View>

        {/* Next Exercise Preview */}
        {nextExercise && (
          <View style={styles.nextExerciseContainer}>
            <Text style={styles.nextExerciseLabel}>PRÓXIMO</Text>
            <Text style={styles.nextExerciseName}>{nextExercise.name}</Text>
          </View>
        )}

        {/* Control Buttons */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={skipPhase}>
            <Ionicons name="play-forward" size={24} color={colors.textSecondary} />
            <Text style={styles.skipButtonText}>Pular</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pauseButton} onPress={togglePause}>
            <LinearGradient
              colors={isPaused ? [colors.primary, colors.primaryDark] : [colors.cardBackground, colors.cardBackground]}
              style={styles.pauseButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name={isPaused ? 'play' : 'pause'}
                size={32}
                color={isPaused ? colors.textPrimary : colors.textSecondary}
              />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.controlSpacer} />
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.cardBackground,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  durationText: {
    color: colors.textMuted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  phaseLabel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  workingLabel: {
    backgroundColor: 'rgba(255, 59, 92, 0.2)',
  },
  restingLabel: {
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
  },
  phaseLabelText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  exerciseNumber: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  exerciseName: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  setInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  setLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 4,
  },
  setNumber: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: '700',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  timer: {
    color: colors.textPrimary,
    fontSize: 80,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timerPaused: {
    opacity: 0.5,
  },
  pausedText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  exerciseDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  detailValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  nextExerciseContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  nextExerciseLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  nextExerciseName: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingBottom: 50,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  skipButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  pauseButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
  },
  pauseButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 35,
  },
  controlSpacer: {
    width: 100,
  },
  // No timer configured
  noTimerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  noTimerTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
  },
  noTimerText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  backButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  // Finished
  finishedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  finishedIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  finishedTitle: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  finishedSubtitle: {
    color: colors.textSecondary,
    fontSize: 18,
    marginBottom: 8,
  },
  finishedStats: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 8,
  },
  finishedDuration: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 40,
    fontVariant: ['tabular-nums'],
  },
  finishButton: {
    width: '100%',
  },
  finishButtonGradient: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  finishButtonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
});
