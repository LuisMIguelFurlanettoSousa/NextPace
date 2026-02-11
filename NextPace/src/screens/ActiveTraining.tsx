import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';
import { useKeepAwake } from 'expo-keep-awake';
import { colors } from '../theme/colors';
import { trainingStorage, Training, Exercise } from '../services/trainingStorage';
import { workoutHistoryStorage } from '../services/workoutHistoryStorage';
import { CircularTimer } from '../components/CircularTimer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSoundSource } from '../constants/sounds';

interface ActiveTrainingProps {
  trainingId: string;
  onGoBack: () => void;
  onGoToTrainingDetail: () => void;
}

type WorkoutPhase = 'countdown' | 'working' | 'resting' | 'finished';

export const ActiveTraining: React.FC<ActiveTrainingProps> = ({
  trainingId,
  onGoBack,
  onGoToTrainingDetail,
}) => {
  useKeepAwake();
  const insets = useSafeAreaInsets();

  const [training, setTraining] = useState<Training | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [phase, setPhase] = useState<WorkoutPhase>('countdown');
  const [countdownValue, setCountdownValue] = useState(3);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalSetsCompleted, setTotalSetsCompleted] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [isDefaultRest, setIsDefaultRest] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tapTimestamps = useRef<number[]>([]);
  const warningPlayedRef = useRef(false);
  const workoutSavedRef = useRef(false);
  const isSkippingRef = useRef(false);
  const player = useAudioPlayer(getSoundSource(training?.alertSound));

  // Triple-tap to pause detection
  const handleScreenTap = useCallback(() => {
    const now = Date.now();
    tapTimestamps.current.push(now);

    // Keep only taps from the last 600ms
    tapTimestamps.current = tapTimestamps.current.filter(
      (timestamp) => now - timestamp < 600
    );

    // If 3 taps within 600ms, toggle pause
    if (tapTimestamps.current.length >= 3) {
      setIsPaused((prev) => !prev);
      tapTimestamps.current = [];
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, []);

  useEffect(() => {
    loadTraining();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  // Countdown 3-2-1 antes de iniciar o treino
  useEffect(() => {
    if (phase !== 'countdown' || !training) return;

    countdownTimerRef.current = setInterval(() => {
      setCountdownValue((prev) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current!);
          // Se primeiro exercício é rest card, vai direto para resting
          const firstExercise = training.exercises[0];
          if (firstExercise?.type === 'rest') {
            setPhase('resting');
          } else {
            setPhase('working');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [phase, training]);

  const loadTraining = async () => {
    const data = await trainingStorage.getById(trainingId);
    setTraining(data);
    if (data && data.exercises.length > 0) {
      const firstExercise = data.exercises[0];
      // Prepara o timeLeft para quando o countdown terminar
      if (firstExercise.type === 'rest') {
        setTimeLeft(firstExercise.durationSeconds || 0);
      } else if (firstExercise.setDurationSeconds) {
        setTimeLeft(firstExercise.setDurationSeconds);
      }
    }
  };

  // Alarme sonoro a 5 segundos do fim
  const triggerWarning = useCallback(async () => {
    try {
      player.volume = 1.0;
      player.seekTo(0);
      player.play();
    } catch (e) {
      console.log('Error playing warning:', e);
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [player]);

  const currentExercise: Exercise | undefined = training?.exercises[currentExerciseIndex];
  const nextExercise: Exercise | undefined = training?.exercises[currentExerciseIndex + 1];
  // Conta apenas exercícios reais (sem rest cards)
  const totalExercises = training?.exercises.filter(ex => ex.type !== 'rest').length || 0;
  // Calcula o índice do exercício atual (sem contar rest cards)
  const currentExerciseNumber = training?.exercises.slice(0, currentExerciseIndex + 1).filter(ex => ex.type !== 'rest').length || 0;
  // Conta sets apenas de exercícios reais
  const totalSets = training?.exercises.filter(ex => ex.type !== 'rest').reduce((acc, ex) => acc + (ex.sets || 1), 0) || 0;

  // Calcula duração de um exercício/item individual
  const getItemDuration = (ex: Exercise, defaultRest: number, nextEx?: Exercise): number => {
    if (ex.type === 'rest') {
      return ex.durationSeconds || 0;
    }
    const sets = ex.sets || 1;
    let duration = (ex.setDurationSeconds || 0) * sets;
    duration += (ex.restSeconds || 0) * Math.max(0, sets - 1);
    // Descanso padrão após exercício (se há próximo e não é rest card)
    if (defaultRest && nextEx && nextEx.type !== 'rest') {
      duration += defaultRest;
    }
    return duration;
  };

  // Duração total de 1 round
  const singleRoundDuration = (() => {
    if (!training) return 0;
    const exercises = training.exercises;
    let total = 0;
    for (let i = 0; i < exercises.length; i++) {
      total += getItemDuration(exercises[i], training.defaultRestSeconds || 0, exercises[i + 1]);
    }
    // Descanso padrão entre rounds (se há mais de 1 round e último item não é rest)
    if ((training.rounds || 1) > 1 && exercises.length > 0 && exercises[exercises.length - 1].type !== 'rest' && training.defaultRestSeconds) {
      total += training.defaultRestSeconds;
    }
    return total;
  })();

  const totalRounds = training?.rounds || 1;
  const totalDuration = singleRoundDuration;

  // Tempo decorrido baseado no progresso real do treino
  const elapsedTime = (() => {
    if (!training) return 0;
    const exercises = training.exercises;
    const defaultRest = training.defaultRestSeconds || 0;
    let elapsed = 0;

    // Rounds completos
    const completedRounds = currentRound - 1;
    elapsed += singleRoundDuration * completedRounds;

    // Exercícios completos no round atual
    for (let i = 0; i < currentExerciseIndex; i++) {
      elapsed += getItemDuration(exercises[i], defaultRest, exercises[i + 1]);
    }

    // Exercício atual
    const ex = currentExercise;
    if (!ex) return elapsed;

    if (ex.type === 'rest') {
      // Rest card: tempo total - tempo restante
      const total = ex.durationSeconds || 0;
      elapsed += total - timeLeft;
    } else if (isDefaultRest) {
      // Descanso padrão entre exercícios: o exercício anterior já foi contabilizado
      // O currentExerciseIndex já avançou, então o exercício anterior está no loop acima
      // Só falta o progresso do descanso padrão atual
      elapsed += defaultRest - timeLeft;
    } else if (phase === 'working') {
      const setDuration = ex.setDurationSeconds || 0;
      const restBetweenSets = ex.restSeconds || 0;
      // Sets completos + descansos entre sets completos
      const setsCompleted = currentSet - 1;
      elapsed += setDuration * setsCompleted;
      elapsed += restBetweenSets * setsCompleted;
      // Progresso do set atual
      elapsed += setDuration - timeLeft;
    } else if (phase === 'resting') {
      const setDuration = ex.setDurationSeconds || 0;
      const restBetweenSets = ex.restSeconds || 0;
      // Sets completos (currentSet já avançou para o próximo)
      const setsCompleted = currentSet - 1;
      const restsCompleted = Math.max(0, currentSet - 2);
      elapsed += setDuration * setsCompleted;
      elapsed += restBetweenSets * restsCompleted;
      // Progresso do descanso atual
      elapsed += restBetweenSets - timeLeft;
    }

    return Math.max(0, elapsed);
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

  // Para o som do alerta ao trocar de fase
  const stopAlert = useCallback(() => {
    try { player.pause(); } catch (_) {}
  }, [player]);

  // Move to next set or exercise
  const advanceWorkout = useCallback(() => {
    if (!currentExercise || !training) return;
    stopAlert();

    // Se for um card de descanso, não conta como set completado
    if (currentExercise.type !== 'rest') {
      setTotalSetsCompleted((prev) => prev + 1);
    }

    const exerciseSets = currentExercise.type === 'rest' ? 1 : (currentExercise.sets || 1);
    const isLastSet = currentSet >= exerciseSets;
    const isLastExercise = currentExerciseIndex >= training.exercises.length - 1;

    if (isLastSet && isLastExercise) {
      // Verifica se há mais rounds
      if (currentRound < (training.rounds || 1)) {
        setCurrentRound((prev) => prev + 1);
        setCurrentExerciseIndex(0);
        setCurrentSet(1);
        const firstEx = training.exercises[0];
        if (firstEx?.type === 'rest') {
          setIsDefaultRest(false);
          setTimeLeft(firstEx.durationSeconds || 0);
          setPhase('resting');
        } else if (training.defaultRestSeconds) {
          setIsDefaultRest(true);
          setTimeLeft(training.defaultRestSeconds);
          setPhase('resting');
        } else {
          setIsDefaultRest(false);
          if (firstEx?.setDurationSeconds) {
            setTimeLeft(firstEx.setDurationSeconds);
          }
          setPhase('working');
        }

      } else {
        setPhase('finished');
      }
    } else if (isLastSet) {
      const nextEx = training.exercises[currentExerciseIndex + 1];
      setCurrentExerciseIndex((prev) => prev + 1);
      setCurrentSet(1);

      if (nextEx?.type === 'rest') {
        setIsDefaultRest(false);
        setTimeLeft(nextEx.durationSeconds || 0);
        setPhase('resting');

      } else if (currentExercise.type !== 'rest' && training.defaultRestSeconds) {
        setIsDefaultRest(true);
        setTimeLeft(training.defaultRestSeconds);
        setPhase('resting');

      } else {
        setIsDefaultRest(false);
        if (nextEx?.setDurationSeconds) {
          setTimeLeft(nextEx.setDurationSeconds);
        }
        setPhase('working');
      }
    } else {
      // Next set
      setCurrentSet((prev) => prev + 1);
      setIsDefaultRest(false);

      if (currentExercise.restSeconds) {
        setTimeLeft(currentExercise.restSeconds);
        setPhase('resting');

      } else if (currentExercise.setDurationSeconds) {
        setTimeLeft(currentExercise.setDurationSeconds);
      }
    }
  }, [currentExercise, currentSet, currentExerciseIndex, training, currentRound, stopAlert]);

  // Start next working phase after rest
  const startNextWorkingPhase = useCallback(() => {
    if (!training) return;
    stopAlert();

    setIsDefaultRest(false);
    const exercise = training.exercises[currentExerciseIndex];

    // Se o exercício atual é um card de descanso, avança para o próximo
    if (exercise?.type === 'rest') {
      const isLastExercise = currentExerciseIndex >= training.exercises.length - 1;
      if (isLastExercise) {
        if (currentRound < (training.rounds || 1)) {
          setCurrentRound((prev) => prev + 1);
          setCurrentExerciseIndex(0);
          setCurrentSet(1);
          const firstEx = training.exercises[0];
          if (firstEx?.type === 'rest') {
            setTimeLeft(firstEx.durationSeconds || 0);
            setPhase('resting');
          } else if (firstEx?.setDurationSeconds) {
            setTimeLeft(firstEx.setDurationSeconds);
            setPhase('working');
          }
  
        } else {
          setPhase('finished');
        }
      } else {
        const nextEx = training.exercises[currentExerciseIndex + 1];
        setCurrentExerciseIndex((prev) => prev + 1);
        setCurrentSet(1);

        if (nextEx?.type === 'rest') {
          setTimeLeft(nextEx.durationSeconds || 0);
          setPhase('resting');
        } else if (nextEx?.setDurationSeconds) {
          setTimeLeft(nextEx.setDurationSeconds);
          setPhase('working');
        }

      }
      return;
    }

    if (exercise?.setDurationSeconds) {
      setTimeLeft(exercise.setDurationSeconds);
    }
    setPhase('working');
  }, [currentExerciseIndex, training, currentRound, stopAlert]);

  // Salvar histórico quando treino finaliza
  useEffect(() => {
    if (phase === 'finished' && training && !workoutSavedRef.current) {
      workoutSavedRef.current = true;
      workoutHistoryStorage.save({
        trainingId: training.id,
        trainingName: training.name,
        completedAt: new Date().toISOString(),
        durationSeconds: elapsedTime,
        setsCompleted: totalSetsCompleted,
        exercisesCompleted: totalExercises,
        roundsCompleted: currentRound,
      });
    }
  }, [phase, training, totalSetsCompleted, totalExercises, currentRound, elapsedTime]);

  // Reset warning flag when phase changes
  useEffect(() => {
    warningPlayedRef.current = false;
  }, [phase, currentSet, currentExerciseIndex, currentRound]);

  // Pause audio when timer is paused
  useEffect(() => {
    if (isPaused) {
      try {
        player.pause();
      } catch (e) {
        // Player may have been destroyed
      }
    }
  }, [isPaused, player]);

  // Main timer effect
  useEffect(() => {
    if (isPaused || phase === 'finished' || phase === 'countdown' || timeLeft <= 0) {
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        // Alerta X segundos antes do fim (configurável, padrão 5s)
        const alertBefore = training?.alertSecondsBeforeEnd ?? 5;
        if (alertBefore > 0 && prev === alertBefore + 1 && !warningPlayedRef.current) {
          warningPlayedRef.current = true;
          triggerWarning();
        }

        if (prev <= 1) {
          clearInterval(timerRef.current!);

          // Timer ended - advance to next phase (skip guard prevents double-advance)
          if (!isSkippingRef.current) {
            if (phase === 'working') {
              setTimeout(() => advanceWorkout(), 100);
            } else if (phase === 'resting') {
              setTimeout(() => startNextWorkingPhase(), 100);
            }
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, isPaused, timeLeft, advanceWorkout, startNextWorkingPhase, triggerWarning]);

  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const skipPhase = () => {
    isSkippingRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    if (phase === 'working') {
      advanceWorkout();
    } else if (phase === 'resting') {
      startNextWorkingPhase();
    }

    // Libera o guard após o React processar as atualizações
    setTimeout(() => { isSkippingRef.current = false; }, 200);
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

  // Tela de countdown 3-2-1
  if (phase === 'countdown') {
    return (
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.countdownContainer}>
          <StatusBar style="light" />
          <Text style={styles.countdownLabel}>PREPARE-SE</Text>
          <Text style={styles.countdownNumber}>{countdownValue}</Text>
          <Text style={styles.countdownTrainingName}>{training.name}</Text>
        </View>
      </LinearGradient>
    );
  }

  // No timer configured - show message (only for regular exercises, not rest cards)
  if (!currentExercise.setDurationSeconds && phase === 'working' && currentExercise.type !== 'rest') {
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
            {totalSetsCompleted} séries • {totalExercises} exercícios{totalRounds > 1 ? ` • ${totalRounds} rounds` : ''}
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

  const totalSetsAllRounds = totalSets * totalRounds;
  const progress = totalSetsAllRounds > 0 ? (totalSetsCompleted / totalSetsAllRounds) * 100 : 0;
  const isWorking = phase === 'working';
  const isRestCard = currentExercise.type === 'rest';
  const showRestCardStyle = isRestCard || isDefaultRest;

  // Check if we have extra info to display (sets, reps, weight) - hide during rest phases
  const hasSetInfo = currentExercise.sets !== undefined && !showRestCardStyle;
  const hasDetailsInfo = (currentExercise.reps !== undefined || currentExercise.weight !== undefined) && !showRestCardStyle;
  const isMinimalMode = !hasSetInfo && !hasDetailsInfo;
  const timerSize = isMinimalMode ? 320 : 260;

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <TouchableWithoutFeedback onPress={handleScreenTap}>
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
                {totalSetsCompleted}/{totalSets * totalRounds} séries{totalRounds > 1 ? ` • Round ${currentRound}/${totalRounds}` : ''}
              </Text>
              <Text style={styles.durationText}>
                {formatDuration(elapsedTime)} / {formatDuration(totalDuration * totalRounds)}
              </Text>
            </View>
          </View>

          {/* Main Content */}
          <View style={[styles.content, isMinimalMode && styles.contentMinimal]}>
          {/* Phase Label */}
          <View style={[
            styles.phaseLabel,
            showRestCardStyle
              ? styles.restCardLabel
              : (isWorking ? styles.workingLabel : styles.restingLabel)
          ]}>
            <Text style={[styles.phaseLabelText, showRestCardStyle && styles.restCardLabelText]}>
              {showRestCardStyle ? 'DESCANSO' : (isWorking ? 'EXECUTANDO' : 'DESCANSANDO')}
            </Text>
          </View>

          {/* Exercise Info */}
          <Text style={styles.exerciseNumber}>
            {showRestCardStyle ? 'Intervalo' : `Exercício ${currentExerciseNumber}/${totalExercises}`}
          </Text>
          <Text style={[
            styles.exerciseName,
            isMinimalMode && styles.exerciseNameMinimal,
            showRestCardStyle && styles.restCardName
          ]}>
            {showRestCardStyle ? 'Descanso' : currentExercise.name}
          </Text>

          {/* Set Info - only show if sets are defined */}
          {hasSetInfo && (
            <View style={styles.setInfo}>
              <Text style={styles.setLabel}>SÉRIE</Text>
              <Text style={styles.setNumber}>
                {currentSet}/{currentExercise.sets}
              </Text>
            </View>
          )}

          {/* Circular Timer */}
          <View style={[styles.timerContainer, isMinimalMode && styles.timerContainerMinimal]}>
            <CircularTimer
              timeLeft={timeLeft}
              totalTime={
                currentExercise.type === 'rest'
                  ? currentExercise.durationSeconds || 0
                  : isWorking
                    ? currentExercise.setDurationSeconds || 0
                    : currentExercise.restSeconds || training?.defaultRestSeconds || 0
              }
              size={timerSize}
              isResting={!isWorking || showRestCardStyle}
              isPaused={isPaused}
            />
            {isPaused && (
              <View style={[styles.pausedOverlay, { borderRadius: timerSize / 2 }]}>
                <Text style={styles.pausedText}>PAUSADO</Text>
              </View>
            )}
          </View>

          {/* Exercise Details - only show if reps or weight are defined */}
          {hasDetailsInfo && (
            <View style={styles.exerciseDetails}>
              {currentExercise.reps !== undefined && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailValue}>{currentExercise.reps}</Text>
                  <Text style={styles.detailLabel}>repetições</Text>
                </View>
              )}
              {currentExercise.weight !== undefined && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailValue}>{currentExercise.weight}kg</Text>
                  <Text style={styles.detailLabel}>peso</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Next Exercise Preview */}
        {(() => {
          if (!training) return null;

          const isLastExercise = currentExerciseIndex >= training.exercises.length - 1;

          // Durante descanso padrão: próximo é o exercício que vai começar
          if (isDefaultRest) {
            return (
              <View style={styles.nextExerciseContainer}>
                <Text style={styles.nextExerciseLabel}>PRÓXIMO</Text>
                <Text style={styles.nextExerciseName}>{currentExercise.name}</Text>
              </View>
            );
          }

          // Último item do treino
          if (isLastExercise) {
            if (currentRound < totalRounds) {
              const firstEx = training.exercises[0];
              const firstName = firstEx?.type === 'rest' ? 'Descanso' : firstEx?.name;
              return (
                <View style={styles.nextExerciseContainer}>
                  <Text style={styles.nextExerciseLabel}>PRÓXIMO</Text>
                  <Text style={styles.nextExerciseName}>
                    Round {currentRound + 1} • {firstName}
                  </Text>
                </View>
              );
            }
            return (
              <View style={styles.nextExerciseContainer}>
                <Text style={styles.nextExerciseLabel}>PRÓXIMO</Text>
                <Text style={styles.nextExerciseName}>Fim</Text>
              </View>
            );
          }

          const nextEx = training.exercises[currentExerciseIndex + 1];

          // Exercício (não rest card) na última série → descanso padrão antes do próximo
          if (phase === 'working' && currentExercise.type !== 'rest' && training.defaultRestSeconds && nextEx?.type !== 'rest') {
            const exerciseSets = currentExercise.sets || 1;
            if (currentSet >= exerciseSets) {
              return (
                <View style={styles.nextExerciseContainer}>
                  <Text style={styles.nextExerciseLabel}>PRÓXIMO</Text>
                  <Text style={[styles.nextExerciseName, styles.nextRestCardName]}>Descanso</Text>
                </View>
              );
            }
          }

          // Próximo item da lista
          const isNextRest = nextEx?.type === 'rest';
          return (
            <View style={styles.nextExerciseContainer}>
              <Text style={styles.nextExerciseLabel}>PRÓXIMO</Text>
              <Text style={[styles.nextExerciseName, isNextRest && styles.nextRestCardName]}>
                {isNextRest ? 'Descanso' : nextEx?.name}
              </Text>
            </View>
          );
        })()}

        {/* Control Buttons */}
        <View style={[styles.controlsContainer, { paddingBottom: 20 + insets.bottom }]}>
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
      </TouchableWithoutFeedback>
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
  contentMinimal: {
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  phaseLabel: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  workingLabel: {
    backgroundColor: 'rgba(255, 59, 92, 0.2)',
  },
  restingLabel: {
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
  },
  restCardLabel: {
    backgroundColor: colors.rest,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  restCardLabelText: {
    color: '#FFFFFF',
    fontWeight: '800',
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
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  exerciseNameMinimal: {
    fontSize: 28,
    marginBottom: 40,
  },
  restCardName: {
    color: colors.rest,
  },
  setInfo: {
    alignItems: 'center',
    marginBottom: 16,
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
    justifyContent: 'center',
    marginBottom: 24,
  },
  timerContainerMinimal: {
    marginBottom: 0,
  },
  pausedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pausedText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
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
  nextRestCardName: {
    color: colors.rest,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
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
  // Countdown
  countdownContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  countdownLabel: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
    marginBottom: 20,
  },
  countdownNumber: {
    color: colors.primary,
    fontSize: 120,
    fontWeight: '700',
    lineHeight: 130,
  },
  countdownTrainingName: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: 20,
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
