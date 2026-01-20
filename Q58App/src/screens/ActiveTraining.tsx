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

// Som de alarme alto e chamativo
const ALARM_SOUND_URL = 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg';

interface ActiveTrainingProps {
  trainingId: string;
  onGoBack: () => void;
}

type WorkoutPhase = 'exercise' | 'resting' | 'finished';

export const ActiveTraining: React.FC<ActiveTrainingProps> = ({
  trainingId,
  onGoBack,
}) => {
  const [training, setTraining] = useState<Training | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [phase, setPhase] = useState<WorkoutPhase>('exercise');
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [setTimeLeft, setSetTimeLeft] = useState(0);
  const [isSetTimerRunning, setIsSetTimerRunning] = useState(false);
  const [totalSetsCompleted, setTotalSetsCompleted] = useState(0);

  const restTimerRef = useRef<NodeJS.Timeout | null>(null);
  const setTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio player para o som de alarme
  const player = useAudioPlayer(ALARM_SOUND_URL);

  // Load training
  useEffect(() => {
    loadTraining();
    return () => {
      cleanupTimers();
    };
  }, []);

  const loadTraining = async () => {
    const data = await trainingStorage.getById(trainingId);
    setTraining(data);
  };

  const cleanupTimers = () => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    if (setTimerRef.current) clearInterval(setTimerRef.current);
  };

  const triggerNotification = useCallback(async () => {
    // Som de alarme alto - volume máximo
    try {
      player.volume = 1.0;
      player.seekTo(0);
      player.play();
    } catch (e) {
      console.log('Error playing sound:', e);
    }

    // Vibração forte e longa
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 1000, 300, 1000, 300, 1000]);
    } else {
      // iOS - vibração contínua
      Vibration.vibrate();
      setTimeout(() => Vibration.vibrate(), 500);
      setTimeout(() => Vibration.vibrate(), 1000);
      setTimeout(() => Vibration.vibrate(), 1500);
    }

    // Haptic feedback forte
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 400);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 800);
  }, [player]);

  const currentExercise: Exercise | undefined = training?.exercises[currentExerciseIndex];
  const nextExercise: Exercise | undefined = training?.exercises[currentExerciseIndex + 1];
  const totalExercises = training?.exercises.length || 0;
  const totalSets = training?.exercises.reduce((acc, ex) => acc + ex.sets, 0) || 0;

  // Rest timer
  useEffect(() => {
    if (phase === 'resting' && restTimeLeft > 0) {
      restTimerRef.current = setInterval(() => {
        setRestTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(restTimerRef.current!);
            triggerNotification();
            setPhase('exercise');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [phase, restTimeLeft, triggerNotification]);

  // Set duration timer
  useEffect(() => {
    if (isSetTimerRunning && setTimeLeft > 0) {
      setTimerRef.current = setInterval(() => {
        setSetTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(setTimerRef.current!);
            setIsSetTimerRunning(false);
            triggerNotification();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (setTimerRef.current) clearInterval(setTimerRef.current);
    };
  }, [isSetTimerRunning, setTimeLeft, triggerNotification]);

  const startSetTimer = () => {
    if (currentExercise?.setDurationSeconds) {
      setSetTimeLeft(currentExercise.setDurationSeconds);
      setIsSetTimerRunning(true);
    }
  };

  const completeSet = () => {
    if (!currentExercise || !training) return;

    setTotalSetsCompleted((prev) => prev + 1);
    setIsSetTimerRunning(false);

    const isLastSet = currentSet >= currentExercise.sets;
    const isLastExercise = currentExerciseIndex >= training.exercises.length - 1;

    if (isLastSet && isLastExercise) {
      // Treino completo
      setPhase('finished');
      triggerNotification();
    } else if (isLastSet) {
      // Próximo exercício
      setCurrentExerciseIndex((prev) => prev + 1);
      setCurrentSet(1);

      // Inicia descanso se configurado
      if (currentExercise.restSeconds) {
        setRestTimeLeft(currentExercise.restSeconds);
        setPhase('resting');
      }
    } else {
      // Próxima série
      setCurrentSet((prev) => prev + 1);

      // Inicia descanso se configurado
      if (currentExercise.restSeconds) {
        setRestTimeLeft(currentExercise.restSeconds);
        setPhase('resting');
      }
    }
  };

  const skipRest = () => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setRestTimeLeft(0);
    setPhase('exercise');
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

  // Tela de treino finalizado
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
          <Text style={styles.progressText}>
            {totalSetsCompleted}/{totalSets} séries
          </Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {phase === 'resting' ? (
            /* Rest Phase */
            <View style={styles.restContainer}>
              <Text style={styles.restLabel}>DESCANSANDO</Text>
              <Text style={styles.restTimer}>{formatTime(restTimeLeft)}</Text>
              <TouchableOpacity style={styles.skipButton} onPress={skipRest}>
                <Text style={styles.skipButtonText}>Pular Descanso</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Exercise Phase */
            <View style={styles.exerciseContainer}>
              <Text style={styles.exerciseNumber}>
                Exercício {currentExerciseIndex + 1}/{totalExercises}
              </Text>
              <Text style={styles.exerciseName}>{currentExercise.name}</Text>

              <View style={styles.setInfo}>
                <Text style={styles.setLabel}>SÉRIE</Text>
                <Text style={styles.setNumber}>
                  {currentSet}/{currentExercise.sets}
                </Text>
              </View>

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
                {currentExercise.restSeconds && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailValue}>{formatTime(currentExercise.restSeconds)}</Text>
                    <Text style={styles.detailLabel}>descanso</Text>
                  </View>
                )}
              </View>

              {/* Set Duration Timer */}
              {currentExercise.setDurationSeconds && (
                <View style={styles.setTimerContainer}>
                  {isSetTimerRunning ? (
                    <>
                      <Text style={styles.setTimerLabel}>TEMPO DA SÉRIE</Text>
                      <Text style={styles.setTimerValue}>{formatTime(setTimeLeft)}</Text>
                    </>
                  ) : (
                    <TouchableOpacity style={styles.startTimerButton} onPress={startSetTimer}>
                      <Ionicons name="timer-outline" size={20} color={colors.primary} />
                      <Text style={styles.startTimerText}>
                        Iniciar Timer ({formatTime(currentExercise.setDurationSeconds)})
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Next Exercise Preview */}
        {nextExercise && phase === 'exercise' && (
          <View style={styles.nextExerciseContainer}>
            <Text style={styles.nextExerciseLabel}>PRÓXIMO</Text>
            <Text style={styles.nextExerciseName}>{nextExercise.name}</Text>
          </View>
        )}

        {/* Complete Set Button */}
        {phase === 'exercise' && (
          <TouchableOpacity style={styles.completeButton} onPress={completeSet}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.completeButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="checkmark" size={32} color={colors.textPrimary} />
              <Text style={styles.completeButtonText}>Completar Série</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
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
  progressText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  // Rest Phase
  restContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restLabel: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 16,
  },
  restTimer: {
    color: colors.primary,
    fontSize: 72,
    fontWeight: '700',
    marginBottom: 32,
  },
  skipButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  skipButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  // Exercise Phase
  exerciseContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
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
    marginBottom: 24,
  },
  setInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  setLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 8,
  },
  setNumber: {
    color: colors.primary,
    fontSize: 48,
    fontWeight: '700',
  },
  exerciseDetails: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  detailItem: {
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 20,
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
  setTimerContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  setTimerLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 8,
  },
  setTimerValue: {
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: '700',
  },
  startTimerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  startTimerText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  // Next Exercise
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
  // Complete Button
  completeButton: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  completeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 16,
  },
  completeButtonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
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
    marginBottom: 40,
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
