import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { colors } from '../theme/colors';
import { SOUND_OPTIONS, DEFAULT_SOUND_ID } from '../constants/sounds';

interface SoundPickerProps {
  value?: string;
  onChange: (soundId: string) => void;
}

export const SoundPicker: React.FC<SoundPickerProps> = ({ value, onChange }) => {
  const selectedId = value || DEFAULT_SOUND_ID;
  // Player com source fixa — troca via replace() para evitar conflito com o hook
  const player = useAudioPlayer(SOUND_OPTIONS[0].source);
  const stopTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSelect = useCallback((soundId: string) => {
    onChange(soundId);

    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);

    const sound = SOUND_OPTIONS.find((s) => s.id === soundId);
    if (!sound) return;

    try {
      player.replace(sound.source);
      player.volume = 1.0;
      player.seekTo(0);
      player.play();

      stopTimerRef.current = setTimeout(() => {
        try { player.pause(); } catch (_) {}
      }, 2500);
    } catch (_) {}
  }, [player, onChange]);

  return (
    <View style={styles.container}>
      {SOUND_OPTIONS.map((sound) => {
        const isSelected = sound.id === selectedId;
        return (
          <TouchableOpacity
            key={sound.id}
            style={[styles.item, isSelected && styles.itemSelected]}
            onPress={() => handleSelect(sound.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
              <Ionicons
                name={sound.icon as any}
                size={20}
                color={isSelected ? colors.textPrimary : colors.textMuted}
              />
            </View>
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {sound.label}
            </Text>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  itemSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 59, 92, 0.08)',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerSelected: {
    backgroundColor: colors.primary,
  },
  label: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  labelSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
