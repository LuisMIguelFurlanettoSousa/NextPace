import { AudioSource } from 'expo-audio';

export interface SoundOption {
  id: string;
  label: string;
  icon: string;
  source: AudioSource;
}

export const SOUND_OPTIONS: SoundOption[] = [
  {
    id: 'alarm-clock',
    label: 'Alarme',
    icon: 'alarm-outline',
    source: require('../assets/sounds/alarm-clock.ogg'),
  },
  {
    id: 'digital-beep',
    label: 'Beep Digital',
    icon: 'phone-portrait-outline',
    source: require('../assets/sounds/digital-beep.ogg'),
  },
  {
    id: 'bell-ring',
    label: 'Despertador',
    icon: 'alarm-outline',
    source: require('../assets/sounds/bell-ring.ogg'),
  },
  {
    id: 'buzzer',
    label: 'Triângulo',
    icon: 'triangle-outline',
    source: require('../assets/sounds/buzzer.ogg'),
  },
  {
    id: 'gentle-chime',
    label: 'Sino',
    icon: 'notifications-outline',
    source: require('../assets/sounds/gentle-chime.ogg'),
  },
  {
    id: 'fanfare',
    label: 'Fanfarra',
    icon: 'trophy-outline',
    source: require('../assets/sounds/fanfare.wav'),
  },
];

export const DEFAULT_SOUND_ID = 'alarm-clock';

export const getSoundSource = (id?: string): AudioSource => {
  const sound = SOUND_OPTIONS.find((s) => s.id === id);
  if (sound) return sound.source;
  return SOUND_OPTIONS.find((s) => s.id === DEFAULT_SOUND_ID)!.source;
};
