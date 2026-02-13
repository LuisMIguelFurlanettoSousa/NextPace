import { setAudioModeAsync } from 'expo-audio';

/**
 * Configura a sessão de áudio para não interromper a música do sistema.
 * Usa `duckOthers` para abaixar temporariamente o volume de outros apps
 * enquanto o alerta toca, restaurando automaticamente depois.
 */
export async function configureAudioSession(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'duckOthers',
    interruptionModeAndroid: 'duckOthers',
  });
}
