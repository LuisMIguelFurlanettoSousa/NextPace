import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'workout_timer';
const CATEGORY_ID = 'workout_controls';
const NOTIFICATION_ID = 'active_workout';

export interface WorkoutNotificationInfo {
  exerciseName: string;
  setInfo?: string;
  isResting: boolean;
  isPaused: boolean;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: true,
  }),
});

export async function initializeNotifications(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Timer do Treino',
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: [0],
      enableVibrate: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  await updateNotificationCategory(false);
  return true;
}

export async function updateNotificationCategory(isPaused: boolean): Promise<void> {
  await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
    {
      identifier: 'pause_resume',
      buttonTitle: isPaused ? '▶ Retomar' : '⏸ Pausar',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'skip',
      buttonTitle: '⏭ Pular',
      options: { opensAppToForeground: false },
    },
  ]);
}

const formatTime = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Exibe (ou substitui) a única notificação do treino.
 * Usa o mesmo identifier — sempre existe apenas UMA notificação na bandeja.
 */
export async function showWorkoutNotification(
  info: WorkoutNotificationInfo,
  timeLeftSeconds: number,
): Promise<void> {
  const { exerciseName, setInfo, isResting, isPaused } = info;
  const time = formatTime(timeLeftSeconds);

  let title: string;
  let body: string;

  if (isPaused) {
    title = '⏸ Treino Pausado';
    body = `${isResting ? 'Descanso' : exerciseName}  •  ${time} restantes`;
  } else if (isResting) {
    title = `☕ Descanso  —  ${time}`;
    body = setInfo ? `Próximo: ${exerciseName} • ${setInfo}` : `Próximo: ${exerciseName}`;
  } else {
    title = `🏋️ ${exerciseName}  —  ${time}`;
    body = setInfo || 'Treino em andamento';
  }

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title,
      body,
      categoryIdentifier: CATEGORY_ID,
      sticky: true,
      data: { screen: 'ActiveTraining' },
      ...(Platform.OS === 'android' && { color: '#FF2D55' }),
    },
    trigger: null,
  });
}

export async function dismissWorkoutNotification(): Promise<void> {
  await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
}

export function addNotificationActionListener(
  callback: (actionId: string) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const actionId = response.actionIdentifier;
    if (actionId === 'pause_resume' || actionId === 'skip') {
      callback(actionId);
    }
  });
}
