import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  showWorkoutNotification,
  dismissWorkoutNotification,
  updateNotificationCategory,
  addNotificationActionListener,
  WorkoutNotificationInfo,
} from '../services/workoutNotification';

type WorkoutPhase = 'countdown' | 'working' | 'resting' | 'finished';

interface UseBackgroundTimerParams {
  phase: WorkoutPhase;
  timeLeft: number;
  isPaused: boolean;
  exerciseName: string;
  setInfo?: string;
  isResting: boolean;
  onTimeCorrection: (elapsedSeconds: number) => void;
  onNotificationAction: (actionId: string) => void;
}

export function useBackgroundTimer({
  phase,
  timeLeft,
  isPaused,
  exerciseName,
  setInfo,
  isResting,
  onTimeCorrection,
  onNotificationAction,
}: UseBackgroundTimerParams): void {
  // ─── Refs para valores que mudam rápido ───
  const timeLeftRef = useRef(timeLeft);
  const isPausedRef = useRef(isPaused);
  const phaseRef = useRef(phase);
  const exerciseNameRef = useRef(exerciseName);
  const setInfoRef = useRef(setInfo);
  const isRestingRef = useRef(isResting);
  const onTimeCorrectionRef = useRef(onTimeCorrection);

  timeLeftRef.current = timeLeft;
  isPausedRef.current = isPaused;
  phaseRef.current = phase;
  exerciseNameRef.current = exerciseName;
  setInfoRef.current = setInfo;
  isRestingRef.current = isResting;
  onTimeCorrectionRef.current = onTimeCorrection;

  // ─── Estado interno do background ───
  const backgroundTimestampRef = useRef<number | null>(null);
  const wasPausedRef = useRef(false);
  const isInBackgroundRef = useRef(false);
  const bgIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const bgTimeLeftRef = useRef(0);
  const isBusyRef = useRef(false);

  const getInfo = useCallback((): WorkoutNotificationInfo => ({
    exerciseName: exerciseNameRef.current,
    setInfo: setInfoRef.current,
    isResting: isRestingRef.current,
    isPaused: isPausedRef.current,
  }), []);

  const clearBgInterval = useCallback(() => {
    if (bgIntervalRef.current) {
      clearInterval(bgIntervalRef.current);
      bgIntervalRef.current = null;
    }
  }, []);

  /** Fire-and-forget: atualiza a notificação sem bloquear */
  const fireNotification = useCallback((info: WorkoutNotificationInfo, seconds: number) => {
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    showWorkoutNotification(info, seconds)
      .catch(() => {})
      .finally(() => { isBusyRef.current = false; });
  }, []);

  const startBgCountdown = useCallback((info: WorkoutNotificationInfo, startTime: number) => {
    clearBgInterval();
    bgTimeLeftRef.current = startTime;

    // Primeira atualização imediata
    fireNotification(info, startTime);

    // Atualiza a cada segundo (fire-and-forget com guard de busy)
    bgIntervalRef.current = setInterval(() => {
      bgTimeLeftRef.current -= 1;
      if (bgTimeLeftRef.current <= 0) {
        bgTimeLeftRef.current = 0;
        clearBgInterval();
      }
      fireNotification(info, bgTimeLeftRef.current);
    }, 1000);
  }, [clearBgInterval, fireNotification]);

  // ─── Listener de ações da notificação (botões) ───
  useEffect(() => {
    const subscription = addNotificationActionListener(onNotificationAction);
    return () => subscription.remove();
  }, [onNotificationAction]);

  // ─── Quando isPaused muda em background ───
  useEffect(() => {
    if (!isInBackgroundRef.current) return;

    if (isPaused) {
      clearBgInterval();
      wasPausedRef.current = true;
      updateNotificationCategory(true).catch(() => {});
      fireNotification({ ...getInfo(), isPaused: true }, bgTimeLeftRef.current);
    } else {
      backgroundTimestampRef.current = Date.now();
      wasPausedRef.current = false;
      updateNotificationCategory(false).catch(() => {});
      startBgCountdown({ ...getInfo(), isPaused: false }, bgTimeLeftRef.current);
    }
  }, [isPaused, clearBgInterval, startBgCountdown, getInfo, fireNotification]);

  // ─── AppState handler (dependências estáveis) ───
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const currentPhase = phaseRef.current;
      const isActivePhase = currentPhase === 'working' || currentPhase === 'resting';

      if (nextState === 'active' && isInBackgroundRef.current) {
        // ── Voltando para foreground ──
        isInBackgroundRef.current = false;
        clearBgInterval();

        if (backgroundTimestampRef.current && !wasPausedRef.current) {
          const elapsedMs = Date.now() - backgroundTimestampRef.current;
          const elapsedSeconds = Math.floor(elapsedMs / 1000);
          if (elapsedSeconds > 0) {
            onTimeCorrectionRef.current(elapsedSeconds);
          }
        }

        backgroundTimestampRef.current = null;
        dismissWorkoutNotification().catch(() => {});

      } else if (nextState.match(/inactive|background/) && !isInBackgroundRef.current && isActivePhase) {
        // ── Indo para background ──
        isInBackgroundRef.current = true;
        backgroundTimestampRef.current = Date.now();
        wasPausedRef.current = isPausedRef.current;

        const info = getInfo();
        const currentTimeLeft = timeLeftRef.current;

        // Notificação PRIMEIRO (imediata), categoria depois (fire-and-forget)
        if (isPausedRef.current) {
          fireNotification(info, currentTimeLeft);
        } else {
          startBgCountdown(info, currentTimeLeft);
        }
        updateNotificationCategory(isPausedRef.current).catch(() => {});
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [clearBgInterval, startBgCountdown, getInfo, fireNotification]);

  // ─── Limpa tudo quando treino termina ───
  useEffect(() => {
    if (phase === 'finished') {
      clearBgInterval();
      dismissWorkoutNotification().catch(() => {});
    }
  }, [phase, clearBgInterval]);
}
